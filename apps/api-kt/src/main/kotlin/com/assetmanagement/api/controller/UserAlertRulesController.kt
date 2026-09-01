package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.UserAlertRule
import com.assetmanagement.api.repository.UserAlertRuleRepository
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.time.Instant
import java.util.UUID
import org.springframework.transaction.annotation.Transactional
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService

@RestController
@RequestMapping("/api/v1/alert-rules")
class UserAlertRulesController(
    private val userAlertRuleRepository: UserAlertRuleRepository,
    private val currentUserService: CurrentUserService,
    private val auditService: AuditService
) {
    @GetMapping
    // Maps entities to DTOs, which walks lazy associations; open-session-in-view
    // is off, so the mapping has to happen inside a session.
    @Transactional(readOnly = true)
    fun getAll(): ResponseEntity<List<UserAlertRuleDto>> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rules = userAlertRuleRepository.findByUserIdOrderByCreatedAtDesc(userId)
        return ResponseEntity.ok(rules.map { it.toDto() })
    }

    @PostMapping
    fun create(@RequestBody request: CreateAlertRuleRequest): ResponseEntity<UserAlertRuleDto> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rule = UserAlertRule(
            userId = userId,
            name = request.name.trim(),
            entityTypes = request.entityTypes,
            thresholds = request.thresholds,
            notifyEmail = request.notifyEmail
        )
        val saved = userAlertRuleRepository.save(rule)
        // An alert rule decides what this account is warned about, so changing one
        // is an auditable act — the same reason the alert *sends* are audited.
        audit("Created", saved.id, saved.name, "Created alert rule \"${saved.name}\"")
        return ResponseEntity.created(URI("/api/v1/alert-rules/${saved.id}")).body(saved.toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAlertRuleRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rule = userAlertRuleRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        // 404, not 403: a 403 confirms the record exists, which lets someone
        // probe for other users' rules. Matches SavedViewsController.
        if (rule.userId != userId) return ResponseEntity.notFound().build()
        rule.name = request.name.trim()
        rule.entityTypes = request.entityTypes
        rule.thresholds = request.thresholds
        rule.notifyEmail = request.notifyEmail
        rule.isActive = request.isActive
        rule.updatedAt = Instant.now()
        userAlertRuleRepository.save(rule)
        audit("Updated", rule.id, rule.name,
            "Updated alert rule \"${rule.name}\" (active=${rule.isActive}, thresholds=${rule.thresholds})")
        return ResponseEntity.ok(rule.toDto())
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rule = userAlertRuleRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        // 404, not 403: a 403 confirms the record exists, which lets someone
        // probe for other users' rules. Matches SavedViewsController.
        if (rule.userId != userId) return ResponseEntity.notFound().build()
        userAlertRuleRepository.delete(rule)
        audit("Deleted", rule.id, rule.name, "Deleted alert rule \"${rule.name}\"")
        return ResponseEntity.noContent().build()
    }

    private fun UserAlertRule.toDto() = UserAlertRuleDto(
        id = id, name = name, entityTypes = entityTypes, thresholds = thresholds,
        conditions = conditions, notifyEmail = notifyEmail, isActive = isActive,
        createdAt = createdAt, updatedAt = updatedAt
    )

    private fun audit(action: String, id: UUID, name: String, details: String) {
        auditService.log(AuditEntry(
            action, "AlertRule", id.toString(), name, details,
            currentUserService.userId, currentUserService.userName,
        ))
    }
}
