package com.assetmanagement.api.dto

import java.util.*

data class CustomFieldDefinitionDto(
    val id: UUID,
    val name: String,
    val fieldType: String,
    val options: String?,
    val isRequired: Boolean,
    val sortOrder: Int
)

data class CustomFieldDefinitionInput(
    val id: UUID? = null,
    val name: String,
    val fieldType: String,
    val options: String? = null,
    val isRequired: Boolean = false,
    val sortOrder: Int = 0
)

data class CustomFieldValueDto(
    val fieldDefinitionId: UUID,
    val fieldName: String,
    val fieldType: String,
    val value: String?
)

data class CustomFieldValueInput(
    val fieldDefinitionId: UUID,
    val value: String? = null
)
