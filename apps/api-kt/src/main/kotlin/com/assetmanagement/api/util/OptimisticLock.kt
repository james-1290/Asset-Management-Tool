package com.assetmanagement.api.util

import org.springframework.http.ResponseEntity

/**
 * Manual optimistic-concurrency check for the load-mutate-save pattern.
 *
 * The client sends the entity version it last loaded. If the row has since been
 * updated by someone else (current version differs), return a 409 so the client
 * can refresh instead of silently overwriting the newer data. A null client
 * version skips the check (older clients that don't send one).
 */
fun versionConflict(clientVersion: Long?, currentVersion: Long): ResponseEntity<Any>? =
    if (clientVersion != null && clientVersion != currentVersion)
        ResponseEntity.status(409).body(
            mapOf("error" to "This record was modified by another user. Please refresh and try again.")
        )
    else null
