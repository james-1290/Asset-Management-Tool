package com.assetmanagement.api.service

import com.assetmanagement.api.model.*
import com.assetmanagement.api.model.enums.*
import com.assetmanagement.api.repository.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

data class AuditChange(
    val fieldName: String,
    val oldValue: String?,
    val newValue: String?
)

data class AuditEntry(
    val action: String,
    val entityType: String,
    val entityId: String,
    val entityName: String? = null,
    val details: String? = null,
    val actorId: UUID? = null,
    val actorName: String = "System",
    val changes: List<AuditChange>? = null
)

@Service
class AuditService(
    private val auditLogRepository: AuditLogRepository,
    private val assetHistoryRepository: AssetHistoryRepository,
    private val personHistoryRepository: PersonHistoryRepository,
    private val certificateHistoryRepository: CertificateHistoryRepository,
    private val applicationHistoryRepository: ApplicationHistoryRepository
) {

    @Transactional
    fun log(entry: AuditEntry) {
        val auditLog = AuditLog(
            actorId = entry.actorId,
            actorName = entry.actorName,
            action = entry.action,
            entityType = entry.entityType,
            entityId = entry.entityId,
            entityName = entry.entityName,
            source = AuditSource.API,
            details = entry.details
        )
        auditLogRepository.save(auditLog)

        when (entry.entityType) {
            "Asset" -> logAssetHistory(entry)
            "Person" -> logPersonHistory(entry)
            "Certificate" -> logCertificateHistory(entry)
            "Application" -> logApplicationHistory(entry)
        }
    }

    private fun logAssetHistory(entry: AuditEntry) {
        val assetId = try { UUID.fromString(entry.entityId) } catch (_: Exception) { return }
        val eventType = when (entry.action) {
            "Created" -> AssetHistoryEventType.Created
            "Updated" -> AssetHistoryEventType.Edited
            "Archived" -> AssetHistoryEventType.Archived
            "CheckedOut" -> AssetHistoryEventType.CheckedOut
            "CheckedIn" -> AssetHistoryEventType.CheckedIn
            "Retired" -> AssetHistoryEventType.Retired
            "Sold" -> AssetHistoryEventType.Sold
            else -> return
        }
        val history = AssetHistory(
            assetId = assetId,
            eventType = eventType,
            performedByUserId = entry.actorId,
            details = entry.details
        )
        entry.changes?.forEach { change ->
            val historyChange = AssetHistoryChange(
                assetHistoryId = history.id,
                fieldName = change.fieldName,
                oldValue = change.oldValue,
                newValue = change.newValue
            )
            history.changes.add(historyChange)
        }
        assetHistoryRepository.save(history)
    }

    private fun logPersonHistory(entry: AuditEntry) {
        val personId = try { UUID.fromString(entry.entityId) } catch (_: Exception) { return }
        val eventType = when (entry.action) {
            "Created" -> PersonHistoryEventType.Created
            "Updated" -> PersonHistoryEventType.Edited
            "Archived" -> PersonHistoryEventType.Archived
            "Restored" -> PersonHistoryEventType.Restored
            "AssetAssigned" -> PersonHistoryEventType.AssetAssigned
            "AssetUnassigned" -> PersonHistoryEventType.AssetUnassigned
            "AssetCheckedOut" -> PersonHistoryEventType.AssetCheckedOut
            "AssetCheckedIn" -> PersonHistoryEventType.AssetCheckedIn
            else -> return
        }
        val history = PersonHistory(
            personId = personId,
            eventType = eventType,
            performedByUserId = entry.actorId,
            details = entry.details
        )
        entry.changes?.forEach { change ->
            val historyChange = PersonHistoryChange(
                personHistoryId = history.id,
                fieldName = change.fieldName,
                oldValue = change.oldValue,
                newValue = change.newValue
            )
            history.changes.add(historyChange)
        }
        personHistoryRepository.save(history)
    }

    private fun logCertificateHistory(entry: AuditEntry) {
        val certificateId = try { UUID.fromString(entry.entityId) } catch (_: Exception) { return }
        val eventType = when (entry.action) {
            "Created" -> CertificateHistoryEventType.Created
            "Updated" -> CertificateHistoryEventType.Edited
            "Archived" -> CertificateHistoryEventType.Archived
            "Renewed" -> CertificateHistoryEventType.Renewed
            "Revoked" -> CertificateHistoryEventType.Revoked
            else -> return
        }
        val history = CertificateHistory(
            certificateId = certificateId,
            eventType = eventType,
            performedByUserId = entry.actorId,
            details = entry.details
        )
        entry.changes?.forEach { change ->
            val historyChange = CertificateHistoryChange(
                certificateHistoryId = history.id,
                fieldName = change.fieldName,
                oldValue = change.oldValue,
                newValue = change.newValue
            )
            history.changes.add(historyChange)
        }
        certificateHistoryRepository.save(history)
    }

    private fun logApplicationHistory(entry: AuditEntry) {
        val applicationId = try { UUID.fromString(entry.entityId) } catch (_: Exception) { return }
        val eventType = when (entry.action) {
            "Created" -> ApplicationHistoryEventType.Created
            "Updated" -> ApplicationHistoryEventType.Edited
            "Archived" -> ApplicationHistoryEventType.Archived
            "Renewed" -> ApplicationHistoryEventType.Renewed
            "Suspended" -> ApplicationHistoryEventType.Suspended
            else -> return
        }
        val history = ApplicationHistory(
            applicationId = applicationId,
            eventType = eventType,
            performedByUserId = entry.actorId,
            details = entry.details
        )
        entry.changes?.forEach { change ->
            val historyChange = ApplicationHistoryChange(
                applicationHistoryId = history.id,
                fieldName = change.fieldName,
                oldValue = change.oldValue,
                newValue = change.newValue
            )
            history.changes.add(historyChange)
        }
        applicationHistoryRepository.save(history)
    }
}
