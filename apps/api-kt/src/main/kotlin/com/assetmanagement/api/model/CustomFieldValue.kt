package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(
    name = "custom_field_values",
    indexes = [Index(columnList = "custom_field_definition_id, entity_id")]
)
class CustomFieldValue(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "custom_field_definition_id", nullable = false, columnDefinition = "CHAR(36)")
    var customFieldDefinitionId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_field_definition_id", insertable = false, updatable = false)
    var customFieldDefinition: CustomFieldDefinition? = null,

    @Column(name = "entity_id", nullable = false, columnDefinition = "CHAR(36)")
    var entityId: UUID = UUID.randomUUID(),

    @Column(name = "value", columnDefinition = "TEXT")
    var value: String? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
