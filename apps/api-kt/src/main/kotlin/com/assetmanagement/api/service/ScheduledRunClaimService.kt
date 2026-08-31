package com.assetmanagement.api.service

import com.assetmanagement.api.model.ScheduledRunClaim
import com.assetmanagement.api.repository.ScheduledRunClaimRepository
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import java.time.Instant
import java.time.temporal.ChronoUnit

/**
 * Lets exactly one instance run a scheduled job.
 *
 * The scheduler runs in-process on every instance. On one instance that is
 * fine; scaled to two or more — which Azure App Service does on demand — each
 * would fire the same run at the same moment and every recipient would get
 * duplicate alert emails.
 *
 * Claiming is a single insert against a unique key: whichever instance inserts
 * first runs, and the others see the constraint violation and stand down. That
 * needs no new dependency and no lock held across the work itself, so an
 * instance dying mid-run cannot block the next window.
 */
@Service
class ScheduledRunClaimService(
    private val repository: ScheduledRunClaimRepository,
    transactionManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(ScheduledRunClaimService::class.java)

    /**
     * The insert runs in a transaction of its own, and the losing one is allowed
     * to roll back on its own terms.
     *
     * The exception has to be caught *outside* that transaction: caught inside,
     * the transaction is already marked rollback-only, and returning normally
     * then fails the commit with UnexpectedRollbackException — so every
     * instance would think it had lost.
     */
    private val newTransaction = TransactionTemplate(transactionManager).apply {
        propagationBehavior = TransactionDefinition.PROPAGATION_REQUIRES_NEW
    }

    companion object {
        /** Claims older than this are pruned; long enough to be well clear of any run. */
        private const val RETENTION_DAYS = 7L
    }

    /**
     * True if this instance won the claim for [runKey] and should do the work.
     *
     * [runKey] identifies the window — the scheduled minute, say — so two
     * instances firing the same cron tick compete for the same key while the
     * next tick is free.
     *
     * Runs in its own transaction: the losing insert fails, and without this the
     * caller's transaction would be left marked rollback-only.
     */
    fun claim(jobName: String, runKey: String): Boolean =
        try {
            newTransaction.execute {
                // saveAndFlush, not save: JPA defers the insert to commit, and
                // the violation has to surface here rather than later.
                repository.saveAndFlush(
                    ScheduledRunClaim(
                        jobName = jobName,
                        runKey = runKey,
                        claimedAt = Instant.now(),
                        claimedBy = System.getenv("WEBSITE_INSTANCE_ID") ?: "local",
                    )
                )
            }
            true
        } catch (_: DataIntegrityViolationException) {
            log.info("Another instance already claimed {} for {}; standing down", jobName, runKey)
            false
        }

    /** Drops claims old enough that no run could still be referring to them. */
    @Transactional
    fun pruneOldClaims() {
        val cutoff = Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS)
        val removed = repository.deleteByClaimedAtBefore(cutoff)
        if (removed > 0) log.debug("Pruned {} old scheduled-run claims", removed)
    }
}
