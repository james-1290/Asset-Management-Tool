package com.assetmanagement.api.model

import jakarta.persistence.*
import java.io.Serializable
import java.util.*

data class UserRoleId(
    var userId: UUID = UUID.randomUUID(),
    var roleId: UUID = UUID.randomUUID()
) : Serializable

@Entity
@Table(name = "user_roles")
@IdClass(UserRoleId::class)
class UserRole(
    @Id
    @Column(name = "user_id", columnDefinition = "CHAR(36)")
    var userId: UUID = UUID.randomUUID(),

    @Id
    @Column(name = "role_id", columnDefinition = "CHAR(36)")
    var roleId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    var user: User? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", insertable = false, updatable = false)
    var role: Role? = null
)
