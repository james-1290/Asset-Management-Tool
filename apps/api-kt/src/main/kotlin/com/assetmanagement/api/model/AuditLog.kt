package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.AuditSource
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "audit_logs",
    indexes = [
        Index(columnList = "timestamp"),
        Index(columnList = "entity_type, entity_id")
    ]
)
class AuditLog(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "actor_id", columnDefinition = "CHAR(36)")
    var actorId: UUID? = null,

    @Column(name = "actor_name", nullable = false)
    var actorName: String = "",

    @Column(name = "action", nullable = false)
    var action: String = "",

    @Column(name = "entity_type", nullable = false)
    var entityType: String = "",

    @Column(name = "entity_id", nullable = false)
    var entityId: String = "",

    @Column(name = "entity_name")
    var entityName: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, columnDefinition = "VARCHAR(50)")
    var source: AuditSource = AuditSource.API,

    @Column(name = "details", columnDefinition = "TEXT")
    var details: String? = null,

    @Column(name = "timestamp", nullable = false)
    var timestamp: Instant = Instant.now()
)
