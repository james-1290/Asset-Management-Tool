package com.assetmanagement.api.repository

import com.assetmanagement.api.model.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByUsername(username: String): User?
    fun findByEmail(email: String): User?
    fun existsByUsername(username: String): Boolean
    fun existsByEmail(email: String): Boolean
}

@Repository
interface RoleRepository : JpaRepository<Role, UUID> {
    fun findByName(name: String): Role?
    fun existsByName(name: String): Boolean
}

@Repository
interface PermissionRepository : JpaRepository<Permission, UUID>

@Repository
interface UserRoleRepository : JpaRepository<UserRole, UserRoleId> {
    fun findByUserId(userId: UUID): List<UserRole>
    fun deleteByUserIdAndRoleId(userId: UUID, roleId: UUID)
}

@Repository
interface RolePermissionRepository : JpaRepository<RolePermission, RolePermissionId>

@Repository
interface LocationRepository : JpaRepository<Location, UUID>, JpaSpecificationExecutor<Location>

@Repository
interface PersonRepository : JpaRepository<Person, UUID>, JpaSpecificationExecutor<Person> {
    @Query("SELECT p FROM Person p WHERE p.isArchived = false AND LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun search(query: String, pageable: Pageable): List<Person>
}

@Repository
interface AssetTypeRepository : JpaRepository<AssetType, UUID>, JpaSpecificationExecutor<AssetType>

@Repository
interface AssetRepository : JpaRepository<Asset, UUID>, JpaSpecificationExecutor<Asset> {
    fun findByAssetTag(assetTag: String): Asset?
    fun existsByAssetTag(assetTag: String): Boolean
    fun countByIsArchivedFalse(): Long
}

@Repository
interface AssetHistoryRepository : JpaRepository<AssetHistory, UUID> {
    fun findByAssetIdOrderByTimestampDesc(assetId: UUID, pageable: Pageable): List<AssetHistory>
    fun findByAssetIdOrderByTimestampDesc(assetId: UUID): List<AssetHistory>
}

@Repository
interface AssetHistoryChangeRepository : JpaRepository<AssetHistoryChange, UUID>

@Repository
interface CertificateTypeRepository : JpaRepository<CertificateType, UUID>, JpaSpecificationExecutor<CertificateType>

@Repository
interface CertificateRepository : JpaRepository<Certificate, UUID>, JpaSpecificationExecutor<Certificate> {
    fun countByIsArchivedFalse(): Long
}

@Repository
interface CertificateHistoryRepository : JpaRepository<CertificateHistory, UUID> {
    fun findByCertificateIdOrderByTimestampDesc(certificateId: UUID, pageable: Pageable): List<CertificateHistory>
    fun findByCertificateIdOrderByTimestampDesc(certificateId: UUID): List<CertificateHistory>
}

@Repository
interface CertificateHistoryChangeRepository : JpaRepository<CertificateHistoryChange, UUID>

@Repository
interface ApplicationTypeRepository : JpaRepository<ApplicationType, UUID>, JpaSpecificationExecutor<ApplicationType>

@Repository
interface ApplicationRepository : JpaRepository<Application, UUID>, JpaSpecificationExecutor<Application> {
    fun countByIsArchivedFalse(): Long
}

@Repository
interface ApplicationHistoryRepository : JpaRepository<ApplicationHistory, UUID> {
    fun findByApplicationIdOrderByTimestampDesc(applicationId: UUID, pageable: Pageable): List<ApplicationHistory>
    fun findByApplicationIdOrderByTimestampDesc(applicationId: UUID): List<ApplicationHistory>
}

@Repository
interface ApplicationHistoryChangeRepository : JpaRepository<ApplicationHistoryChange, UUID>

@Repository
interface PersonHistoryRepository : JpaRepository<PersonHistory, UUID> {
    fun findByPersonIdOrderByTimestampDesc(personId: UUID, pageable: Pageable): List<PersonHistory>
    fun findByPersonIdOrderByTimestampDesc(personId: UUID): List<PersonHistory>
}

@Repository
interface PersonHistoryChangeRepository : JpaRepository<PersonHistoryChange, UUID>

@Repository
interface CustomFieldDefinitionRepository : JpaRepository<CustomFieldDefinition, UUID> {
    fun findByAssetTypeIdAndIsArchivedFalse(assetTypeId: UUID): List<CustomFieldDefinition>
    fun findByCertificateTypeIdAndIsArchivedFalse(certificateTypeId: UUID): List<CustomFieldDefinition>
    fun findByApplicationTypeIdAndIsArchivedFalse(applicationTypeId: UUID): List<CustomFieldDefinition>
}

@Repository
interface CustomFieldValueRepository : JpaRepository<CustomFieldValue, UUID> {
    fun findByEntityId(entityId: UUID): List<CustomFieldValue>
    fun findByEntityIdIn(entityIds: List<UUID>): List<CustomFieldValue>
    fun deleteByEntityId(entityId: UUID)
}

@Repository
interface AuditLogRepository : JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog>

@Repository
interface SavedViewRepository : JpaRepository<SavedView, UUID> {
    fun findByUserId(userId: UUID): List<SavedView>
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
}
