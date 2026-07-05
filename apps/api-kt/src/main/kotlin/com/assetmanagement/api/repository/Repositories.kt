package com.assetmanagement.api.repository

import com.assetmanagement.api.model.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByUsername(username: String): User?
    fun findByEmail(email: String): User?
    fun existsByUsername(username: String): Boolean
    fun existsByEmail(email: String): Boolean
    fun findByExternalId(externalId: String): User?
    fun findByIsActiveTrue(): List<User>

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.userRoles ur LEFT JOIN FETCH ur.role WHERE u.id = :id")
    fun findWithRolesById(@Param("id") id: UUID): User?
}

@Repository
interface RoleRepository : JpaRepository<Role, UUID> {
    fun findByName(name: String): Role?
}

@Repository
interface UserRoleRepository : JpaRepository<UserRole, UserRoleId> {
    fun findByUserId(userId: UUID): List<UserRole>
    @Modifying
    fun deleteByUserIdAndRoleId(userId: UUID, roleId: UUID)
}

@Repository
interface LocationRepository : JpaRepository<Location, UUID>, JpaSpecificationExecutor<Location>

@Repository
interface PersonRepository : JpaRepository<Person, UUID>, JpaSpecificationExecutor<Person> {
    @Query("SELECT p FROM Person p WHERE p.isArchived = false AND LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(query: String, pageable: Pageable): List<Person>
    fun countByLocationIdAndIsArchivedFalse(locationId: UUID): Long
    fun findByEmailIgnoreCaseAndIsArchivedFalse(email: String): Person?
}

/** Base for the entity-type repositories consumed by the generic archivable-type controller. */
@org.springframework.data.repository.NoRepositoryBean
interface ArchivableTypeRepository<E> : JpaRepository<E, UUID>, JpaSpecificationExecutor<E>

@Repository
interface AssetTypeRepository : ArchivableTypeRepository<AssetType>

@Repository
interface AssetModelRepository : JpaRepository<AssetModel, UUID>, JpaSpecificationExecutor<AssetModel> {
    fun countByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): Long
}

@Repository
interface AssetRepository : JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {
    fun countByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): Long
    fun countByLocationIdAndIsArchivedFalse(locationId: UUID): Long
    fun countByAssetModelIdAndIsArchivedFalse(assetModelId: UUID): Long
}

@Repository
interface AssetHistoryRepository : JpaRepository<AssetHistory, UUID> {
    fun findByAssetIdOrderByTimestampDesc(assetId: UUID, pageable: Pageable): List<AssetHistory>
    fun findByAssetIdOrderByTimestampDesc(assetId: UUID): List<AssetHistory>
}

@Repository
interface CertificateTypeRepository : ArchivableTypeRepository<CertificateType>

@Repository
interface CertificateRepository : JpaRepository<Certificate, UUID>, JpaSpecificationExecutor<Certificate> {
    fun countByCertificateTypeIdAndIsArchivedFalse(certificateTypeId: UUID): Long
    fun countByLocationIdAndIsArchivedFalse(locationId: UUID): Long
}

@Repository
interface CertificateHistoryRepository : JpaRepository<CertificateHistory, UUID> {
    fun findByCertificateIdOrderByTimestampDesc(certificateId: UUID, pageable: Pageable): List<CertificateHistory>
    fun findByCertificateIdOrderByTimestampDesc(certificateId: UUID): List<CertificateHistory>
}

@Repository
interface ApplicationTypeRepository : ArchivableTypeRepository<ApplicationType>

@Repository
interface ApplicationRepository : JpaRepository<Application, UUID>, JpaSpecificationExecutor<Application> {
    fun countByApplicationTypeIdAndIsArchivedFalse(applicationTypeId: UUID): Long
    fun countByLocationIdAndIsArchivedFalse(locationId: UUID): Long
}

@Repository
interface ApplicationHistoryRepository : JpaRepository<ApplicationHistory, UUID> {
    fun findByApplicationIdOrderByTimestampDesc(applicationId: UUID, pageable: Pageable): List<ApplicationHistory>
    fun findByApplicationIdOrderByTimestampDesc(applicationId: UUID): List<ApplicationHistory>
}

@Repository
interface PersonHistoryRepository : JpaRepository<PersonHistory, UUID> {
    fun findByPersonIdOrderByTimestampDesc(personId: UUID, pageable: Pageable): List<PersonHistory>
    fun findByPersonIdOrderByTimestampDesc(personId: UUID): List<PersonHistory>
}

@Repository
interface CustomFieldDefinitionRepository : JpaRepository<CustomFieldDefinition, UUID> {
    fun findByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): List<CustomFieldDefinition>
    fun findByCertificateTypeIdAndIsArchivedFalse(certificateTypeId: UUID): List<CustomFieldDefinition>
    fun findByApplicationTypeIdAndIsArchivedFalse(applicationTypeId: UUID): List<CustomFieldDefinition>
}

