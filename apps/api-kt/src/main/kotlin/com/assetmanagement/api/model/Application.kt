package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.ApplicationStatus
import com.assetmanagement.api.model.enums.LicenceType
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.Instant
import java.util.*

@Entity
@Table(name = "applications")
class Application(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "application_type_id", nullable = false, columnDefinition = "CHAR(36)")
    var applicationTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_type_id", insertable = false, updatable = false)
    var applicationType: ApplicationType? = null,

    @Column(name = "publisher")
    var publisher: String? = null,

    @Column(name = "version")
    var version: String? = null,

    @Column(name = "licence_key")
    var licenceKey: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "licence_type", columnDefinition = "VARCHAR(50)")
    var licenceType: LicenceType? = null,

    @Column(name = "max_seats")
    var maxSeats: Int? = null,

    @Column(name = "used_seats")
    var usedSeats: Int? = null,

    @Column(name = "purchase_date")
    var purchaseDate: Instant? = null,

    @Column(name = "expiry_date")
    var expiryDate: Instant? = null,

    @Column(name = "purchase_cost", precision = 18, scale = 2)
    var purchaseCost: BigDecimal? = null,

    @Column(name = "auto_renewal", nullable = false)
    var autoRenewal: Boolean = false,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(50)")
    var status: ApplicationStatus = ApplicationStatus.Active,

    @Column(name = "deactivated_date")
    var deactivatedDate: Instant? = null,

    @Column(name = "notes", columnDefinition = "TEXT")
    var notes: String? = null,

    @Column(name = "asset_id", columnDefinition = "CHAR(36)")
    var assetId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", insertable = false, updatable = false)
    var asset: Asset? = null,

    @Column(name = "person_id", columnDefinition = "CHAR(36)")
    var personId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", insertable = false, updatable = false)
    var person: Person? = null,

    @Column(name = "location_id", columnDefinition = "CHAR(36)")
    var locationId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", insertable = false, updatable = false)
    var location: Location? = null,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @OneToMany(mappedBy = "application", cascade = [CascadeType.ALL])
    var history: MutableList<ApplicationHistory> = mutableListOf(),

    @Transient
    var customFieldValues: MutableList<CustomFieldValue> = mutableListOf()
)
