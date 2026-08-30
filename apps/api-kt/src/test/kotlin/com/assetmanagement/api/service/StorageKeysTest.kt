package com.assetmanagement.api.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class StorageKeysTest {

    @Test
    fun `accepts ordinary keys`() {
        assertEquals("assets/1234/photo.png", StorageKeys.validate("assets/1234/photo.png"))
        assertEquals("file.pdf", StorageKeys.validate("file.pdf"))
    }

    @Test
    fun `rejects path traversal`() {
        // On a filesystem this escapes the upload directory; in blob storage it
        // silently writes somewhere unintended.
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("../../etc/passwd") }
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("assets/../../secret") }
    }

    @Test
    fun `rejects absolute paths`() {
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("/etc/passwd") }
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("\\windows\\system32") }
    }

    @Test
    fun `rejects blank keys and embedded null bytes`() {
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("") }
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("   ") }
        assertThrows(IllegalArgumentException::class.java) { StorageKeys.validate("file${Char(0)}.png") }
    }
}
