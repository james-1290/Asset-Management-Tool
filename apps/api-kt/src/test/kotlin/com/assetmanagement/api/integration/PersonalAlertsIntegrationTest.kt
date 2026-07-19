package com.assetmanagement.api.integration

import com.assetmanagement.api.repository.UserNotificationRepository
import com.assetmanagement.api.service.AlertProcessingService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import java.time.LocalDate
import java.util.UUID

/**
 * Regression guard for the personal-alert-rule wiring: users can create per-user
 * alert rules (UserAlertRulesController + the "My Alerts" settings tab), but
 * `processPersonalAlerts()` was never invoked by the scheduler or the manual
 * trigger, so those rules silently never fired. This asserts a matching rule now
 * produces a personal notification for its owner.
 */
class PersonalAlertsIntegrationTest : AbstractIntegrationTest() {

    @Autowired
    private lateinit var alertProcessingService: AlertProcessingService

    @Autowired
    private lateinit var userNotificationRepository: UserNotificationRepository

    private fun idOf(body: String) =
        Regex("\"id\"\\s*:\\s*\"([0-9a-fA-F-]{36})\"").find(body)!!.groupValues[1]

    @Test
    fun `an active personal rule creates a personal notification for its owner`() {
        val token = loginAsAdmin()
        val ownerId = UUID.fromString(idOf(getWithToken("/api/v1/auth/me", token).body!!))

        // A certificate expiring inside the rule's threshold window.
        val typeId = idOf(
            postJson("/api/v1/certificate-types", """{"name":"Cert Type ${System.nanoTime()}"}""", token).body!!,
        )
        val expiry = LocalDate.now().plusDays(10)
        val certId = UUID.fromString(
            idOf(
                postJson(
                    "/api/v1/certificates",
                    """{"name":"Expiring Cert ${System.nanoTime()}","certificateTypeId":"$typeId","status":"Active","issuedDate":"${LocalDate.now()}","expiryDate":"$expiry"}""",
                    token,
                ).body!!,
            ),
        )

        // A personal rule for certificates at a 30-day threshold (covers the cert).
        val rule = postJson(
            "/api/v1/alert-rules",
            """{"name":"my certs","entityTypes":"certificate","thresholds":"30","notifyEmail":false}""",
            token,
        )
        assertEquals(HttpStatus.CREATED, rule.statusCode, "rule create should succeed: ${rule.body}")

        // The wiring under test: before this fix the method was never called.
        alertProcessingService.processPersonalAlerts()

        val notes = userNotificationRepository.findByEntityIdIn(setOf(certId))
        assertTrue(
            notes.any { it.entityId == certId && it.userId == ownerId && it.notificationType == "personal" },
            "expected a personal notification for the expiring certificate; got ${notes.map { it.notificationType to it.userId }}",
        )
    }
}
