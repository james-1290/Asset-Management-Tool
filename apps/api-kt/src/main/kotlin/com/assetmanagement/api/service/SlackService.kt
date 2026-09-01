package com.assetmanagement.api.service

import com.assetmanagement.api.repository.SystemSettingRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestTemplate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@Service
class SlackService(
    private val systemSettingRepository: SystemSettingRepository
) {
    private val log = LoggerFactory.getLogger(SlackService::class.java)
    // Bounded timeouts so a dead/slow webhook host can't hang the alert-scheduler
    // thread (and hold the @Transactional alert run open) indefinitely.
    private val restTemplate = RestTemplate(
        object : SimpleClientHttpRequestFactory() {
            override fun prepareConnection(connection: java.net.HttpURLConnection, httpMethod: String) {
                super.prepareConnection(connection, httpMethod)
                // Do not follow redirects. The host allow-list in postToSlack is
                // checked against the configured URL; a 3xx from that host would
                // otherwise be followed to wherever it pointed — an internal
                // address included — which is the usual way such a list is
                // defeated. A Slack incoming webhook never legitimately
                // redirects.
                connection.instanceFollowRedirects = false
            }
        }.apply {
            setConnectTimeout(5_000)
            setReadTimeout(10_000)
        }
    )
    // UTC, like every other date in the app: the server's local zone would
    // render an expiry a day out from what the screen shows.
    private val dateFormatter =
        DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneOffset.UTC)

    private fun getWebhookUrl(): String =
        systemSettingRepository.findByKey("alerts.slack.webhookUrl")?.value ?: ""

    fun isConfigured(): Boolean = getWebhookUrl().isNotBlank()

    fun sendTestMessage() {
        val webhookUrl = getWebhookUrl()
        check(webhookUrl.isNotBlank()) { "Slack webhook URL is not configured" }

        val payload = """
            {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": ":white_check_mark: *Asset Management — Test Message*\nIf you can see this, your Slack webhook is working correctly."
                        }
                    }
                ]
            }
        """.trimIndent()

        postToSlack(webhookUrl, payload)
        log.info("Slack test message sent successfully")
    }

    fun sendDigestMessage(
        orgName: String,
        warrantyItems: List<ExpiringItem>,
        certificateItems: List<ExpiringItem>,
        licenceItems: List<ExpiringItem>,
        warrantyWebhookUrl: String = "",
        certificateWebhookUrl: String = "",
        licenceWebhookUrl: String = ""
    ) {
        val globalWebhookUrl = getWebhookUrl()

        // Send per-type items to dedicated webhooks if configured
        val remainingWarranty = if (warrantyWebhookUrl.isNotBlank() && warrantyItems.isNotEmpty()) {
            sendToWebhook(warrantyWebhookUrl, orgName, "Warranty Expiries", warrantyItems)
            emptyList()
        } else warrantyItems

        val remainingCertificate = if (certificateWebhookUrl.isNotBlank() && certificateItems.isNotEmpty()) {
            sendToWebhook(certificateWebhookUrl, orgName, "Certificate Expiries", certificateItems)
            emptyList()
        } else certificateItems

        val remainingLicence = if (licenceWebhookUrl.isNotBlank() && licenceItems.isNotEmpty()) {
            sendToWebhook(licenceWebhookUrl, orgName, "Licence Expiries", licenceItems)
            emptyList()
        } else licenceItems

        // Send remaining items to global webhook
        val totalRemaining = remainingWarranty.size + remainingCertificate.size + remainingLicence.size
        if (totalRemaining > 0) {
            check(globalWebhookUrl.isNotBlank()) { "Slack webhook URL is not configured" }

            val blocks = mutableListOf<String>()

            // Header
            blocks.add("""
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "${escapeJson(orgName)} — Expiry Alerts ($totalRemaining items)",
                        "emoji": true
                    }
                }
            """.trimIndent())

            if (remainingWarranty.isNotEmpty()) {
                blocks.add(buildSection("Warranty Expiries", remainingWarranty))
            }
            if (remainingCertificate.isNotEmpty()) {
                blocks.add(buildSection("Certificate Expiries", remainingCertificate))
            }
            if (remainingLicence.isNotEmpty()) {
                blocks.add(buildSection("Licence Expiries", remainingLicence))
            }

            // Footer
            blocks.add("""
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "Sent by ${escapeJson(orgName)} alert system. Configure in Settings > Alerts."
                        }
                    ]
                }
            """.trimIndent())

            val payload = """{"blocks": [${blocks.joinToString(",")}]}"""
            postToSlack(globalWebhookUrl, payload)
        }

        val totalCount = warrantyItems.size + certificateItems.size + licenceItems.size
        log.info("Slack digest message sent successfully ({} items)", totalCount)
    }

    private fun sendToWebhook(webhookUrl: String, orgName: String, title: String, items: List<ExpiringItem>) {
        val blocks = mutableListOf<String>()

        blocks.add("""
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "${escapeJson(orgName)} — $title (${items.size} items)",
                    "emoji": true
                }
            }
        """.trimIndent())

        blocks.add(buildSection(title, items))

        blocks.add("""
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Sent by ${escapeJson(orgName)} alert system. Configure in Settings > Alerts."
                    }
                ]
            }
        """.trimIndent())

        val payload = """{"blocks": [${blocks.joinToString(",")}]}"""
        postToSlack(webhookUrl, payload)
        log.info("Slack per-type message sent to dedicated webhook for {} ({} items)", title, items.size)
    }

    private fun buildSection(title: String, items: List<ExpiringItem>): String {
        val lines = items.sortedBy { it.daysUntilExpiry }.joinToString("\\n") { item ->
            val emoji = when {
                item.daysUntilExpiry <= 7 -> ":red_circle:"
                item.daysUntilExpiry <= 14 -> ":large_orange_circle:"
                item.daysUntilExpiry <= 30 -> ":large_yellow_circle:"
                else -> ":large_green_circle:"
            }
            "$emoji *${escapeJson(item.entityName)}* — ${dateFormatter.format(item.expiryDate)} (${item.daysUntilExpiry} days)"
        }

        return """
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*${escapeJson(title)} (${items.size})*\n$lines"
                }
            }
        """.trimIndent()
    }

    private fun postToSlack(webhookUrl: String, payload: String) {
        // Validate webhook URL to prevent SSRF — only allow Slack domains
        val url = try {
            java.net.URI(webhookUrl)
        } catch (e: java.net.URISyntaxException) {
            throw IllegalArgumentException("Invalid webhook URL", e)
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid webhook URL", e)
        }
        // Exact host match (a suffix check like endsWith("slack.com") would allow
        // evilslack.com / notslack.com). Slack incoming webhooks are always hooks.slack.com.
        val host = url.host?.lowercase()
        require(host == "hooks.slack.com" || host?.endsWith(".slack.com") == true) {
            "Webhook URL must be a Slack domain (hooks.slack.com)"
        }
        require("https".equals(url.scheme, ignoreCase = true)) { "Webhook URL must use HTTPS" }

        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val entity = HttpEntity(payload, headers)

        val response = restTemplate.postForEntity(webhookUrl, entity, String::class.java)
        if (!response.statusCode.is2xxSuccessful) {
            error("Slack webhook returned ${response.statusCode}: ${response.body}")
        }
    }

    private fun escapeJson(text: String): String =
        text.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
}
