package com.assetmanagement.api.security

import tools.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.util.Base64

class EasyAuthPrincipalParserTest {

    private val mapper = ObjectMapper()

    private fun header(json: String): String =
        Base64.getEncoder().encodeToString(json.toByteArray())

    private fun parse(json: String, id: String? = null, name: String? = null) =
        EasyAuthPrincipalParser.parse(header(json), mapper, id, name)

    @Test
    fun `parses the long-form WS-Federation claim URIs App Service emits`() {
        val principal = parse(
            """
            {
              "auth_typ": "aad",
              "name_typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
              "role_typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
              "claims": [
                {"typ": "http://schemas.microsoft.com/identity/claims/objectidentifier", "val": "oid-123"},
                {"typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "val": "ada@example.com"},
                {"typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name", "val": "Ada Lovelace"},
                {"typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "val": "Admin"},
                {"typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", "val": "Operator"}
              ]
            }
            """
        )!!

        assertEquals("oid-123", principal.externalId)
        assertEquals("ada@example.com", principal.email)
        assertEquals("ada@example.com", principal.username)
        assertEquals("Ada Lovelace", principal.displayName)
        assertEquals(listOf("Admin", "Operator"), principal.roles)
    }

    @Test
    fun `parses the short OIDC claim names`() {
        val principal = parse(
            """
            {
              "auth_typ": "aad",
              "claims": [
                {"typ": "oid", "val": "oid-456"},
                {"typ": "preferred_username", "val": "grace@example.com"},
                {"typ": "name", "val": "Grace Hopper"},
                {"typ": "roles", "val": "User"}
              ]
            }
            """
        )!!

        assertEquals("oid-456", principal.externalId)
        assertEquals("grace@example.com", principal.email)
        assertEquals("Grace Hopper", principal.displayName)
        assertEquals(listOf("User"), principal.roles)
    }

    @Test
    fun `falls back to the sibling headers when the claims blob is sparse`() {
        val principal = parse(
            """{"auth_typ": "aad", "claims": []}""",
            id = "oid-789",
            name = "alan@example.com"
        )!!

        assertEquals("oid-789", principal.externalId)
        assertEquals("alan@example.com", principal.email)
        // No name claim and no name_typ — derive something usable from the email.
        assertEquals("alan", principal.displayName)
        assertTrue(principal.roles.isEmpty())
    }

    @Test
    fun `returns null when no object identifier can be determined`() {
        assertNull(parse("""{"auth_typ": "aad", "claims": [{"typ": "name", "val": "Nobody"}]}"""))
    }

    @Test
    fun `returns null for an absent, blank, or malformed header`() {
        assertNull(EasyAuthPrincipalParser.parse(null, mapper))
        assertNull(EasyAuthPrincipalParser.parse("", mapper))
        assertNull(EasyAuthPrincipalParser.parse("not-base64-!!", mapper))
        assertNull(EasyAuthPrincipalParser.parse(header("{ not json"), mapper))
    }

    @Test
    fun `ignores unknown properties and blank or duplicate role values`() {
        val principal = parse(
            """
            {
              "auth_typ": "aad",
              "some_future_field": {"nested": true},
              "claims": [
                {"typ": "oid", "val": "oid-999"},
                {"typ": "roles", "val": "Admin"},
                {"typ": "roles", "val": " Admin "},
                {"typ": "roles", "val": "  "}
              ]
            }
            """
        )!!

        assertEquals(listOf("Admin"), principal.roles)
        // No email anywhere — the object id has to stand in as the username.
        assertEquals("oid-999", principal.username)
    }
}
