package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.CertificateStatus
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "certificates")
class Certificate(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "certificate_type_id", nullable = false, columnDefinition = "CHAR(36)")
    var certificateTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certificate_type_id", insertable = false, updatable = false)
    var certificateType: CertificateType? = null,

    @Column(name = "issuer")
    var issuer: String? = null,

    @Column(name = "subject")
    var subject: String? = null,

    @Column(name = "thumbprint")
    var thumbprint: String? = null,

    @Column(name = "serial_number")
    var serialNumber: String? = null,

    @Column(name = "issued_date")
    var issuedDate: Instant? = null,

    @Column(name = "expiry_date")
    var expiryDate: Instant? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "VARCHAR(50)")
    var status: CertificateStatus = CertificateStatus.Active,

    @Column(name = "auto_renewal", nullable = false)
    var autoRenewal: Boolean = false,

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

    @OneToMany(mappedBy = "certificate", cascade = [CascadeType.ALL])
    var history: MutableList<CertificateHistory> = mutableListOf(),

    @Transient
    var customFieldValues: MutableList<CustomFieldValue> = mutableListOf()
)
