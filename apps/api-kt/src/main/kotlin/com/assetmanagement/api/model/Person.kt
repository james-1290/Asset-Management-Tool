package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "people")
class Person(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "full_name", nullable = false)
    var fullName: String = "",

    @Column(name = "email")
    var email: String? = null,

    @Column(name = "department")
    var department: String? = null,

    @Column(name = "job_title")
    var jobTitle: String? = null,

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

    @OneToMany(mappedBy = "assignedPerson")
    var assignedAssets: MutableList<Asset> = mutableListOf(),

    @OneToMany(mappedBy = "person", cascade = [CascadeType.ALL])
    var history: MutableList<PersonHistory> = mutableListOf()
)
