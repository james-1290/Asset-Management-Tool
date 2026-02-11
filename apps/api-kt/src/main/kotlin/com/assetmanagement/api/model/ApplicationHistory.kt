package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.ApplicationHistoryEventType
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "application_history", indexes = [Index(columnList = "application_id")])
class ApplicationHistory(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "application_id", nullable = false, columnDefinition = "CHAR(36)")
    var applicationId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", insertable = false, updatable = false)
    var application: Application? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var eventType: ApplicationHistoryEventType = ApplicationHistoryEventType.Created,

    @Column(name = "performed_by_user_id", columnDefinition = "CHAR(36)")
    var performedByUserId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id", insertable = false, updatable = false)
    var performedByUser: User? = null,

    @Column(name = "details", columnDefinition = "TEXT")
    var details: String? = null,

    @Column(name = "timestamp", nullable = false)
    var timestamp: Instant = Instant.now(),

    @OneToMany(mappedBy = "applicationHistory", cascade = [CascadeType.ALL], orphanRemoval = true)
    var changes: MutableList<ApplicationHistoryChange> = mutableListOf()
)
