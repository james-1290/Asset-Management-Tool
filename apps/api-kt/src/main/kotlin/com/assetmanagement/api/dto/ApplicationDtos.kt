package com.assetmanagement.api.dto

import jakarta.validation.constraints.NotBlank
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.*

data class ApplicationDto(
    val id: UUID,
    val name: String,
    val applicationTypeId: UUID,
    val applicationTypeName: String,
    val publisher: String?,
    val version: String?,
    val licenceKey: String?,
    val licenceType: String?,
    val maxSeats: Int?,
    val usedSeats: Int?,
    val purchaseDate: LocalDate?,
    val expiryDate: LocalDate?,
    val purchaseCost: BigDecimal?,
    val autoRenewal: Boolean,
    val status: String,
    val deactivatedDate: LocalDate?,
    val notes: String?,
    val assetId: UUID?,
    val assetName: String?,
    val personId: UUID?,
    val personName: String?,
    val locationId: UUID?,
    val locationName: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val entityVersion: Long,
    val customFieldValues: List<CustomFieldValueDto>
)

data class CreateApplicationRequest(
    @field:NotBlank(message = "Name is required")
    val name: String,
    val applicationTypeId: UUID,
    val publisher: String? = null,
    val version: String? = null,
    val licenceKey: String? = null,
    val licenceType: String? = null,
    val maxSeats: Int? = null,
    val usedSeats: Int? = null,
    val purchaseDate: LocalDate? = null,
    val expiryDate: LocalDate? = null,
    val purchaseCost: BigDecimal? = null,
    val autoRenewal: Boolean = false,
    val status: String? = null,
    val notes: String? = null,
    val assetId: UUID? = null,
    val personId: UUID? = null,
    val locationId: UUID? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class UpdateApplicationRequest(
    val entityVersion: Long? = null,
    val name: String,
    val applicationTypeId: UUID,
    val publisher: String? = null,
    val version: String? = null,
    val licenceKey: String? = null,
    val licenceType: String? = null,
    val maxSeats: Int? = null,
    val usedSeats: Int? = null,
    val purchaseDate: LocalDate? = null,
    val expiryDate: LocalDate? = null,
    val purchaseCost: BigDecimal? = null,
    val autoRenewal: Boolean = false,
    val status: String? = null,
    val notes: String? = null,
    val assetId: UUID? = null,
    val personId: UUID? = null,
    val locationId: UUID? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class DeactivateApplicationRequest(
    val notes: String? = null,
    val deactivatedDate: LocalDate? = null
)

data class ReactivateApplicationRequest(
    val notes: String? = null
)

data class RenewApplicationRequest(
    val newExpiryDate: LocalDate,
    val notes: String? = null
)

data class SeatAssignmentDto(
    val id: UUID,
    val personId: UUID,
    val personName: String,
    val assignedAt: Instant,
    val assignedByName: String?,
    val notes: String?
)

data class AssignSeatRequest(
    val personId: UUID,
    val notes: String? = null
)

data class ApplicationHistoryChangeDto(
    val fieldName: String,
    val oldValue: String?,
    val newValue: String?
)

data class ApplicationHistoryDto(
    val id: UUID,
    val eventType: String,
    val details: String?,
    val timestamp: Instant,
    val performedByUserName: String?,
    val changes: List<ApplicationHistoryChangeDto>
)
