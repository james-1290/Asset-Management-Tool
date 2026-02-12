package com.assetmanagement.api.service

import com.assetmanagement.api.dto.AlertRunResult
import com.assetmanagement.api.model.AlertHistory
import com.assetmanagement.api.model.Application
import com.assetmanagement.api.model.Asset
import com.assetmanagement.api.model.Certificate
import com.assetmanagement.api.repository.*
import org.slf4j.LoggerFactory
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.*

data class ExpiringItem(
    val entityType: String,
    val entityId: UUID,
    val entityName: String,
    val expiryDate: Instant,
    val thresholdDays: Int,
    val daysUntilExpiry: Long
)

@Service
class AlertProcessingService(
    private val assetRepository: AssetRepository,
    private val certificateRepository: CertificateRepository,
    private val applicationRepository: ApplicationRepository,
    private val alertHistoryRepository: AlertHistoryRepository,
    private val systemSettingRepository: SystemSettingRepository,
    private val emailService: EmailService,
    private val slackService: SlackService
) {
    private val log = LoggerFactory.getLogger(AlertProcessingService::class.java)
    private val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneId.systemDefault())

    private fun getSetting(key: String, default: String = ""): String =
        systemSettingRepository.findByKey(key)?.value ?: default

    fun processAlerts(): AlertRunResult {
        val runId = UUID.randomUUID()
        val now = Instant.now()

        if (!emailService.isConfigured() && !slackService.isConfigured()) {
            log.warn("Neither email nor Slack configured, skipping alert processing")
            return AlertRunResult(runId, 0, 0, 0, 0, emptyList(), now)
        }

        val recipients = emailService.getRecipients()
        if (recipients.isEmpty() && !slackService.isConfigured()) {
            log.warn("No email recipients and no Slack configured, skipping alert processing")
            return AlertRunResult(runId, 0, 0, 0, 0, emptyList(), now)
        }

        val thresholds = getSetting("alerts.thresholds", "90,30,14,7")
            .split(",").mapNotNull { it.trim().toIntOrNull() }.sorted()

        val warrantyEnabled = getSetting("alerts.warranty.enabled", "true") == "true"
        val certificateEnabled = getSetting("alerts.certificate.enabled", "true") == "true"
        val licenceEnabled = getSetting("alerts.licence.enabled", "true") == "true"

        val allItems = mutableListOf<ExpiringItem>()

        for (threshold in thresholds) {
            val cutoff = now.plus(threshold.toLong(), ChronoUnit.DAYS)

            if (warrantyEnabled) {
                val spec = Specification<Asset> { root, _, cb ->
                    cb.and(
                        cb.equal(root.get<Boolean>("isArchived"), false),
                        cb.isNotNull(root.get<Instant>("warrantyExpiryDate")),
                        cb.greaterThanOrEqualTo(root.get("warrantyExpiryDate"), now),
                        cb.lessThanOrEqualTo(root.get("warrantyExpiryDate"), cutoff)
                    )
                }
                assetRepository.findAll(spec).forEach { asset ->
                    if (!alertHistoryRepository.existsByEntityTypeAndEntityIdAndThresholdDays("warranty", asset.id, threshold)) {
                        val daysUntil = ChronoUnit.DAYS.between(now, asset.warrantyExpiryDate!!)
                        allItems.add(ExpiringItem("warranty", asset.id, asset.name, asset.warrantyExpiryDate!!, threshold, daysUntil))
                    }
                }
            }

            if (certificateEnabled) {
                val spec = Specification<Certificate> { root, _, cb ->
                    cb.and(
                        cb.equal(root.get<Boolean>("isArchived"), false),
                        cb.isNotNull(root.get<Instant>("expiryDate")),
                        cb.greaterThanOrEqualTo(root.get("expiryDate"), now),
                        cb.lessThanOrEqualTo(root.get("expiryDate"), cutoff)
                    )
                }
                certificateRepository.findAll(spec).forEach { cert ->
                    if (!alertHistoryRepository.existsByEntityTypeAndEntityIdAndThresholdDays("certificate", cert.id, threshold)) {
                        val daysUntil = ChronoUnit.DAYS.between(now, cert.expiryDate!!)
                        allItems.add(ExpiringItem("certificate", cert.id, cert.name, cert.expiryDate!!, threshold, daysUntil))
                    }
                }
            }

            if (licenceEnabled) {
                val spec = Specification<Application> { root, _, cb ->
                    cb.and(
                        cb.equal(root.get<Boolean>("isArchived"), false),
                        cb.isNotNull(root.get<Instant>("expiryDate")),
                        cb.greaterThanOrEqualTo(root.get("expiryDate"), now),
                        cb.lessThanOrEqualTo(root.get("expiryDate"), cutoff)
                    )
                }
                applicationRepository.findAll(spec).forEach { app ->
                    if (!alertHistoryRepository.existsByEntityTypeAndEntityIdAndThresholdDays("licence", app.id, threshold)) {
                        val daysUntil = ChronoUnit.DAYS.between(now, app.expiryDate!!)
                        allItems.add(ExpiringItem("licence", app.id, app.name, app.expiryDate!!, threshold, daysUntil))
                    }
                }
            }
        }

        if (allItems.isEmpty()) {
            log.info("No new expiry alerts to send")
            return AlertRunResult(runId, 0, 0, 0, 0, recipients, now)
        }

        val warrantyItems = allItems.filter { it.entityType == "warranty" }
        val certificateItems = allItems.filter { it.entityType == "certificate" }
        val licenceItems = allItems.filter { it.entityType == "licence" }

        val orgName = getSetting("org.name", "Asset Management")
        val subject = "$orgName - Expiry Alert: ${allItems.size} item(s) expiring soon"
        val htmlBody = buildDigestHtml(orgName, warrantyItems, certificateItems, licenceItems)

        try {
            if (emailService.isConfigured() && recipients.isNotEmpty()) {
                emailService.sendDigestEmail(recipients, subject, htmlBody)
            }

            if (slackService.isConfigured()) {
                try {
                    slackService.sendDigestMessage(orgName, warrantyItems, certificateItems, licenceItems)
                } catch (e: Exception) {
                    log.error("Failed to send Slack digest (email may have succeeded)", e)
                }
            }

            val recipientsStr = recipients.joinToString(",")
            allItems.forEach { item ->
                alertHistoryRepository.save(AlertHistory(
                    entityType = item.entityType,
                    entityId = item.entityId,
                    entityName = item.entityName,
                    thresholdDays = item.thresholdDays,
                    expiryDate = item.expiryDate,
                    sentAt = now,
                    runId = runId,
                    recipients = recipientsStr
                ))
            }

            log.info("Alert run {} complete: {} alerts sent to {} recipients",
                runId, allItems.size, recipients.size)
        } catch (e: Exception) {
            log.error("Failed to send alerts", e)
            throw e
        }

        return AlertRunResult(
            runId = runId,
            totalAlertsSent = allItems.size,
            warrantyAlerts = warrantyItems.size,
            certificateAlerts = certificateItems.size,
            licenceAlerts = licenceItems.size,
            recipients = recipients,
            timestamp = now
        )
    }

    private fun buildDigestHtml(
        orgName: String,
        warrantyItems: List<ExpiringItem>,
        certificateItems: List<ExpiringItem>,
        licenceItems: List<ExpiringItem>
    ): String {
        val sb = StringBuilder()
        sb.append("""
            <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
                $orgName — Expiry Alerts
            </h1>
        """.trimIndent())

        if (warrantyItems.isNotEmpty()) {
            sb.append(buildSectionHtml("Warranty Expiries", warrantyItems))
        }
        if (certificateItems.isNotEmpty()) {
            sb.append(buildSectionHtml("Certificate Expiries", certificateItems))
        }
        if (licenceItems.isNotEmpty()) {
            sb.append(buildSectionHtml("Licence Expiries", licenceItems))
        }

        sb.append("""
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 24px;">
            <p style="color: #6b7280; font-size: 12px;">
                This is an automated alert from $orgName.
                You can configure alert settings in Settings &gt; Alerts.
            </p>
            </body>
            </html>
        """.trimIndent())

        return sb.toString()
    }

    private fun buildSectionHtml(title: String, items: List<ExpiringItem>): String {
        val sb = StringBuilder()
        sb.append("""
            <h2 style="color: #374151; margin-top: 24px;">$title (${items.size})</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
                <tr style="background: #f9fafb;">
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb;">Name</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb;">Expiry Date</th>
                    <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #e5e7eb;">Days Remaining</th>
                </tr>
            </thead>
            <tbody>
        """.trimIndent())

        items.sortedBy { it.daysUntilExpiry }.forEach { item ->
            val urgencyColor = when {
                item.daysUntilExpiry <= 7 -> "#dc2626"
                item.daysUntilExpiry <= 14 -> "#ea580c"
                item.daysUntilExpiry <= 30 -> "#d97706"
                else -> "#16a34a"
            }
            sb.append("""
                <tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${item.entityName}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${dateFormatter.format(item.expiryDate)}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
                        <span style="color: $urgencyColor; font-weight: 600;">${item.daysUntilExpiry} days</span>
                    </td>
                </tr>
            """.trimIndent())
        }

        sb.append("</tbody></table>")
        return sb.toString()
    }
}
