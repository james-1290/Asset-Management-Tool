package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class AlertRunResult(
    val runId: UUID,
    val totalAlertsSent: Int,
    val warrantyAlerts: Int,
    val certificateAlerts: Int,
    val licenceAlerts: Int,
    val recipients: List<String>,
    val timestamp: Instant
)

data class TestEmailRequest(
    val recipient: String
)

data class TestEmailResponse(
    val success: Boolean,
    val message: String
)

data class AlertHistoryDto(
    val id: UUID,
    val entityType: String,
    val entityId: UUID,
    val entityName: String,
    val thresholdDays: Int,
    val expiryDate: Instant,
    val sentAt: Instant,
    val runId: UUID,
    val recipients: String
)
