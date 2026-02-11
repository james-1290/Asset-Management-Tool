package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class CertificateTypeDto(
    val id: UUID,
    val name: String,
    val description: String?,
    val isArchived: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
    val customFields: List<CustomFieldDefinitionDto>
)

data class CreateCertificateTypeRequest(
    val name: String,
    val description: String? = null,
    val customFields: List<CustomFieldDefinitionInput>? = null
)

data class UpdateCertificateTypeRequest(
    val name: String,
    val description: String? = null,
    val customFields: List<CustomFieldDefinitionInput>? = null
)
