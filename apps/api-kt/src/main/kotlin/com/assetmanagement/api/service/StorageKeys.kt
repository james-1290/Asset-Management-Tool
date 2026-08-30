package com.assetmanagement.api.service

/**
 * Validation shared by every [StorageService] implementation.
 *
 * A storage key comes from application code rather than directly from a user,
 * but the check is cheap and the failure mode is severe: on a filesystem a
 * traversal escapes the upload directory, and in blob storage a leading slash or
 * `..` segment silently writes to an unexpected path.
 */
object StorageKeys {

    fun validate(key: String): String {
        require(key.isNotBlank()) { "Invalid storage key: blank" }
        require(!key.startsWith("/") && !key.startsWith("\\")) { "Invalid storage key: absolute path" }
        require(!key.contains("..")) { "Invalid storage key: path traversal detected" }
        require(key.none { it == Char(0) }) { "Invalid storage key: null byte" }
        return key
    }
}
