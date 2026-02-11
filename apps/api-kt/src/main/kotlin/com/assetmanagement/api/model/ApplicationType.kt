package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "application_types")
class ApplicationType(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "description")
    var description: String? = null,

    @Column(name = "is_archived", nullable = false)
    var isArchived: Boolean = false,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @OneToMany(mappedBy = "applicationType")
    var applications: MutableList<Application> = mutableListOf(),

    @OneToMany(mappedBy = "applicationType", cascade = [CascadeType.ALL], orphanRemoval = true)
    var customFieldDefinitions: MutableList<CustomFieldDefinition> = mutableListOf()
)
