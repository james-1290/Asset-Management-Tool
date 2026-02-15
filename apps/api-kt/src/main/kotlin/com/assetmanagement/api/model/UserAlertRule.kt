package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "user_alert_rules")
class UserAlertRule(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    var userId: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "entity_types", nullable = false)
    var entityTypes: String = "",

    @Column(name = "thresholds", nullable = false)
    var thresholds: String = "90,30,14,7",

    @Column(name = "conditions", columnDefinition = "TEXT")
    var conditions: String? = null,

    @Column(name = "notify_email", nullable = false)
    var notifyEmail: Boolean = false,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
