package com.assetmanagement.api.security

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.mock.env.MockEnvironment

class LocalEasyAuthEmulatorTest {

    private val mapper = ObjectMapper()

    private fun emulator(profiles: String = "dev", identities: String = "") =
        LocalEasyAuthEmulator(
            MockEnvironment().withProperty("spring.profiles.active", profiles).apply {
                setActiveProfiles(*profiles.split(",").toTypedArray())
            },
            mapper,
            identities
        )

    @Test
    fun `refuses to start outside a dev profile`() {
        val error = assertThrows(IllegalStateException::class.java) {
            LocalEasyAuthEmulator(MockEnvironment(), mapper, "")
        }
        assertTrue(error.message!!.contains("must never run outside local"))
    }

    @Test
    fun `refuses to start on an explicitly non-dev profile`() {
        assertThrows(IllegalStateException::class.java) { emulator(profiles = "production") }
    }

    @Test
    fun `emits a header the real principal parser understands`() {
        val emu = emulator()
        val admin = emu.find("admin")!!

        val parsed = EasyAuthPrincipalParser.parse(emu.principalHeader(admin), mapper)

        assertNotNull(parsed)
        assertEquals(admin.objectId, parsed!!.externalId)
        assertEquals("dev-admin@localhost", parsed.email)
        assertEquals("Dev Admin", parsed.displayName)
        assertEquals(listOf("Admin"), parsed.roles)
    }

    @Test
    fun `object ids are stable across instances so the same user row is reused`() {
        assertEquals(emulator().find("admin")!!.objectId, emulator().find("admin")!!.objectId)
    }

    @Test
    fun `ships a no-role identity that the parser reports as roleless`() {
        val emu = emulator()
        val parsed = EasyAuthPrincipalParser.parse(emu.principalHeader(emu.find("norole")!!), mapper)!!
        assertTrue(parsed.roles.isEmpty())
    }

    @Test
    fun `parses configured identities and ignores malformed entries`() {
        val emu = emulator(identities = "qa:qa@example.com:QA Tester:Operator|User,broken")

        assertEquals(1, emu.identities.size)
        val qa = emu.find("qa")!!
        assertEquals("QA Tester", qa.displayName)
        assertEquals(listOf("Operator", "User"), qa.roles)
        assertNull(emu.find("admin"))
    }

    @Test
    fun `unknown identity keys resolve to nothing`() {
        assertNull(emulator().find("nobody"))
        assertNull(emulator().find(null))
    }
}
