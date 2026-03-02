package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "asset_models")
class AssetModel(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "asset_type_id", nullable = false)
    var assetTypeId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_type_id", insertable = false, updatable = false)
    var assetType: AssetType? = null,

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "manufacturer")
    var manufacturer: String? = null,

    @Column(name = "image_url", length = 500)
    var imageUrl: String? = null,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
