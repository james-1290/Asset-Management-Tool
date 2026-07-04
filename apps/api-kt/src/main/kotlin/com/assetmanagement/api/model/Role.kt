package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "roles")
class Role(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "description")
    var description: String? = null,

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @OneToMany(mappedBy = "role", cascade = [CascadeType.ALL], orphanRemoval = true)
    var userRoles: MutableList<UserRole> = mutableListOf(),

    @OneToMany(mappedBy = "role", cascade = [CascadeType.ALL], orphanRemoval = true)
    var rolePermissions: MutableList<RolePermission> = mutableListOf()
)
