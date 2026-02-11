package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.AssetHistoryEventType
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "asset_history", indexes = [Index(columnList = "asset_id")])
class AssetHistory(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "asset_id", nullable = false, columnDefinition = "CHAR(36)")
    var assetId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id", insertable = false, updatable = false)
    var asset: Asset? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var eventType: AssetHistoryEventType = AssetHistoryEventType.Created,

    @Column(name = "performed_by_user_id", columnDefinition = "CHAR(36)")
    var performedByUserId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id", insertable = false, updatable = false)
    var performedByUser: User? = null,

    @Column(name = "details", columnDefinition = "TEXT")
    var details: String? = null,

    @Column(name = "timestamp", nullable = false)
    var timestamp: Instant = Instant.now(),

    @OneToMany(mappedBy = "assetHistory", cascade = [CascadeType.ALL], orphanRemoval = true)
    var changes: MutableList<AssetHistoryChange> = mutableListOf()
)
