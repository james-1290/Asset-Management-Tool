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
    val emailProvider: String = "smtp",
    val smtpHost: String,
    val smtpPort: Int,
    val smtpUsername: String,
    val smtpPassword: String,
    val smtpFromAddress: String,
    val graphTenantId: String = "",
    val graphClientId: String = "",
    val graphClientSecret: String = "",
    val graphFromAddress: String = "",
    val slackWebhookUrl: String,
    val slackWarrantyWebhookUrl: String = "",
    val slackCertificateWebhookUrl: String = "",
    val slackLicenceWebhookUrl: String = "",
    val recipients: String,
    val scheduleType: String = "disabled",
    val scheduleTime: String = "09:00",
    val scheduleDay: String = "MONDAY"
)
