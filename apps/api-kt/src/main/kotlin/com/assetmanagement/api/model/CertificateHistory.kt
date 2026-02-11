package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.CertificateHistoryEventType
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "certificate_history", indexes = [Index(columnList = "certificate_id")])
class CertificateHistory(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "certificate_id", nullable = false, columnDefinition = "CHAR(36)")
    var certificateId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "certificate_id", insertable = false, updatable = false)
    var certificate: Certificate? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var eventType: CertificateHistoryEventType = CertificateHistoryEventType.Created,

    @Column(name = "performed_by_user_id", columnDefinition = "CHAR(36)")
    var performedByUserId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id", insertable = false, updatable = false)
    var performedByUser: User? = null,

    @Column(name = "details", columnDefinition = "TEXT")
    var details: String? = null,

    @Column(name = "timestamp", nullable = false)
    var timestamp: Instant = Instant.now(),

    @OneToMany(mappedBy = "certificateHistory", cascade = [CascadeType.ALL], orphanRemoval = true)
    var changes: MutableList<CertificateHistoryChange> = mutableListOf()
)
