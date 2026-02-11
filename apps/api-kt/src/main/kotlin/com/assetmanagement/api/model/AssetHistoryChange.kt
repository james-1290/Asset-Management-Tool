package com.assetmanagement.api.model

import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "asset_history_changes")
class AssetHistoryChange(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "asset_history_id", nullable = false, columnDefinition = "CHAR(36)")
    var assetHistoryId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_history_id", insertable = false, updatable = false)
    var assetHistory: AssetHistory? = null,

    @Column(name = "field_name", nullable = false)
    var fieldName: String = "",

    @Column(name = "old_value", columnDefinition = "TEXT")
    var oldValue: String? = null,

    @Column(name = "new_value", columnDefinition = "TEXT")
    var newValue: String? = null
)
