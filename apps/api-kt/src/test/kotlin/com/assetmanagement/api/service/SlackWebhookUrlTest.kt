package com.assetmanagement.api.service

import com.assetmanagement.api.model.SystemSetting
import com.assetmanagement.api.repository.SystemSettingRepository
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.doReturn

/**
 * The Slack webhook URL is administrator-supplied, so it is an SSRF vector: the
 * host allow-list and the HTTPS requirement are what stop it being pointed at an
 * internal address or a cloud metadata endpoint.
 *
 * That logic had no test — it was checked by reading it. These cases pin the
 * rejections, all of which happen before any network call is made.
 */
class SlackWebhookUrlTest {

    private fun serviceWithWebhook(url: String): SlackService {
        val repo = mock(SystemSettingRepository::class.java)
        doReturn(SystemSetting(key = "alerts.slack.webhookUrl", value = url))
            .`when`(repo).findByKey("alerts.slack.webhookUrl")
        return SlackService(repo)
    }

    private fun assertRejected(url: String, why: String) {
        val error = assertThrows(IllegalArgumentException::class.java, {
            serviceWithWebhook(url).sendTestMessage()
        }, "should have been rejected — $why: $url")
        assertTrue(
            error.message!!.contains("Slack domain") || error.message!!.contains("HTTPS") ||
                error.message!!.contains("Invalid webhook URL"),
            "unexpected rejection reason for $url: ${error.message}",
        )
    }

    @Test
    fun `a host that merely ends with the allowed name is rejected`() {
        // The classic allow-list bypass: endsWith("slack.com") would admit these.
        assertRejected("https://evilslack.com/services/T0/B0/x", "look-alike host")
        assertRejected("https://nothooks.slack.com.attacker.test/x", "suffix trick")
        assertRejected("https://hooks.slack.com.attacker.test/x", "domain suffixed")
    }

    @Test
    fun `internal and metadata addresses are rejected`() {
        assertRejected("https://169.254.169.254/latest/meta-data/", "cloud metadata")
        assertRejected("https://localhost:5115/api/v1/assets", "loopback")
        assertRejected("https://10.0.0.5/internal", "private range")
    }

    @Test
    fun `plain HTTP is rejected even on the right host`() {
        assertRejected("http://hooks.slack.com/services/T0/B0/x", "not HTTPS")
    }

    @Test
    fun `a malformed URL is rejected rather than crashing`() {
        assertRejected("not a url at all", "malformed")
    }

    @Test
    fun `an unconfigured webhook is reported as unconfigured, not attempted`() {
        val error = assertThrows(IllegalStateException::class.java) {
            serviceWithWebhook("").sendTestMessage()
        }
        assertTrue(error.message!!.contains("not configured"), "got: ${error.message}")
    }
}
