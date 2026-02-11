package com.assetmanagement.api.model

import jakarta.persistence.*
import java.io.Serializable
import java.util.*

data class RolePermissionId(
    var roleId: UUID = UUID.randomUUID(),
    var permissionId: UUID = UUID.randomUUID()
) : Serializable

@Entity
@Table(name = "role_permissions")
@IdClass(RolePermissionId::class)
class RolePermission(
    @Id
    @Column(name = "role_id", columnDefinition = "CHAR(36)")
    var roleId: UUID = UUID.randomUUID(),

    @Id
    @Column(name = "permission_id", columnDefinition = "CHAR(36)")
    var permissionId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", insertable = false, updatable = false)
    var role: Role? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", insertable = false, updatable = false)
    var permission: Permission? = null
)
