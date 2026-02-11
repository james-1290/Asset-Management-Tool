package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "system_settings")
class SystemSetting(
    @Id
    @Column(name = "`key`", nullable = false)
    var key: String = "",

    @Column(name = "value", nullable = false, columnDefinition = "TEXT")
    var value: String = "",

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Column(name = "updated_by")
    var updatedBy: String? = null
)
