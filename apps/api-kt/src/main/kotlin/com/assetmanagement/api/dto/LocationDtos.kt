package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class LocationDto(
    val id: UUID,
    val name: String,
    val address: String?,
    val city: String?,
    val country: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateLocationRequest(
    val name: String,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null
)

data class UpdateLocationRequest(
    val name: String,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null
)

data class LocationAssetDto(
    val id: UUID,
    val name: String,
    val assetTypeName: String?,
    val status: String,
    val assignedPersonName: String?
)

data class LocationPersonDto(
    val id: UUID,
    val fullName: String,
    val email: String?,
    val department: String?,
    val jobTitle: String?
)

data class LocationCertificateDto(
    val id: UUID,
    val name: String,
    val certificateTypeName: String?,
    val expiryDate: Instant?
)

data class LocationApplicationDto(
    val id: UUID,
    val name: String,
    val applicationTypeName: String?,
    val expiryDate: Instant?
)

data class ReassignAndArchiveRequest(
    val targetLocationId: UUID? = null
)
