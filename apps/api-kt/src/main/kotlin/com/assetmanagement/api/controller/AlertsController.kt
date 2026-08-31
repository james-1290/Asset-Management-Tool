package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AlertHistoryDto
import com.assetmanagement.api.dto.PagedResponse
import com.assetmanagement.api.dto.TestEmailRequest
import com.assetmanagement.api.dto.TestEmailResponse
import com.assetmanagement.api.repository.AlertHistoryRepository
import com.assetmanagement.api.service.AlertProcessingService
import com.assetmanagement.api.service.EmailService
import com.assetmanagement.api.service.SlackService
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/alerts")
@PreAuthorize("hasRole('Admin')")
class AlertsController(
    private val alertProcessingService: AlertProcessingService,
    private val emailService: EmailService,
    private val slackService: SlackService,
    private val alertHistoryRepository: AlertHistoryRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService,
) {
    private val log = LoggerFactory.getLogger(AlertsController::class.java)

    @PostMapping("/send-now")
    fun sendNow(): ResponseEntity<Any> {
        if (!emailService.isConfigured() && !slackService.isConfigured()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Neither email nor Slack is configured. Please configure at least one delivery channel in Alert Settings."))
        }

        // Sending alerts is a write with an outward effect — mail leaving the
        // organisation — so it belongs in the audit log like any other.
        auditService.log(AuditEntry(
            action = "AlertsSent", entityType = "Alert", entityId = "manual",
            entityName = "Manual alert run",
            details = "Ran the alert processor on demand",
            actorId = currentUserService.userId, actorName = currentUserService.userName,
        ))

        val result = alertProcessingService.processAlerts()
        // Also run per-user personal alert rules (best-effort — a failure here
        // shouldn't fail the global run the caller asked for).
        try {
            alertProcessingService.processPersonalAlerts()
        } catch (e: Exception) {
            log.error("Manual personal alert processing failed", e)
        }
        return ResponseEntity.ok(result)
    }

    @PostMapping("/test-email")
    fun testEmail(@RequestBody request: TestEmailRequest): ResponseEntity<TestEmailResponse> {
        // The recipient is caller-supplied, so record who asked and where it went.
        auditService.log(AuditEntry(
            action = "TestEmailSent", entityType = "Alert", entityId = "test-email",
            entityName = request.recipient,
            details = "Sent a test email to \"${request.recipient}\"",
            actorId = currentUserService.userId, actorName = currentUserService.userName,
        ))
        return try {
            emailService.sendTestEmail(request.recipient)
            ResponseEntity.ok(TestEmailResponse(true, "Test email sent to ${request.recipient}"))
        } catch (e: Exception) {
            ResponseEntity.ok(TestEmailResponse(false, "Failed to send test email: ${e.message}"))
        }
    }

    @PostMapping("/test-slack")
    fun testSlack(): ResponseEntity<TestEmailResponse> {
        auditService.log(AuditEntry(
            action = "TestSlackSent", entityType = "Alert", entityId = "test-slack",
            entityName = "Slack webhook",
            details = "Sent a test message to the configured Slack webhook",
            actorId = currentUserService.userId, actorName = currentUserService.userName,
        ))
        return try {
            slackService.sendTestMessage()
            ResponseEntity.ok(TestEmailResponse(true, "Test message sent to Slack"))
        } catch (e: Exception) {
            ResponseEntity.ok(TestEmailResponse(false, "Failed to send Slack message: ${e.message}"))
        }
    }

    @GetMapping("/history")
    fun getHistory(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "20") pageSize: Int
    ): ResponseEntity<PagedResponse<AlertHistoryDto>> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)
        val pageable = PageRequest.of(p - 1, ps, Sort.by(Sort.Direction.DESC, "sentAt"))
        val historyPage = alertHistoryRepository.findAll(pageable)

        val items = historyPage.content.map { h ->
            AlertHistoryDto(
                id = h.id,
                entityType = h.entityType,
                entityId = h.entityId,
                entityName = h.entityName,
                thresholdDays = h.thresholdDays,
                expiryDate = h.expiryDate,
                sentAt = h.sentAt,
                runId = h.runId,
                recipients = h.recipients
            )
        }

        return ResponseEntity.ok(PagedResponse(items, p, ps, historyPage.totalElements))
    }
}
