package com.assetmanagement.api.service

import com.assetmanagement.api.dto.CustomFieldValueInput
import com.assetmanagement.api.model.CustomFieldDefinition
import com.assetmanagement.api.model.CustomFieldValue
import com.assetmanagement.api.repository.CustomFieldValueRepository
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

/**
 * Shared upsert of custom-field *values* for an entity (asset / certificate /
 * application / asset-template), replacing four hand-rolled copies.
 *
 * Callers pass the type's non-archived [validDefs]; inputs whose def id isn't
 * valid are routed to [onInvalid] (default: skipped — callers that want a 400
 * throw from there). [track], if supplied, is invoked for each value actually
 * written so the caller can record audit changes (with an `isNew` flag so it can
 * apply its own "record only non-empty new values" rule).
 */
@Service
class CustomFieldValueService(
    private val customFieldValueRepository: CustomFieldValueRepository,
) {
    fun interface ValueChangeTracker {
        fun onChange(fieldName: String, oldValue: String?, newValue: String?, isNew: Boolean)
    }

    fun upsert(
        entityId: UUID,
        validDefs: List<CustomFieldDefinition>,
        inputs: List<CustomFieldValueInput>?,
        onInvalid: (UUID) -> Unit = {},
        track: ValueChangeTracker? = null,
    ) {
        if (inputs.isNullOrEmpty()) return
        val defNamesById = validDefs.associate { it.id to it.name }
        val existing = customFieldValueRepository.findByEntityId(entityId)
            .associateBy { it.customFieldDefinitionId }

        for (input in inputs) {
            if (input.fieldDefinitionId !in defNamesById.keys) {
                onInvalid(input.fieldDefinitionId)
                continue
            }
            val name = defNamesById[input.fieldDefinitionId] ?: "Unknown"
            val current = existing[input.fieldDefinitionId]
            if (current != null) {
                if (current.value != input.value) {
                    val old = current.value
                    current.value = input.value
                    current.updatedAt = Instant.now()
                    customFieldValueRepository.save(current)
                    track?.onChange(name, old, input.value, false)
                }
            } else {
                customFieldValueRepository.save(
                    CustomFieldValue(
                        customFieldDefinitionId = input.fieldDefinitionId,
                        entityId = entityId,
                        value = input.value,
                    ),
                )
                track?.onChange(name, null, input.value, true)
            }
        }
    }
}
