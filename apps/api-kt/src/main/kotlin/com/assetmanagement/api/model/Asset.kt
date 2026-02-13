package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.AssetStatus
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.util.*

@Entity
@Table(name = "assets")
class Asset(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "asset_tag")
    var assetTag: String? = null,

    @Column(name = "serial_number")
    var serialNumber: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(50)")
    var status: AssetStatus = AssetStatus.Available,

    @Column(name = "asset_type_id", nullable = false, columnDefinition = "CHAR(36)")
    var assetTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_type_id", insertable = false, updatable = false)
    var assetType: AssetType? = null,

    @Column(name = "location_id", columnDefinition = "CHAR(36)")
    var locationId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", insertable = false, updatable = false)
    var location: Location? = null,

    @Column(name = "assigned_person_id", columnDefinition = "CHAR(36)")
    var assignedPersonId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_person_id", insertable = false, updatable = false)
    var assignedPerson: Person? = null,

    @Column(name = "warranty_expiry_date")
    var warrantyExpiryDate: Instant? = null,

    @Column(name = "purchase_date")
    var purchaseDate: Instant? = null,

    @Column(name = "purchase_cost", precision = 18, scale = 2)
    var purchaseCost: BigDecimal? = null,

    @Column(name = "depreciation_months")
    var depreciationMonths: Int? = null,

    @Column(name = "sold_date")
    var soldDate: Instant? = null,

    @Column(name = "sold_price", precision = 18, scale = 2)
    var soldPrice: BigDecimal? = null,

    @Column(name = "retired_date")
    var retiredDate: Instant? = null,

    @Column(name = "notes", columnDefinition = "TEXT")
    var notes: String? = null,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @OneToMany(mappedBy = "asset", cascade = [CascadeType.ALL])
    var history: MutableList<AssetHistory> = mutableListOf(),

    @OneToMany(cascade = [CascadeType.ALL])
    @JoinColumn(name = "entity_id")
    var customFieldValues: MutableList<CustomFieldValue> = mutableListOf()
)
