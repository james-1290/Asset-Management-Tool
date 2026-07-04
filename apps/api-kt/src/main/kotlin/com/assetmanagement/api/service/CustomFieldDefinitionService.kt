package com.assetmanagement.api.service

import com.assetmanagement.api.dto.CustomFieldDefinitionInput
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.enums.CustomFieldType
import com.assetmanagement.api.repository.CustomFieldDefinitionRepository
import com.assetmanagement.api.repository.CustomFieldValueRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

/**
 * Shared create/update handling for a type's custom-field *definitions*
 * (asset/certificate/application types). Callers supply a [build] factory that
 * stamps the correct entity type + FK column onto a new definition.
 */
@Service
class CustomFieldDefinitionService(
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val customFieldValueRepository: CustomFieldValueRepository,
) {
    private fun parseFieldType(raw: String): CustomFieldType =
        runCatching { CustomFieldType.valueOf(raw) }.getOrNull()
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid field type: $raw")

    /** Persist each incoming definition for a freshly-created type. Throws 400 on
     *  an invalid field type (rolling back the surrounding transaction). */
    fun createDefinitions(
        inputs: List<CustomFieldDefinitionInput>?,
        build: (CustomFieldType, CustomFieldDefinitionInput) -> CustomFieldDefinition,
    ) {
        inputs?.forEach { input ->
            customFieldDefinitionRepository.save(build(parseFieldType(input.fieldType), input))
        }
    }

    /**
     * Reconcile a type's [definitions] collection against the [inputs]:
     * archive definitions no longer present (hard-deleting their orphaned values),
     * update those matched by id in place, and add brand-new ones via [build].
     * A null [inputs] leaves the definitions untouched.
     */
    fun syncDefinitions(
        definitions: MutableList<CustomFieldDefinition>,
        inputs: List<CustomFieldDefinitionInput>?,
        build: (CustomFieldType, CustomFieldDefinitionInput) -> CustomFieldDefinition,
    ) {
        if (inputs == null) return
        val existing = definitions.filter { !it.isArchived }
        val requestIds = inputs.mapNotNull { it.id }.toSet()
        existing.forEach { def ->
            if (def.id !in requestIds) {
                def.isArchived = true
                customFieldValueRepository.deleteAll(
                    customFieldValueRepository.findByCustomFieldDefinitionId(def.id),
                )
            }
        }
        inputs.forEach { field ->
            val fieldType = parseFieldType(field.fieldType)
            if (field.id != null) {
                existing.find { it.id == field.id }?.apply {
                    name = field.name
                    this.fieldType = fieldType
                    options = field.options
                    isRequired = field.isRequired
                    sortOrder = field.sortOrder
                }
            } else {
                definitions.add(build(fieldType, field))
            }
        }
    }
}
