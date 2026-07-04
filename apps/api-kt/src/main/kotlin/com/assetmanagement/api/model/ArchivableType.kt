package com.assetmanagement.api.model

import java.time.Instant
import java.util.UUID

/**
 * Common surface of the entity-type models (AssetType / CertificateType /
 * ApplicationType) consumed by the generic archivable-type controller.
 */
interface ArchivableType {
    val id: UUID
    var name: String
    var isArchived: Boolean
    var updatedAt: Instant
    val customFieldDefinitions: MutableList<CustomFieldDefinition>
}
