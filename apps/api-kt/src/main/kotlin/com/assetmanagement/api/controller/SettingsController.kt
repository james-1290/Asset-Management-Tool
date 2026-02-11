package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AlertSettingsDto
import com.assetmanagement.api.dto.SystemSettingsDto
import com.assetmanagement.api.model.SystemSetting
import com.assetmanagement.api.repository.SystemSettingRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.time.Instant

@RestController
@RequestMapping("/api/v1/settings")
class SettingsController(
    private val systemSettingRepository: SystemSettingRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {

    private fun isAdmin(): Boolean =
        SecurityContextHolder.getContext().authentication?.authorities?.any { it.authority == "ROLE_Admin" } == true

    private fun getSetting(key: String, default_: String = ""): String =
        systemSettingRepository.findByKey(key)?.value ?: default_

    private fun setSetting(key: String, value: String, updatedBy: String) {
        val setting = systemSettingRepository.findByKey(key)
        if (setting != null) {
            setting.value = value
            setting.updatedAt = Instant.now()
            setting.updatedBy = updatedBy
            systemSettingRepository.save(setting)
        } else {
            systemSettingRepository.save(SystemSetting(key = key, value = value, updatedBy = updatedBy))
        }
    }

    @GetMapping("/system")
    fun getSystem(): ResponseEntity<SystemSettingsDto> {
        val dto = SystemSettingsDto(
            orgName = getSetting("org.name", "My Organisation"),
            currency = getSetting("org.currency", "GBP"),
            dateFormat = getSetting("org.dateFormat", "DD/MM/YYYY"),
            defaultPageSize = getSetting("org.defaultPageSize", "25").toIntOrNull() ?: 25
        )
        return ResponseEntity.ok(dto)
    }

    @PutMapping("/system")
    fun updateSystem(@RequestBody request: SystemSettingsDto): ResponseEntity<Any> {
        if (!isAdmin()) return ResponseEntity.status(403).build()

        val userName = currentUserService.userName
        setSetting("org.name", request.orgName, userName)
        setSetting("org.currency", request.currency, userName)
        setSetting("org.dateFormat", request.dateFormat, userName)
        setSetting("org.defaultPageSize", request.defaultPageSize.toString(), userName)

        auditService.log(AuditEntry("Updated", "SystemSettings", "system", "System Settings",
            "System settings updated", currentUserService.userId, userName))

        return ResponseEntity.ok(request)
    }

    @GetMapping("/alerts")
    fun getAlerts(): ResponseEntity<Any> {
        if (!isAdmin()) return ResponseEntity.status(403).build()

        val dto = AlertSettingsDto(
            warrantyEnabled = getSetting("alerts.warranty.enabled", "true") == "true",
            certificateEnabled = getSetting("alerts.certificate.enabled", "true") == "true",
            licenceEnabled = getSetting("alerts.licence.enabled", "true") == "true",
            thresholds = getSetting("alerts.thresholds", "90,30,14,7"),
            smtpHost = getSetting("alerts.smtp.host"),
            smtpPort = getSetting("alerts.smtp.port", "587").toIntOrNull() ?: 587,
            smtpUsername = getSetting("alerts.smtp.username"),
            smtpPassword = getSetting("alerts.smtp.password"),
            smtpFromAddress = getSetting("alerts.smtp.fromAddress"),
            slackWebhookUrl = getSetting("alerts.slack.webhookUrl"),
            recipients = getSetting("alerts.recipients")
        )
        return ResponseEntity.ok(dto)
    }

    @PutMapping("/alerts")
    fun updateAlerts(@RequestBody request: AlertSettingsDto): ResponseEntity<Any> {
        if (!isAdmin()) return ResponseEntity.status(403).build()

        val userName = currentUserService.userName
        setSetting("alerts.warranty.enabled", request.warrantyEnabled.toString().lowercase(), userName)
        setSetting("alerts.certificate.enabled", request.certificateEnabled.toString().lowercase(), userName)
        setSetting("alerts.licence.enabled", request.licenceEnabled.toString().lowercase(), userName)
        setSetting("alerts.thresholds", request.thresholds, userName)
        setSetting("alerts.smtp.host", request.smtpHost, userName)
        setSetting("alerts.smtp.port", request.smtpPort.toString(), userName)
        setSetting("alerts.smtp.username", request.smtpUsername, userName)
        setSetting("alerts.smtp.password", request.smtpPassword, userName)
        setSetting("alerts.smtp.fromAddress", request.smtpFromAddress, userName)
        setSetting("alerts.slack.webhookUrl", request.slackWebhookUrl, userName)
        setSetting("alerts.recipients", request.recipients, userName)

        auditService.log(AuditEntry("Updated", "AlertSettings", "alerts", "Alert Settings",
            "Alert settings updated", currentUserService.userId, userName))

        return ResponseEntity.ok(request)
    }
}
