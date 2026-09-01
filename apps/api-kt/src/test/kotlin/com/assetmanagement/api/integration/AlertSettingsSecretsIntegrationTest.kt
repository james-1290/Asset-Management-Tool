package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * The alert settings hold an SMTP password, a Graph client secret and Slack
 * webhook URLs. `GET` masks them deliberately — but the `PUT` handler used to
 * return the request object it had just been handed, which echoed the plaintext
 * password and the full webhook URL straight back out in the response body.
 * Both paths now return the same masked view.
 */
class AlertSettingsSecretsIntegrationTest : AbstractIntegrationTest() {

    @Test
    fun `neither reading nor writing the settings returns a secret in the clear`() {
        val session = loginAsAdmin()
        val password = "PlaintextSecret-${System.nanoTime()}"
        val webhookPath = "SECRETPATH${System.nanoTime()}"

        val body = """
            {"warrantyEnabled":true,"certificateEnabled":true,"licenceEnabled":true,
             "thresholds":"7,30","emailProvider":"smtp","smtpHost":"smtp.example.com",
             "smtpPort":587,"smtpUsername":"mailer","smtpPassword":"$password",
             "smtpFromAddress":"alerts@example.com","graphTenantId":"","graphClientId":"",
             "graphClientSecret":"","graphFromAddress":"",
             "slackWebhookUrl":"https://hooks.slack.com/services/T0/B0/$webhookPath",
             "slackWarrantyWebhookUrl":"","slackCertificateWebhookUrl":"","slackLicenceWebhookUrl":"",
             "recipients":"ops@example.com","scheduleType":"disabled","scheduleTime":"09:00",
             "scheduleDay":"MONDAY"}
        """.trimIndent()

        val write = putJson("/api/v1/settings/alerts", body, session)
        assertEquals(HttpStatus.OK, write.statusCode, "settings should save: ${write.body}")
        assertFalse(
            write.body!!.contains(password),
            "the write response must not echo the password back: ${write.body}",
        )
        assertFalse(
            write.body!!.contains(webhookPath),
            "the write response must not echo the webhook's secret path: ${write.body}",
        )

        val read = getAs("/api/v1/settings/alerts", session)
        assertEquals(HttpStatus.OK, read.statusCode)
        assertFalse(read.body!!.contains(password), "the read response must not expose the password")
        assertFalse(read.body!!.contains(webhookPath), "the read response must not expose the webhook path")
    }
}
