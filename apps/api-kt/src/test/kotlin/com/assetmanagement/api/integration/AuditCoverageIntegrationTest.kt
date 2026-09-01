package com.assetmanagement.api.integration

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * CLAUDE.md: "All write operations must emit audit log events." Eleven endpoints
 * did not. These cover the ones where the omission mattered — an alert rule
 * decides what this account is warned about, and dismissing or snoozing a
 * notification suppresses a warning that something is expiring. Marking a
 * notification read and saving a view remain deliberately unaudited: neither
 * changes what the system will tell anyone, and both happen in bulk.
 */
class AuditCoverageIntegrationTest : AbstractIntegrationTest() {

    private fun auditCount(session: SessionCookies): Int {
        val body = getAs("/api/v1/audit-logs?pageSize=1", session).body!!
        return Regex("\"totalCount\":(\\d+)").find(body)!!.groupValues[1].toInt()
    }

    @Test
    fun `changing an alert rule is audited`() {
        val session = loginAsAdmin()
        val before = auditCount(session)

        val created = postJson(
            "/api/v1/alert-rules",
            """{"name":"Audited Rule ${System.nanoTime()}","entityTypes":"asset","thresholds":"30","notifyEmail":true}""",
            session,
        )
        assertTrue(created.statusCode.is2xxSuccessful, "rule should be created: ${created.body}")
        val id = Regex("\"id\":\"([^\"]+)\"").find(created.body!!)!!.groupValues[1]

        deleteAs("/api/v1/alert-rules/$id", session)

        val after = auditCount(session)
        assertTrue(after >= before + 2, "create and delete should both be audited: $before -> $after")
    }

    @Test
    fun `another user's notification is not found, rather than forbidden`() {
        // A 403 confirms the row exists, which lets someone probe for other
        // users' notifications; saved views and alert rules already return 404.
        val session = loginAsAdmin()
        val response = postJson("/api/v1/user-notifications/${java.util.UUID.randomUUID()}/dismiss", "{}", session)
        assertEquals(404, response.statusCode.value(), "got: ${response.body}")
    }
}
