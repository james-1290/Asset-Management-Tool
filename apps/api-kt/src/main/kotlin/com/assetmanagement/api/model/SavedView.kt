package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "saved_views",
    indexes = [Index(columnList = "user_id, entity_type")]
)
class SavedView(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    var userId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    var user: User? = null,

    @Column(name = "entity_type", nullable = false)
    var entityType: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "is_default", nullable = false)
    var isDefault: Boolean = false,

    @Column(name = "configuration", nullable = false, columnDefinition = "TEXT")
    var configuration: String = "",

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
