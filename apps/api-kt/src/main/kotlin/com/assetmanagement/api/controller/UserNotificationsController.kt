package com.assetmanagement.api.controller
import java.time.ZoneOffset

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.UserNotification
import com.assetmanagement.api.repository.UserNotificationRepository
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import jakarta.persistence.criteria.Predicate
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import org.springframework.transaction.annotation.Transactional

@RestController
@RequestMapping("/api/v1/user-notifications")
class UserNotificationsController(
    private val userNotificationRepository: UserNotificationRepository,
    private val currentUserService: CurrentUserService,
    private val auditService: AuditService
) {
    @GetMapping
    // Maps entities to DTOs, which walks lazy associations; open-session-in-view
    // is off, so the mapping has to happen inside a session.
    @Transactional(readOnly = true)
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(defaultValue = "all") status: String
    ): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val spec = Specification<UserNotification> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<UUID>("userId"), userId))
            when (status) {
                "unread" -> {
                    predicates.add(cb.equal(root.get<Boolean>("isRead"), false))
                    predicates.add(cb.equal(root.get<Boolean>("isDismissed"), false))
                }
                "read" -> predicates.add(cb.equal(root.get<Boolean>("isRead"), true))
            }
            cb.and(*predicates.toTypedArray())
        }
        val safePage = page.coerceAtLeast(1)
        val safePageSize = pageSize.coerceIn(1, 100)
        val pageable = PageRequest.of(safePage - 1, safePageSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        val result = userNotificationRepository.findAll(spec, pageable)
        return ResponseEntity.ok(PagedResponse(
            items = result.content.map { it.toDto() },
            page = safePage, pageSize = safePageSize, totalCount = result.totalElements
        ))
    }

    @GetMapping("/unread-count")
    fun getUnreadCount(): ResponseEntity<UnreadCountResponse> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val count = userNotificationRepository.countByUserIdAndIsReadFalseAndIsDismissedFalse(userId)
        return ResponseEntity.ok(UnreadCountResponse(count))
    }

    @PostMapping("/{id}/read")
    fun markRead(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        // 404, not 403: a 403 confirms the notification exists, which lets someone
        // probe for other users' rows. Matches SavedViewsController and
        // UserAlertRulesController.
        if (notif.userId != userId) return ResponseEntity.notFound().build()
        notif.isRead = true
        notif.readAt = Instant.now()
        userNotificationRepository.save(notif)
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/{id}/dismiss")
    fun dismiss(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        // 404, not 403: a 403 confirms the notification exists, which lets someone
        // probe for other users' rows. Matches SavedViewsController and
        // UserAlertRulesController.
        if (notif.userId != userId) return ResponseEntity.notFound().build()
        notif.isDismissed = true
        notif.dismissedAt = Instant.now()
        userNotificationRepository.save(notif)
        // Dismissing and snoozing suppress a warning about something expiring, so
        // they are auditable. Marking one read is not: it changes nothing about
        // what the system will tell you, and it happens in bulk.
        audit("Dismissed", notif, "Dismissed notification \"${notif.title}\"")
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/{id}/snooze")
    fun snooze(@PathVariable id: UUID, @RequestBody request: SnoozeRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        // 404, not 403: a 403 confirms the notification exists, which lets someone
        // probe for other users' rows. Matches SavedViewsController and
        // UserAlertRulesController.
        if (notif.userId != userId) return ResponseEntity.notFound().build()
        val now = Instant.now()
        notif.snoozedUntil = when (request.duration) {
            "1d" -> now.plus(1, ChronoUnit.DAYS)
            "3d" -> now.plus(3, ChronoUnit.DAYS)
            "1w" -> now.plus(7, ChronoUnit.DAYS)
            "until_expiry" -> notif.expiryDate.atStartOfDay(ZoneOffset.UTC).toInstant()
            else -> return ResponseEntity.badRequest().body(mapOf("error" to "Invalid duration. Use: 1d, 3d, 1w, until_expiry"))
        }
        userNotificationRepository.save(notif)
        audit("Snoozed", notif, "Snoozed notification \"${notif.title}\" until ${notif.snoozedUntil}")
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/read-all")
    fun markAllRead(): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val spec = Specification<UserNotification> { root, _, cb ->
            cb.and(
                cb.equal(root.get<UUID>("userId"), userId),
                cb.equal(root.get<Boolean>("isRead"), false),
                cb.equal(root.get<Boolean>("isDismissed"), false)
            )
        }
        val unread = userNotificationRepository.findAll(spec)
        val now = Instant.now()
        unread.forEach { it.isRead = true; it.readAt = now }
        userNotificationRepository.saveAll(unread)
        return ResponseEntity.ok(mapOf("marked" to unread.size))
    }

    private fun UserNotification.toDto() = UserNotificationDto(
        id = id, entityType = entityType, entityId = entityId, entityName = entityName,
        notificationType = notificationType, title = title, message = message,
        thresholdDays = thresholdDays, expiryDate = expiryDate, isRead = isRead,
        readAt = readAt, isDismissed = isDismissed, dismissedAt = dismissedAt,
        snoozedUntil = snoozedUntil, createdAt = createdAt
    )

    private fun audit(action: String, notif: UserNotification, details: String) {
        auditService.log(AuditEntry(
            action, "Notification", notif.id.toString(), notif.title, details,
            currentUserService.userId, currentUserService.userName,
        ))
    }
}
