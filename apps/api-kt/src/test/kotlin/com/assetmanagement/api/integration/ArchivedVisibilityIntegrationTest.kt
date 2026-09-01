package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * An archived record has to be findable, or it cannot be restored.
 *
 * The assets list ignored `includeArchived` — the one parameter the Assets screen
 * has always sent for its "Archived" toggle. Archiving an asset therefore removed
 * it from the only place it could be found, and the restore endpoint, which works
 * perfectly well, could not be reached from the UI. Every other collection
 * honoured the parameter, which is why nothing else caught it.
 */
class ArchivedVisibilityIntegrationTest : AbstractIntegrationTest() {

    private fun id(body: String) = Regex("\"id\":\"([^\"]+)\"").find(body)!!.groupValues[1]

    @Test
    fun `every collection can show its archived records`() {
        val session = loginAsAdmin()
        val tag = System.nanoTime()

        val typeId = id(postJson("/api/v1/asset-types", """{"name":"AV Type $tag"}""", session).body!!)
        val cases = listOf(
            "assets" to """{"name":"AV Asset $tag","assetTypeId":"$typeId","status":"Available"}""",
            "people" to """{"fullName":"AV Person $tag","email":"av$tag@example.com"}""",
            "locations" to """{"name":"AV Loc $tag"}""",
            "certificate-types" to """{"name":"AV CType $tag"}""",
            "application-types" to """{"name":"AV PType $tag"}""",
        )

        for ((collection, body) in cases) {
            val created = postJson("/api/v1/$collection", body, session)
            assertTrue(created.statusCode.is2xxSuccessful, "$collection create: ${created.body}")
            val recordId = id(created.body!!)

            val archived = deleteAs("/api/v1/$collection/$recordId", session)
            assertTrue(archived.statusCode.is2xxSuccessful, "$collection archive: ${archived.body}")

            val hidden = getAs("/api/v1/$collection?search=AV&pageSize=100", session).body!!
            assertTrue(
                !hidden.contains(recordId),
                "$collection: an archived record should not be in the default list",
            )

            val shown = getAs("/api/v1/$collection?includeArchived=true&search=AV&pageSize=100", session).body!!
            assertTrue(
                shown.contains(recordId),
                "$collection: includeArchived=true must reveal the archived record, " +
                    "otherwise it can never be restored",
            )

            val restored = postJson("/api/v1/$collection/$recordId/restore", "{}", session)
            assertTrue(restored.statusCode.is2xxSuccessful, "$collection restore: ${restored.body}")
        }
    }
}
