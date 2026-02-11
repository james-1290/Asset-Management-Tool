package com.assetmanagement.api.model

import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "permissions")
class Permission(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "description")
    var description: String? = null,

    @OneToMany(mappedBy = "permission", cascade = [CascadeType.ALL], orphanRemoval = true)
    var rolePermissions: MutableList<RolePermission> = mutableListOf()
)
