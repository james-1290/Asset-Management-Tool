package com.assetmanagement.api.config

import com.assetmanagement.api.model.Role
import com.assetmanagement.api.model.SystemSetting
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.SystemSettingRepository
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component

@Component
class DatabaseSeeder(
    private val roleRepository: RoleRepository,
    private val systemSettingRepository: SystemSettingRepository
) : CommandLineRunner {

    private val log = LoggerFactory.getLogger(DatabaseSeeder::class.java)

    override fun run(vararg args: String) {
        seedRoles()
        seedDefaultSettings()
    }

    private fun seedRoles() {
        // Roles are the grant of access: an Entra app role of the same name maps
        // onto each of these. No users are seeded — they are provisioned on
        // first sign-in from the identity the platform supplies.
        if (roleRepository.findByName("Admin") == null) {
            roleRepository.save(Role(name = "Admin", description = "Full system administrator"))
            log.info("Seeded Admin role")
        }

        // Seed Operator role — referenced by @PreAuthorize on the business controllers
        // (hasAnyRole('Admin','Operator')) but was never created, so it could not be
        // assigned to anyone. Without it, only Admins can perform writes.
        if (roleRepository.findByName("Operator") == null) {
            roleRepository.save(Role(name = "Operator", description = "Can create and edit records"))
            log.info("Seeded Operator role")
        }

        // Seed User role
        if (roleRepository.findByName("User") == null) {
            roleRepository.save(Role(name = "User", description = "Read-only access"))
            log.info("Seeded User role")
        }
    }

    private fun seedDefaultSettings() {
        val defaults = mapOf(
            "org.name" to "My Organisation",
            "org.currency" to "GBP",
            "org.dateFormat" to "DD/MM/YYYY",
            "org.defaultPageSize" to "25",
            "alerts.warranty.enabled" to "true",
            "alerts.certificate.enabled" to "true",
            "alerts.licence.enabled" to "true",
            "alerts.thresholds" to "90,30,14,7",
            "alerts.smtp.host" to "",
            "alerts.smtp.port" to "587",
            "alerts.smtp.username" to "",
            "alerts.smtp.password" to "",
            "alerts.smtp.fromAddress" to "",
            "alerts.slack.webhookUrl" to "",
            "alerts.recipients" to ""
        )

        var seeded = 0
        for ((key, value) in defaults) {
            if (systemSettingRepository.findByKey(key) == null) {
                systemSettingRepository.save(SystemSetting(key = key, value = value, updatedBy = "System"))
                seeded++
            }
        }
        if (seeded > 0) log.info("Seeded $seeded default system settings")
    }
}
