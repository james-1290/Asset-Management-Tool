package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class CertificateDto(
    val id: UUID,
    val name: String,
    val certificateTypeId: UUID,
    val certificateTypeName: String,
    val issuer: String?,
    val subject: String?,
    val thumbprint: String?,
    val serialNumber: String?,
    val issuedDate: Instant?,
    val expiryDate: Instant?,
    val status: String,
    val autoRenewal: Boolean,
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
    val customFieldValues: List<CustomFieldValueDto>
)

data class CreateCertificateRequest(
    val name: String,
    val certificateTypeId: UUID,
    val issuer: String? = null,
    val subject: String? = null,
    val thumbprint: String? = null,
    val serialNumber: String? = null,
    val issuedDate: Instant? = null,
    val expiryDate: Instant? = null,
    val status: String? = null,
    val autoRenewal: Boolean = false,
    val notes: String? = null,
    val assetId: UUID? = null,
    val personId: UUID? = null,
    val locationId: UUID? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class UpdateCertificateRequest(
    val name: String,
    val certificateTypeId: UUID,
    val issuer: String? = null,
    val subject: String? = null,
    val thumbprint: String? = null,
    val serialNumber: String? = null,
    val issuedDate: Instant? = null,
    val expiryDate: Instant? = null,
    val status: String? = null,
    val autoRenewal: Boolean = false,
    val notes: String? = null,
    val assetId: UUID? = null,
    val personId: UUID? = null,
    val locationId: UUID? = null,
    val customFieldValues: List<CustomFieldValueInput>? = null
)

data class CertificateHistoryChangeDto(
    val fieldName: String,
    val oldValue: String?,
    val newValue: String?
)

data class CertificateHistoryDto(
    val id: UUID,
    val eventType: String,
    val details: String?,
    val timestamp: Instant,
    val performedByUserName: String?,
    val changes: List<CertificateHistoryChangeDto>
)
