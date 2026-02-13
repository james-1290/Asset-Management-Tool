package com.assetmanagement.api.dto

import java.util.*

// ── Request DTOs ─────────────────────────────────────────────────────────

data class CheckAssetDuplicatesRequest(
    val name: String? = null,
    val serialNumber: String? = null,
    val excludeId: UUID? = null
)

data class CheckCertificateDuplicatesRequest(
    val name: String? = null,
    val thumbprint: String? = null,
    val serialNumber: String? = null,
    val excludeId: UUID? = null
)

data class CheckApplicationDuplicatesRequest(
    val name: String? = null,
    val publisher: String? = null,
    val licenceKey: String? = null,
    val excludeId: UUID? = null
)

data class CheckPersonDuplicatesRequest(
    val fullName: String? = null,
    val email: String? = null,
    val excludeId: UUID? = null
)

data class CheckLocationDuplicatesRequest(
    val name: String? = null,
    val excludeId: UUID? = null
)

// ── Response DTO ─────────────────────────────────────────────────────────

data class DuplicateCheckResult(
    val id: UUID,
    val name: String,
    val detail: String
)
