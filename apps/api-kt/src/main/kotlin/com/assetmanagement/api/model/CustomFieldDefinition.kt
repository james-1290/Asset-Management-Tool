package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.model.enums.EntityType
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "custom_field_definitions")
class CustomFieldDefinition(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var entityType: EntityType = EntityType.Asset,

    @Column(name = "asset_type_id", columnDefinition = "CHAR(36)")
    var assetTypeId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_type_id", insertable = false, updatable = false)
    var assetType: AssetType? = null,

    @Column(name = "certificate_type_id", columnDefinition = "CHAR(36)")
    var certificateTypeId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certificate_type_id", insertable = false, updatable = false)
    var certificateType: CertificateType? = null,

    @Column(name = "application_type_id", columnDefinition = "CHAR(36)")
    var applicationTypeId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_type_id", insertable = false, updatable = false)
    var applicationType: ApplicationType? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Enumerated(EnumType.STRING)
    @Column(name = "field_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var fieldType: CustomFieldType = CustomFieldType.Text,

    @Column(name = "options", columnDefinition = "TEXT")
    var options: String? = null,

    @Column(name = "is_required", nullable = false)
    var isRequired: Boolean = false,

    @Column(name = "sort_order", nullable = false)
    var sortOrder: Int = 0,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @OneToMany(mappedBy = "customFieldDefinition", cascade = [CascadeType.ALL])
    var values: MutableList<CustomFieldValue> = mutableListOf()
)
