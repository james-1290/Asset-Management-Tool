package com.assetmanagement.api.service

import com.assetmanagement.api.model.Role
import com.assetmanagement.api.model.User
import com.assetmanagement.api.repository.RoleRepository
import com.assetmanagement.api.repository.UserRepository
import com.assetmanagement.api.repository.UserRoleRepository
import com.assetmanagement.api.security.EasyAuthPrincipal
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.UUID

class EasyAuthUserServiceTest {

    private val userRepository = mock(UserRepository::class.java)
    private val roleRepository = mock(RoleRepository::class.java)
    private val userRoleRepository = mock(UserRoleRepository::class.java)

    private fun service(roleMap: String = "") =
        EasyAuthUserService(userRepository, roleRepository, userRoleRepository, roleMap)

    private fun principal(vararg roles: String) = EasyAuthPrincipal(
        externalId = "oid-1",
        username = "ada@example.com",
        email = "ada@example.com",
        displayName = "Ada Lovelace",
        roles = roles.toList()
    )

    private fun role(name: String) = Role(name = name, description = name)

    @Test
    fun `refuses a principal with no app roles and provisions nothing`() {
        assertSame(EasyAuthUserService.Resolution.NoRole, service().resolve(principal()))

        // The important half: a refused sign-in must not leave an account behind.
        verify(userRepository, never()).save(any(User::class.java))
        verify(userRepository, never()).findByExternalId(anyString())
    }

    @Test
    fun `refuses a principal whose app roles match no local role`() {
        `when`(roleRepository.findByName("Nonexistent")).thenReturn(null)

        assertSame(EasyAuthUserService.Resolution.NoRole, service().resolve(principal("Nonexistent")))

        verify(userRepository, never()).save(any(User::class.java))
    }

    @Test
    fun `refuses a deactivated user without reactivating them`() {
        val existing = User(id = UUID.randomUUID(), externalId = "oid-1", isActive = false)
        `when`(roleRepository.findByName("Admin")).thenReturn(role("Admin"))
        `when`(userRepository.findByExternalId("oid-1")).thenReturn(existing)

        // Distinct from "no role": an administrator here can restore it, and the
        // user must be told that rather than sent to chase an Entra assignment.
        assertSame(EasyAuthUserService.Resolution.Deactivated, service().resolve(principal("Admin")))
    }

    @Test
    fun `admits a principal holding a recognised app role`() {
        val existing = User(id = UUID.randomUUID(), externalId = "oid-1", isActive = true)
        `when`(roleRepository.findByName("Admin")).thenReturn(role("Admin"))
        `when`(userRepository.findByExternalId("oid-1")).thenReturn(existing)
        `when`(userRoleRepository.findByUserId(existing.id)).thenReturn(emptyList())
        `when`(userRepository.findWithRolesById(existing.id)).thenReturn(existing)

        assertInstanceOf(EasyAuthUserService.Resolution.Allowed::class.java, service().resolve(principal("Admin")))
    }

    @Test
    fun `applies the configured Entra-to-local role mapping case-insensitively`() {
        val existing = User(id = UUID.randomUUID(), externalId = "oid-1", isActive = true)
        `when`(roleRepository.findByName("Admin")).thenReturn(role("Admin"))
        `when`(userRepository.findByExternalId("oid-1")).thenReturn(existing)
        `when`(userRoleRepository.findByUserId(existing.id)).thenReturn(emptyList())
        `when`(userRepository.findWithRolesById(existing.id)).thenReturn(existing)

        val resolved = service(roleMap = "AssetTool.Administrator:Admin")
            .resolve(principal("assettool.administrator"))

        assertInstanceOf(EasyAuthUserService.Resolution.Allowed::class.java, resolved)
        verify(roleRepository).findByName("Admin")
    }

    @Test
    fun `never auto-links a LOCAL account to an Entra identity`() {
        val local = User(id = UUID.randomUUID(), email = "ada@example.com", authProvider = "LOCAL")
        `when`(roleRepository.findByName("Admin")).thenReturn(role("Admin"))
        `when`(userRepository.findByExternalId("oid-1")).thenReturn(null)
        `when`(userRepository.findByEmail("ada@example.com")).thenReturn(local)

        assertSame(EasyAuthUserService.Resolution.Conflict, service().resolve(principal("Admin")))

        verify(userRepository, never()).save(any(User::class.java))
        assertEquals("LOCAL", local.authProvider)
        assertNull(local.externalId)
    }
}
