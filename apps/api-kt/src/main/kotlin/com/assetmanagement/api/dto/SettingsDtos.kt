package com.assetmanagement.api.dto

data class SystemSettingsDto(
    val orgName: String,
    val currency: String,
    val dateFormat: String,
    val defaultPageSize: Int
)

data class AlertSettingsDto(
    val warrantyEnabled: Boolean,
    val certificateEnabled: Boolean,
    val licenceEnabled: Boolean,
    val thresholds: String,
    val smtpHost: String,
    val smtpPort: Int,
    val smtpUsername: String,
    val smtpPassword: String,
    val smtpFromAddress: String,
    val slackWebhookUrl: String,
    val recipients: String
)
