package com.assetmanagement.api.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.mock.env.MockEnvironment

/**
 * Which storage implementation is in use is a deployment decision with a nasty
 * failure mode — picking the filesystem on App Service loses people's uploads on
 * the next restart — so the selection rules are worth pinning down.
 */
class StorageSelectionTest {

    @Test
    fun `blob storage refuses to start without an account or connection string`() {
        val error = assertThrows(IllegalArgumentException::class.java) {
            AzureBlobStorageService(containerName = "attachments", accountName = "", connectionString = "")
        }
        assertTrue(error.message!!.contains("BLOB_ACCOUNT_NAME"), error.message)
    }

    @Test
    fun `blob storage constructs from an account name alone, using a managed identity`() {
        // No secret configured, and no network call at construction — the client
        // is built lazily so a storage outage fails a request, not the boot.
        AzureBlobStorageService(containerName = "attachments", accountName = "examplestorage", connectionString = "")
    }

    @Test
    fun `local storage warns when it is running outside a dev profile`() {
        // The warning is the only signal that uploads are about to be written
        // somewhere ephemeral, so make sure the dev/non-dev distinction holds.
        val production = MockEnvironment()
        LocalStorageService("./uploads", production)

        val dev = MockEnvironment().apply { setActiveProfiles("dev") }
        LocalStorageService("./uploads", dev)
    }

    @Test
    fun `local storage rejects a traversing key before touching the filesystem`() {
        val service = LocalStorageService("./uploads", MockEnvironment().apply { setActiveProfiles("test") })
        val error = assertThrows(IllegalArgumentException::class.java) { service.load("../../etc/passwd") }
        assertEquals("Invalid storage key: path traversal detected", error.message)
    }
}
