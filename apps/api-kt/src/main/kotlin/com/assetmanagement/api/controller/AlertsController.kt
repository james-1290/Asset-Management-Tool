package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AlertHistoryDto
import com.assetmanagement.api.dto.PagedResponse
import com.assetmanagement.api.dto.TestEmailRequest
import com.assetmanagement.api.dto.TestEmailResponse
import com.assetmanagement.api.repository.AlertHistoryRepository
import com.assetmanagement.api.service.AlertProcessingService
import com.assetmanagement.api.service.EmailService
import com.assetmanagement.api.service.SlackService
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
    private val alertHistoryRepository: AlertHistoryRepository
) {

    @PostMapping("/send-now")
    fun sendNow(): ResponseEntity<Any> {
        if (!emailService.isConfigured() && !slackService.isConfigured()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Neither email nor Slack is configured. Please configure at least one delivery channel in Alert Settings."))
        }

        val result = alertProcessingService.processAlerts()
        return ResponseEntity.ok(result)
    }

    @PostMapping("/test-email")
    fun testEmail(@RequestBody request: TestEmailRequest): ResponseEntity<TestEmailResponse> {
        return try {
            emailService.sendTestEmail(request.recipient)
            ResponseEntity.ok(TestEmailResponse(true, "Test email sent to ${request.recipient}"))
        } catch (e: Exception) {
            ResponseEntity.ok(TestEmailResponse(false, "Failed to send test email: ${e.message}"))
        }
    }

    @PostMapping("/test-slack")
    fun testSlack(): ResponseEntity<TestEmailResponse> {
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
        val historyPage = alertHistoryRepository.findAllByOrderBySentAtDesc(pageable)

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
