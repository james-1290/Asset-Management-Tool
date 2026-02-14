package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class PersonDto(
    val id: UUID,
    val fullName: String,
    val email: String?,
    val department: String?,
    val jobTitle: String?,
    val locationId: UUID?,
    val locationName: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreatePersonRequest(
    val fullName: String,
    val email: String? = null,
    val department: String? = null,
    val jobTitle: String? = null,
    val locationId: UUID? = null
)

data class UpdatePersonRequest(
    val fullName: String,
    val email: String? = null,
    val department: String? = null,
    val jobTitle: String? = null,
    val locationId: UUID? = null
)

data class PersonSearchResult(
    val id: UUID,
    val fullName: String
)

data class PersonHistoryChangeDto(
    val fieldName: String,
    val oldValue: String?,
    val newValue: String?
)

data class PersonHistoryDto(
    val id: UUID,
    val eventType: String,
    val details: String?,
    val timestamp: Instant,
    val performedByUserName: String?,
    val changes: List<PersonHistoryChangeDto>
)

data class AssignedAssetDto(
    val id: UUID,
    val name: String,
    val serialNumber: String?,
    val status: String,
    val assetTypeName: String,
    val locationName: String?
)

data class PersonSummaryDto(
    val assetCount: Int,
    val certificateCount: Int,
    val applicationCount: Int
)

data class AssignedCertificateDto(
    val id: UUID,
    val name: String,
    val certificateTypeName: String,
    val status: String,
    val expiryDate: Instant?
)

data class AssignedApplicationDto(
    val id: UUID,
    val name: String,
    val applicationTypeName: String,
    val status: String,
    val licenceType: String?,
    val expiryDate: Instant?
)
