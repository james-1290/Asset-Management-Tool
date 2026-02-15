package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "user_notifications")
class UserNotification(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    var userId: UUID = UUID.randomUUID(),

    @Column(name = "entity_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var entityType: String = "",

    @Column(name = "entity_id", nullable = false, columnDefinition = "CHAR(36)")
    var entityId: UUID = UUID.randomUUID(),

    @Column(name = "entity_name", nullable = false)
    var entityName: String = "",

    @Column(name = "notification_type", nullable = false, columnDefinition = "VARCHAR(20)")
    var notificationType: String = "global",

    @Column(name = "title", nullable = false)
    var title: String = "",

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    var message: String = "",

    @Column(name = "threshold_days", nullable = false)
    var thresholdDays: Int = 0,

    @Column(name = "expiry_date", nullable = false)
    var expiryDate: Instant = Instant.now(),

    @Column(name = "is_read", nullable = false)
    var isRead: Boolean = false,

    @Column(name = "read_at")
    var readAt: Instant? = null,

    @Column(name = "is_dismissed", nullable = false)
    var isDismissed: Boolean = false,

    @Column(name = "dismissed_at")
    var dismissedAt: Instant? = null,

    @Column(name = "snoozed_until")
    var snoozedUntil: Instant? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now()
)