@Repository
interface CustomFieldValueRepository : JpaRepository<CustomFieldValue, UUID> {
    // Fetch-join the (LAZY, to-one) definition — list DTOs read its name/type per
    // value, so batch-loading the values alone would still N+1 on the definition.
    @Query("SELECT v FROM CustomFieldValue v LEFT JOIN FETCH v.customFieldDefinition WHERE v.entityId = :entityId")
    fun findByEntityId(entityId: UUID): List<CustomFieldValue>

    @Query("SELECT v FROM CustomFieldValue v LEFT JOIN FETCH v.customFieldDefinition WHERE v.entityId IN :entityIds")
    fun findByEntityIdIn(entityIds: List<UUID>): List<CustomFieldValue>

    @Modifying
    fun deleteByEntityId(entityId: UUID)
    fun findByCustomFieldDefinitionId(customFieldDefinitionId: UUID): List<CustomFieldValue>
}

@Repository
interface AuditLogRepository : JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog>

@Repository
interface SavedViewRepository : JpaRepository<SavedView, UUID> {
    fun findByUserIdAndEntityType(userId: UUID, entityType: String): List<SavedView>
    fun findByUserIdAndEntityTypeAndIsDefaultTrue(userId: UUID, entityType: String): SavedView?
}

@Repository
interface SystemSettingRepository : JpaRepository<SystemSetting, String> {
    fun findByKey(key: String): SystemSetting?
}

@Repository
interface AlertHistoryRepository : JpaRepository<AlertHistory, UUID> {
    fun existsByEntityTypeAndEntityIdAndThresholdDays(entityType: String, entityId: UUID, thresholdDays: Int): Boolean
    fun findAllByOrderBySentAtDesc(pageable: Pageable): Page<AlertHistory>

    @Modifying
    @Transactional
    @Query("DELETE FROM AlertHistory a WHERE a.entityType = :entityType AND a.entityId = :entityId")
    fun deleteByEntityTypeAndEntityId(@Param("entityType") entityType: String, @Param("entityId") entityId: UUID): Int
}

@Repository
interface AssetTemplateRepository : JpaRepository<AssetTemplate, UUID> {
    fun findByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): List<AssetTemplate>
    fun findByIsArchivedFalse(): List<AssetTemplate>
}

@Repository
interface UserNotificationRepository : JpaRepository<UserNotification, UUID>, JpaSpecificationExecutor<UserNotification> {
    fun countByUserIdAndIsReadFalseAndIsDismissedFalse(userId: UUID): Long
    fun existsByEntityTypeAndEntityIdAndUserIdAndThresholdDays(entityType: String, entityId: UUID, userId: UUID, thresholdDays: Int): Boolean

    @Modifying
    @Transactional
    @Query("DELETE FROM UserNotification n WHERE n.createdAt < :cutoff")
    fun deleteByCreatedAtBefore(@Param("cutoff") cutoff: Instant): Int

    @Modifying
    @Transactional
    @Query("DELETE FROM UserNotification n WHERE n.entityType = :entityType AND n.entityId = :entityId")
    fun deleteByEntityTypeAndEntityId(@Param("entityType") entityType: String, @Param("entityId") entityId: UUID): Int
}

@Repository
interface UserAlertRuleRepository : JpaRepository<UserAlertRule, UUID> {
    fun findByUserIdOrderByCreatedAtDesc(userId: UUID): List<UserAlertRule>
    fun findByIsActiveTrue(): List<UserAlertRule>
}

@Repository
interface AttachmentRepository : JpaRepository<Attachment, UUID> {
    fun findByEntityTypeAndEntityIdAndIsArchivedFalseOrderByCreatedAtDesc(entityType: String, entityId: UUID): List<Attachment>
}

@Repository
interface ApplicationSeatAssignmentRepository : JpaRepository<ApplicationSeatAssignment, UUID> {
    fun findByApplicationIdOrderByAssignedAtDesc(applicationId: UUID): List<ApplicationSeatAssignment>
    fun countByApplicationId(applicationId: UUID): Long
    fun existsByApplicationIdAndPersonId(applicationId: UUID, personId: UUID): Boolean
    fun findByPersonId(personId: UUID): List<ApplicationSeatAssignment>

    @Modifying
    @Transactional
    @Query("DELETE FROM ApplicationSeatAssignment s WHERE s.applicationId = :applicationId AND s.personId = :personId")
    fun deleteByApplicationIdAndPersonId(@Param("applicationId") applicationId: UUID, @Param("personId") personId: UUID): Int
}
