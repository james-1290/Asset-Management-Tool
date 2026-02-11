package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AlertHistoryDto
import com.assetmanagement.api.dto.TestEmailRequest
import com.assetmanagement.api.dto.TestEmailResponse
import com.assetmanagement.api.repository.AlertHistoryRepository
import com.assetmanagement.api.service.AlertProcessingService
import com.assetmanagement.api.service.EmailService
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/alerts")
class AlertsController(
    private val alertProcessingService: AlertProcessingService,
    private val emailService: EmailService,
    private val alertHistoryRepository: AlertHistoryRepository
) {

    private fun isAdmin(): Boolean =
        SecurityContextHolder.getContext().authentication?.authorities?.any { it.authority == "ROLE_Admin" } == true

    @PostMapping("/send-now")
    fun sendNow(): ResponseEntity<Any> {
        if (!isAdmin()) return ResponseEntity.status(403).build()

        if (!emailService.isConfigured()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Email is not configured. Please set SMTP host, from address, and recipients in Alert Settings."))
        }

        val result = alertProcessingService.processAlerts()
        return ResponseEntity.ok(result)
    }

    @PostMapping("/test-email")
    fun testEmail(@RequestBody request: TestEmailRequest): ResponseEntity<TestEmailResponse> {
        if (!isAdmin()) return ResponseEntity.status(403).build()

        return try {
            emailService.sendTestEmail(request.recipient)
            ResponseEntity.ok(TestEmailResponse(true, "Test email sent to ${request.recipient}"))
        } catch (e: Exception) {
            ResponseEntity.ok(TestEmailResponse(false, "Failed to send test email: ${e.message}"))
        }
    }

    @GetMapping("/history")
    fun getHistory(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Any> {
        if (!isAdmin()) return ResponseEntity.status(403).build()

        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sentAt"))
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

        return ResponseEntity.ok(mapOf(
            "items" to items,
            "page" to historyPage.number,
            "size" to historyPage.size,
            "totalElements" to historyPage.totalElements,
            "totalPages" to historyPage.totalPages
        ))
    }
}
