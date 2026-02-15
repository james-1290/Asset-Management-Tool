package com.assetmanagement.api.service

import com.assetmanagement.api.repository.SystemSettingRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Service
class SlackService(
    private val systemSettingRepository: SystemSettingRepository
) {
    private val log = LoggerFactory.getLogger(SlackService::class.java)
    private val restTemplate = RestTemplate()
    private val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.systemDefault())

    private fun getWebhookUrl(): String =
        systemSettingRepository.findByKey("alerts.slack.webhookUrl")?.value ?: ""

    fun isConfigured(): Boolean = getWebhookUrl().isNotBlank()

    fun sendTestMessage() {
        val webhookUrl = getWebhookUrl()
        if (webhookUrl.isBlank()) {
            throw IllegalStateException("Slack webhook URL is not configured")
        }

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
            if (globalWebhookUrl.isBlank()) {
                throw IllegalStateException("Slack webhook URL is not configured")
            }

            val blocks = mutableListOf<String>()

            // Header
            blocks.add("""
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "$orgName — Expiry Alerts ($totalRemaining items)",
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
                            "text": "Sent by $orgName alert system. Configure in Settings > Alerts."
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
                    "text": "$orgName — $title (${items.size} items)",
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
                        "text": "Sent by $orgName alert system. Configure in Settings > Alerts."
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
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val entity = HttpEntity(payload, headers)

        val response = restTemplate.postForEntity(webhookUrl, entity, String::class.java)
        if (!response.statusCode.is2xxSuccessful) {
            throw RuntimeException("Slack webhook returned ${response.statusCode}: ${response.body}")
        }
    }

    private fun escapeJson(text: String): String =
        text.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
}
