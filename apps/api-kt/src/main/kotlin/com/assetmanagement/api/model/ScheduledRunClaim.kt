package com.assetmanagement.api.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * One row per scheduled run, claimed by the instance that will perform it.
 *
 * The unique key on (job_name, run_key) is what makes the claim work: two
 * instances racing to insert the same key means exactly one succeeds.
 */
@Entity
@Table(name = "scheduled_run_claims")
class ScheduledRunClaim(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "job_name", nullable = false, columnDefinition = "VARCHAR(100)")
    var jobName: String = "",

    /** Identifies the window, e.g. the scheduled minute. */
    @Column(name = "run_key", nullable = false, columnDefinition = "VARCHAR(40)")
    var runKey: String = "",

    @Column(name = "claimed_at", nullable = false)
    var claimedAt: Instant = Instant.now(),

    /** Which instance took it, for diagnosing a scaled-out deployment. */
    @Column(name = "claimed_by", columnDefinition = "VARCHAR(100)")
    var claimedBy: String? = null,
)
