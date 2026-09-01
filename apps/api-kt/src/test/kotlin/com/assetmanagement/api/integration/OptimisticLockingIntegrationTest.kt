package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * Two people edit the same record minutes apart. Without a version check the
 * second save silently discards the first, which is the failure this exists to
 * prevent.
 *
 * The five catalogue types below carried a `@Version` column but exposed it in
 * no DTO and checked it in no update, so they were last-write-wins while the
 * five main entities were protected — the kind of half-wired feature that reads
 * as done from the schema alone.
 */
class OptimisticLockingIntegrationTest : AbstractIntegrationTest() {

    private fun uniqueName(prefix: String) = "$prefix ${System.nanoTime()}"

    /** Create, read the version, save once, then save again with the stale version. */
    private fun assertStaleEditIsRefused(
        collection: String,
        createBody: (String) -> String,
        editBody: (String, Long) -> String,
    ) {
        val session = loginAsAdmin()

        val created = postJson("/api/v1/$collection", createBody(uniqueName("Lock")), session)
        assertTrue(
            created.statusCode.is2xxSuccessful,
            "$collection should be creatable: ${created.statusCode} ${created.body}",
        )
        val id = Regex("\"id\":\"([^\"]+)\"").find(created.body!!)!!.groupValues[1]
        val version = Regex("\"entityVersion\":(\\d+)").find(created.body!!)
            ?.groupValues?.get(1)?.toLong()
            ?: error("$collection does not expose entityVersion, so a client cannot send it back: ${created.body}")

        // The first person saves, which moves the version on.
        val first = putJson("/api/v1/$collection/$id", editBody(uniqueName("First"), version), session)
        assertEquals(HttpStatus.OK, first.statusCode, "first save should succeed: ${first.body}")

        // The second person saves the copy they opened before that.
        val stale = putJson("/api/v1/$collection/$id", editBody(uniqueName("Second"), version), session)
        assertEquals(
            HttpStatus.CONFLICT, stale.statusCode,
            "a stale $collection edit must be refused, not silently applied: ${stale.body}",
        )
        assertTrue(
            stale.body!!.contains("modified by another user"),
            "the conflict should say what happened: ${stale.body}",
        )
    }

    @Test
    fun `asset types refuse a stale edit`() = assertStaleEditIsRefused(
        "asset-types",
        { """{"name":"$it"}""" },
        { name, v -> """{"name":"$name","entityVersion":$v}""" },
    )

    @Test
    fun `certificate types refuse a stale edit`() = assertStaleEditIsRefused(
        "certificate-types",
        { """{"name":"$it"}""" },
        { name, v -> """{"name":"$name","entityVersion":$v}""" },
    )

    @Test
    fun `application types refuse a stale edit`() = assertStaleEditIsRefused(
        "application-types",
        { """{"name":"$it"}""" },
        { name, v -> """{"name":"$name","entityVersion":$v}""" },
    )

    @Test
    fun `asset models refuse a stale edit`() {
        val typeId = newAssetTypeId()
        assertStaleEditIsRefused(
            "asset-models",
            { """{"assetTypeId":"$typeId","name":"$it"}""" },
            { name, v -> """{"name":"$name","entityVersion":$v}""" },
        )
    }

    @Test
    fun `asset templates refuse a stale edit`() {
        val typeId = newAssetTypeId()
        assertStaleEditIsRefused(
            "asset-templates",
            { """{"assetTypeId":"$typeId","name":"$it"}""" },
            { name, v -> """{"name":"$name","entityVersion":$v}""" },
        )
    }

    /** Models and templates both hang off an asset type. */
    private fun newAssetTypeId(): String {
        val created = postJson("/api/v1/asset-types", """{"name":"${uniqueName("For Model")}"}""", loginAsAdmin())
        return Regex("\"id\":\"([^\"]+)\"").find(created.body!!)!!.groupValues[1]
    }

    @Test
    fun `an edit that sends no version is still accepted, so API clients are unaffected`() {
        val session = loginAsAdmin()
        val created = postJson("/api/v1/asset-types", """{"name":"${uniqueName("NoVersion")}"}""", session)
        val id = Regex("\"id\":\"([^\"]+)\"").find(created.body!!)!!.groupValues[1]

        val first = putJson("/api/v1/asset-types/$id", """{"name":"${uniqueName("A")}"}""", session)
        val second = putJson("/api/v1/asset-types/$id", """{"name":"${uniqueName("B")}"}""", session)

        assertEquals(HttpStatus.OK, first.statusCode)
        assertEquals(
            HttpStatus.OK, second.statusCode,
            "omitting the version deliberately skips the check; scripted callers must keep working",
        )
    }
}
