package com.assetmanagement.api.config

import com.assetmanagement.api.model.Role
import com.assetmanagement.api.model.SystemSetting
import com.assetmanagement.api.model.User
import com.assetmanagement.api.model.UserRole
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.SystemSettingRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Component

@Component
class DatabaseSeeder(
    private val roleRepository: RoleRepository,
    private val userRepository: UserRepository,
    private val userRoleRepository: UserRoleRepository,
    private val systemSettingRepository: SystemSettingRepository,
    @Value("\${app.admin.password:admin123}") private val adminPassword: String
) : CommandLineRunner {

    private val log = LoggerFactory.getLogger(DatabaseSeeder::class.java)
    private val passwordEncoder = BCryptPasswordEncoder()

    override fun run(vararg args: String?) {
        seedRoles()
        seedDefaultSettings()
    }

    private fun seedRoles() {
        // Seed Admin role + admin user
        if (roleRepository.findByName("Admin") == null) {
            val role = Role(name = "Admin", description = "Full system administrator")
            roleRepository.save(role)

            val user = User(
                username = "admin",
                passwordHash = passwordEncoder.encode(adminPassword),
                email = "admin@localhost",
                displayName = "Administrator"
            )
            userRepository.save(user)

            userRoleRepository.save(UserRole(userId = user.id, roleId = role.id))
            log.info("Seeded Admin role and admin user")
        }

        // Seed User role
        if (roleRepository.findByName("User") == null) {
            roleRepository.save(Role(name = "User", description = "Standard user"))
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
