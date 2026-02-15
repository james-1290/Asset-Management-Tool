package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.UserNotification
import com.assetmanagement.api.repository.UserNotificationRepository
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

@RestController
@RequestMapping("/api/v1/user-notifications")
class UserNotificationsController(
    private val userNotificationRepository: UserNotificationRepository,
    private val currentUserService: CurrentUserService
) {
    @GetMapping
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
        val pageable = PageRequest.of((page - 1).coerceAtLeast(0), pageSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        val result = userNotificationRepository.findAll(spec, pageable)
        return ResponseEntity.ok(PagedResponse(
            items = result.content.map { it.toDto() },
            page = page, pageSize = pageSize, totalCount = result.totalElements
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
        if (notif.userId != userId) return ResponseEntity.status(403).build()
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
        if (notif.userId != userId) return ResponseEntity.status(403).build()
        notif.isDismissed = true
        notif.dismissedAt = Instant.now()
        userNotificationRepository.save(notif)
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/{id}/snooze")
    fun snooze(@PathVariable id: UUID, @RequestBody request: SnoozeRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (notif.userId != userId) return ResponseEntity.status(403).build()
        val now = Instant.now()
        notif.snoozedUntil = when (request.duration) {
            "1d" -> now.plus(1, ChronoUnit.DAYS)
            "3d" -> now.plus(3, ChronoUnit.DAYS)
            "1w" -> now.plus(7, ChronoUnit.DAYS)
            "until_expiry" -> notif.expiryDate
            else -> return ResponseEntity.badRequest().body(mapOf("error" to "Invalid duration. Use: 1d, 3d, 1w, until_expiry"))
        }
        userNotificationRepository.save(notif)
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
}
