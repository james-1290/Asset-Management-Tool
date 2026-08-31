package com.assetmanagement.api.service

import com.assetmanagement.api.repository.SystemSettingRepository
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.support.CronTrigger
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit
import java.util.concurrent.ScheduledFuture

@Service
class AlertSchedulerService(
    private val taskScheduler: TaskScheduler,
    private val alertProcessingService: AlertProcessingService,
    private val systemSettingRepository: SystemSettingRepository,
    private val runClaims: ScheduledRunClaimService,
) {
    private val log = LoggerFactory.getLogger(AlertSchedulerService::class.java)

    companion object {
        private const val JOB_NAME = "alerts"
    }
    private var scheduledTask: ScheduledFuture<*>? = null

    private fun getSetting(key: String, default: String = ""): String =
        systemSettingRepository.findByKey(key)?.value ?: default

    @PostConstruct
    fun init() {
        reschedule()
    }

    fun reschedule() {
        scheduledTask?.cancel(false)
        scheduledTask = null

        val scheduleType = getSetting("alerts.schedule.type", "disabled")
        val scheduleTime = getSetting("alerts.schedule.time", "09:00")
        val scheduleDay = getSetting("alerts.schedule.day", "MONDAY")

        if (scheduleType == "disabled") {
            log.info("Alert scheduler disabled")
            return
        }

        val cronExpression = buildCronExpression(scheduleType, scheduleTime, scheduleDay)
        if (cronExpression == null) {
            log.warn("Invalid schedule type: {}, disabling scheduler", scheduleType)
            return
        }

        log.info("Scheduling alerts with cron: {} (type={}, time={}, day={})",
            cronExpression, scheduleType, scheduleTime, scheduleDay)

        scheduledTask = taskScheduler.schedule(
            {
                // Only one instance may run this window. The scheduler runs
                // in-process on every instance, so scaled out, each would fire
                // the same run and every recipient would get duplicate emails.
                val runKey = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MINUTES).toString()
                if (!runClaims.claim(JOB_NAME, runKey)) return@schedule

                try {
                    log.info("Running scheduled alert processing")
                    val result = alertProcessingService.processAlerts()
                    log.info("Scheduled alert run complete: {} alerts sent", result.totalAlertsSent)
                } catch (e: Exception) {
                    log.error("Scheduled alert processing failed", e)
                }
                // Personal (per-user rule) alerts run on the same schedule but in
                // their own try/catch so a failure here can't skip the global run
                // above, or vice versa.
                try {
                    alertProcessingService.processPersonalAlerts()
                } catch (e: Exception) {
                    log.error("Scheduled personal alert processing failed", e)
                }
                try {
                    runClaims.pruneOldClaims()
                } catch (e: Exception) {
                    log.warn("Could not prune old scheduled-run claims", e)
                }
            },
            CronTrigger(cronExpression)
        )
    }

    // Spring CronTrigger uses 6-field format: second minute hour day-of-month month day-of-week
    private fun buildCronExpression(type: String, time: String, day: String): String? {
        val parts = time.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 9
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0

        return when (type) {
            "daily" -> "0 $minute $hour * * *"
            "weekly" -> {
                val dayName = dayOfWeekToCron(day)
                "0 $minute $hour * * $dayName"
            }
            "every_other_week" -> {
                // Spring cron doesn't natively support biweekly, use weekly as closest
                val dayName = dayOfWeekToCron(day)
                "0 $minute $hour * * $dayName"
            }
            "first_day_of_month" -> "0 $minute $hour 1 * *"
            "first_business_day" -> {
                // Approximate: run on 1st-3rd weekdays and let the job handle dedup
                "0 $minute $hour 1-3 * MON-FRI"
            }
            else -> null
        }
    }

    private fun dayOfWeekToCron(day: String): String = when (day.uppercase()) {
        "MONDAY" -> "MON"
        "TUESDAY" -> "TUE"
        "WEDNESDAY" -> "WED"
        "THURSDAY" -> "THU"
        "FRIDAY" -> "FRI"
        "SATURDAY" -> "SAT"
        "SUNDAY" -> "SUN"
        else -> "MON"
    }
}
