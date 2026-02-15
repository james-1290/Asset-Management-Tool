package com.assetmanagement.api.service

import com.assetmanagement.api.repository.UserNotificationRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class NotificationCleanupService(
    private val userNotificationRepository: UserNotificationRepository
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 0 3 * * *")  // Daily at 3 AM
    fun cleanupOldNotifications() {
        val cutoff = Instant.now().minus(90, ChronoUnit.DAYS)
        val count = userNotificationRepository.deleteByCreatedAtBefore(cutoff)
        if (count > 0) {
            logger.info("Cleaned up $count notifications older than 90 days")
        }
    }
}
