package com.assetmanagement.api.model

import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.util.*

@Entity
@Table(name = "asset_templates")
class AssetTemplate(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "asset_type_id", nullable = false, columnDefinition = "CHAR(36)")
    var assetTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_type_id", insertable = false, updatable = false)
    var assetType: AssetType? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "purchase_cost", precision = 18, scale = 2)
    var purchaseCost: BigDecimal? = null,

    @Column(name = "depreciation_months")
    var depreciationMonths: Int? = null,

    @Column(name = "location_id", columnDefinition = "CHAR(36)")
    var locationId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", insertable = false, updatable = false)
    var location: Location? = null,

    @Column(name = "notes", columnDefinition = "TEXT")
    var notes: String? = null,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @OneToMany(cascade = [CascadeType.ALL])
    @JoinColumn(name = "entity_id")
    var customFieldValues: MutableList<CustomFieldValue> = mutableListOf()
)
