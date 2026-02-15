package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.Certificate
import com.assetmanagement.api.util.CsvUtils
import com.assetmanagement.api.model.CustomFieldValue
import com.assetmanagement.api.model.enums.CertificateStatus
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.AuditChange
import com.assetmanagement.api.service.AuditEntry
import com.assetmanagement.api.service.AuditService
import com.assetmanagement.api.service.CurrentUserService
import com.opencsv.CSVWriter
import jakarta.persistence.criteria.Predicate
import jakarta.servlet.http.HttpServletResponse
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.io.OutputStreamWriter
import java.net.URI
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.*

@RestController
@RequestMapping("/api/v1/certificates")
class CertificatesController(
    private val certificateRepository: CertificateRepository,
    private val certificateTypeRepository: CertificateTypeRepository,
    private val certificateHistoryRepository: CertificateHistoryRepository,
    private val assetRepository: AssetRepository,
    private val personRepository: PersonRepository,
    private val locationRepository: LocationRepository,
    private val customFieldValueRepository: CustomFieldValueRepository,
    private val customFieldDefinitionRepository: CustomFieldDefinitionRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)

    // ── Helpers ──────────────────────────────────────────────────────────

    private fun buildSpec(search: String?, status: String?, typeId: UUID?, expiryFrom: String? = null, expiryTo: String? = null): Specification<Certificate> =
        Specification { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

            if (!search.isNullOrBlank()) {
                val pattern = "%${search.lowercase()}%"
                predicates.add(
                    cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("issuer")), pattern),
                        cb.like(cb.lower(root.get("subject")), pattern),
                        cb.like(cb.lower(root.get("serialNumber")), pattern),
                        cb.like(cb.lower(root.get("thumbprint")), pattern)
                    )
                )
            }

            if (!status.isNullOrBlank()) {
                val certStatus = try {
                    CertificateStatus.valueOf(status)
                } catch (_: Exception) {
                    null
                }
                if (certStatus != null) {
                    predicates.add(cb.equal(root.get<CertificateStatus>("status"), certStatus))
                }
            }

            if (typeId != null) {
                predicates.add(cb.equal(root.get<UUID>("certificateTypeId"), typeId))
            }

            if (!expiryFrom.isNullOrBlank()) {
                val from = Instant.parse("${expiryFrom}T00:00:00Z")
                predicates.add(cb.greaterThanOrEqualTo(root.get("expiryDate"), from))
            }
            if (!expiryTo.isNullOrBlank()) {
                val to = Instant.parse("${expiryTo}T23:59:59Z")
                predicates.add(cb.lessThanOrEqualTo(root.get("expiryDate"), to))
            }

            cb.and(*predicates.toTypedArray())
        }

    private fun sortOf(sortBy: String, sortDir: String): Sort {
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val prop = when (sortBy.lowercase()) {
            "issuer" -> "issuer"
            "subject" -> "subject"
            "status" -> "status"
            "issueddate" -> "issuedDate"
            "expirydate" -> "expiryDate"
            "autorenewal" -> "autoRenewal"
            "createdat" -> "createdAt"
            "updatedat" -> "updatedAt"
            "certificatetypename" -> "certificateType.name"
            else -> "name"
        }
        return Sort.by(dir, prop)
    }

    private fun Certificate.toDto(cfValues: List<CustomFieldValueDto> = emptyList()) = CertificateDto(
        id = id,
        name = name,
        certificateTypeId = certificateTypeId,
        certificateTypeName = certificateType?.name ?: "",
        issuer = issuer,
        subject = subject,
        thumbprint = thumbprint,
        serialNumber = serialNumber,
        issuedDate = issuedDate,
        expiryDate = expiryDate,
        status = status.name,
        autoRenewal = autoRenewal,
        notes = notes,
        assetId = assetId,
        assetName = asset?.name,
        personId = personId,
        personName = person?.fullName,
        locationId = locationId,
        locationName = location?.name,
        isArchived = isArchived,
        createdAt = createdAt,
        updatedAt = updatedAt,
        customFieldValues = cfValues
    )

    private fun buildCustomFieldValueDtos(entityId: UUID): List<CustomFieldValueDto> {
        val values = customFieldValueRepository.findByEntityId(entityId)
        return values.mapNotNull { cfv ->
            val def = cfv.customFieldDefinition
            if (def != null) {
                CustomFieldValueDto(def.id, def.name, def.fieldType.name, cfv.value)
            } else {
                null
            }
        }
    }

    private fun buildCustomFieldValueDtosForEntities(entityIds: List<UUID>): Map<UUID, List<CustomFieldValueDto>> {
        if (entityIds.isEmpty()) return emptyMap()
        val allValues = customFieldValueRepository.findByEntityIdIn(entityIds)
        return allValues.groupBy { it.entityId }.mapValues { (_, values) ->
            values.mapNotNull { cfv ->
                val def = cfv.customFieldDefinition
                if (def != null) {
                    CustomFieldValueDto(def.id, def.name, def.fieldType.name, cfv.value)
                } else {
                    null
                }
            }
        }
    }

    private fun upsertCustomFieldValues(entityId: UUID, certificateTypeId: UUID, inputs: List<CustomFieldValueInput>?) {
        if (inputs.isNullOrEmpty()) return
        val validDefs = customFieldDefinitionRepository.findByCertificateTypeIdAndIsArchivedFalse(certificateTypeId)
        val validDefIds = validDefs.map { it.id }.toSet()
        val existing = customFieldValueRepository.findByEntityId(entityId).associateBy { it.customFieldDefinitionId }

        inputs.filter { it.fieldDefinitionId in validDefIds }.forEach { input ->
            val cfv = existing[input.fieldDefinitionId]
            if (cfv != null) {
                cfv.value = input.value
                cfv.updatedAt = Instant.now()
                customFieldValueRepository.save(cfv)
            } else {
                customFieldValueRepository.save(
                    CustomFieldValue(
                        customFieldDefinitionId = input.fieldDefinitionId,
                        entityId = entityId,
                        value = input.value
                    )
                )
            }
        }
    }

    private fun trackString(field: String, oldVal: String?, newVal: String?, changes: MutableList<AuditChange>) {
        if (oldVal != newVal) changes.add(AuditChange(field, oldVal, newVal))
    }

    private fun trackDate(field: String, oldVal: Instant?, newVal: Instant?, changes: MutableList<AuditChange>) {
        if (oldVal != newVal) changes.add(AuditChange(field, oldVal?.toString(), newVal?.toString()))
    }

    private fun trackBool(field: String, oldVal: Boolean, newVal: Boolean, changes: MutableList<AuditChange>) {
        if (oldVal != newVal) changes.add(AuditChange(field, oldVal.toString(), newVal.toString()))
    }

    private fun validateForeignKeys(request: CreateCertificateRequest): String? {
        val certType = certificateTypeRepository.findById(request.certificateTypeId).orElse(null)
        if (certType == null || certType.isArchived) return "Invalid certificate type ID."

        if (request.assetId != null) {
            val asset = assetRepository.findById(request.assetId).orElse(null)
            if (asset == null || asset.isArchived) return "Invalid asset ID."
        }
        if (request.personId != null) {
            val person = personRepository.findById(request.personId).orElse(null)
            if (person == null || person.isArchived) return "Invalid person ID."
        }
        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived) return "Invalid location ID."
        }
        return null
    }

    private fun validateForeignKeys(request: UpdateCertificateRequest): String? {
        val certType = certificateTypeRepository.findById(request.certificateTypeId).orElse(null)
        if (certType == null || certType.isArchived) return "Invalid certificate type ID."

        if (request.assetId != null) {
            val asset = assetRepository.findById(request.assetId).orElse(null)
            if (asset == null || asset.isArchived) return "Invalid asset ID."
        }
        if (request.personId != null) {
            val person = personRepository.findById(request.personId).orElse(null)
            if (person == null || person.isArchived) return "Invalid person ID."
        }
        if (request.locationId != null) {
            val location = locationRepository.findById(request.locationId).orElse(null)
            if (location == null || location.isArchived) return "Invalid location ID."
        }
        return null
    }

    private fun parseStatus(statusStr: String?): CertificateStatus {
        if (statusStr.isNullOrBlank()) return CertificateStatus.Active
        return try {
            CertificateStatus.valueOf(statusStr)
        } catch (_: Exception) {
            CertificateStatus.Active
        }
    }

    // ── Endpoints ────────────────────────────────────────────────────────

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) typeId: UUID?,
        @RequestParam(required = false) expiryFrom: String?,
        @RequestParam(required = false) expiryTo: String?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<CertificateDto>> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)
        val spec = buildSpec(search, status, typeId, expiryFrom, expiryTo)
        val pageReq = PageRequest.of(p - 1, ps, sortOf(sortBy, sortDir))
        val result = certificateRepository.findAll(spec, pageReq)

        val entityIds = result.content.map { it.id }
        val cfMap = buildCustomFieldValueDtosForEntities(entityIds)

        val items = result.content.map { it.toDto(cfMap[it.id] ?: emptyList()) }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    @GetMapping("/export")
    fun export(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) typeId: UUID?,
        @RequestParam(required = false) expiryFrom: String?,
        @RequestParam(required = false) expiryTo: String?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @RequestParam(required = false) ids: String?,
        response: HttpServletResponse
    ) {
        response.contentType = "text/csv"
        response.setHeader("Content-Disposition", "attachment; filename=certificates-export.csv")

        val certificates = if (!ids.isNullOrBlank()) {
            val idList = ids.split(",").mapNotNull { runCatching { UUID.fromString(it.trim()) }.getOrNull() }
            certificateRepository.findAllById(idList).filter { !it.isArchived }
        } else {
            certificateRepository.findAll(buildSpec(search, status, typeId, expiryFrom, expiryTo), sortOf(sortBy, sortDir))
        }

        val writer = CSVWriter(OutputStreamWriter(response.outputStream))
        writer.writeNext(
            arrayOf(
                "Name", "CertificateType", "Status", "Issuer", "Subject",
                "IssuedDate", "ExpiryDate", "AutoRenewal", "Notes", "CreatedAt", "UpdatedAt"
            )
        )
        certificates.forEach { c ->
            writer.writeNext(CsvUtils.sanitizeRow(
                arrayOf(
                    c.name,
                    c.certificateType?.name ?: "",
                    c.status.name,
                    c.issuer ?: "",
                    c.subject ?: "",
                    c.issuedDate?.let { dateFormat.format(it) } ?: "",
                    c.expiryDate?.let { dateFormat.format(it) } ?: "",
                    c.autoRenewal.toString(),
                    c.notes ?: "",
                    dateFormat.format(c.createdAt),
                    dateFormat.format(c.updatedAt)
                )
            ))
        }
        writer.flush()
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<CertificateDto> {
        val certificate = certificateRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        val cfValues = buildCustomFieldValueDtos(certificate.id)
        return ResponseEntity.ok(certificate.toDto(cfValues))
    }

    @PostMapping
    fun create(@RequestBody request: CreateCertificateRequest): ResponseEntity<Any> {
        val validationError = validateForeignKeys(request)
        if (validationError != null) return ResponseEntity.badRequest().body(validationError)

        val certificate = Certificate(
            name = request.name,
            certificateTypeId = request.certificateTypeId,
            issuer = request.issuer,
            subject = request.subject,
            thumbprint = request.thumbprint,
            serialNumber = request.serialNumber,
            issuedDate = request.issuedDate,
            expiryDate = request.expiryDate,
            status = parseStatus(request.status),
            autoRenewal = request.autoRenewal,
            notes = request.notes,
            assetId = request.assetId,
            personId = request.personId,
            locationId = request.locationId
        )
        certificateRepository.save(certificate)

        upsertCustomFieldValues(certificate.id, certificate.certificateTypeId, request.customFieldValues)

        auditService.log(
            AuditEntry(
                "Created", "Certificate", certificate.id.toString(), certificate.name,
                "Created certificate \"${certificate.name}\"",
                currentUserService.userId, currentUserService.userName
            )
        )

        val saved = certificateRepository.findById(certificate.id).get()
        val cfValues = buildCustomFieldValueDtos(saved.id)
        return ResponseEntity.created(URI("/api/v1/certificates/${saved.id}")).body(saved.toDto(cfValues))
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateCertificateRequest): ResponseEntity<Any> {
        val certificate = certificateRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        val validationError = validateForeignKeys(request)
        if (validationError != null) return ResponseEntity.badRequest().body(validationError)

        val changes = mutableListOf<AuditChange>()
        trackString("Name", certificate.name, request.name, changes)
        if (certificate.certificateTypeId != request.certificateTypeId) {
            val oldTypeName = certificate.certificateType?.name ?: certificate.certificateTypeId.toString()
            val newType = certificateTypeRepository.findById(request.certificateTypeId).orElse(null)
            val newTypeName = newType?.name ?: request.certificateTypeId.toString()
            changes.add(AuditChange("Certificate Type", oldTypeName, newTypeName))
        }
        trackString("Issuer", certificate.issuer, request.issuer, changes)
        trackString("Subject", certificate.subject, request.subject, changes)
        trackString("Thumbprint", certificate.thumbprint, request.thumbprint, changes)
        trackString("Serial Number", certificate.serialNumber, request.serialNumber, changes)
        trackDate("Issued Date", certificate.issuedDate, request.issuedDate, changes)
        trackDate("Expiry Date", certificate.expiryDate, request.expiryDate, changes)
        val newStatus = parseStatus(request.status)
        if (certificate.status != newStatus) {
            changes.add(AuditChange("Status", certificate.status.name, newStatus.name))
        }
        trackBool("Auto Renewal", certificate.autoRenewal, request.autoRenewal, changes)
        trackString("Notes", certificate.notes, request.notes, changes)
        if (certificate.assetId != request.assetId) {
            changes.add(AuditChange("Asset", certificate.assetId?.toString(), request.assetId?.toString()))
        }
        if (certificate.personId != request.personId) {
            changes.add(AuditChange("Person", certificate.personId?.toString(), request.personId?.toString()))
        }
        if (certificate.locationId != request.locationId) {
            changes.add(AuditChange("Location", certificate.locationId?.toString(), request.locationId?.toString()))
        }

        certificate.name = request.name
        certificate.certificateTypeId = request.certificateTypeId
        certificate.issuer = request.issuer
        certificate.subject = request.subject
        certificate.thumbprint = request.thumbprint
        certificate.serialNumber = request.serialNumber
        certificate.issuedDate = request.issuedDate
        certificate.expiryDate = request.expiryDate
        certificate.status = newStatus
        certificate.autoRenewal = request.autoRenewal
        certificate.notes = request.notes
        certificate.assetId = request.assetId
        certificate.personId = request.personId
        certificate.locationId = request.locationId
        certificate.updatedAt = Instant.now()
        certificateRepository.save(certificate)

        upsertCustomFieldValues(certificate.id, certificate.certificateTypeId, request.customFieldValues)

        auditService.log(
            AuditEntry(
                "Updated", "Certificate", certificate.id.toString(), certificate.name,
                "Updated certificate \"${certificate.name}\"",
                currentUserService.userId, currentUserService.userName, changes
            )
        )

        val saved = certificateRepository.findById(certificate.id).get()
        val cfValues = buildCustomFieldValueDtos(saved.id)
        return ResponseEntity.ok(saved.toDto(cfValues))
    }

    @GetMapping("/{id}/history")
    fun getHistory(
        @PathVariable id: UUID,
        @RequestParam(required = false) limit: Int?
    ): ResponseEntity<Any> {
        if (!certificateRepository.existsById(id)) return ResponseEntity.notFound().build()
        val pageable = PageRequest.of(0, limit ?: 50)
        val history = certificateHistoryRepository.findByCertificateIdOrderByTimestampDesc(id, pageable).map { h ->
            CertificateHistoryDto(
                h.id,
                h.eventType.name,
                h.details,
                h.timestamp,
                h.performedByUser?.displayName,
                h.changes.map { c -> CertificateHistoryChangeDto(c.fieldName, c.oldValue, c.newValue) }
            )
        }
        return ResponseEntity.ok(history)
    }

    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var succeeded = 0
        var failed = 0
        request.ids.forEach { id ->
            val certificate = certificateRepository.findById(id).orElse(null)
            if (certificate == null || certificate.isArchived) {
                failed++
                return@forEach
            }
            certificate.isArchived = true
            certificate.updatedAt = Instant.now()
            certificateRepository.save(certificate)
            auditService.log(
                AuditEntry(
                    "Archived", "Certificate", certificate.id.toString(), certificate.name,
                    "Bulk archived certificate \"${certificate.name}\"",
                    currentUserService.userId, currentUserService.userName
                )
            )
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    @PostMapping("/bulk-status")
    fun bulkStatus(@RequestBody request: BulkStatusRequest): ResponseEntity<BulkActionResponse> {
        val newStatus = try {
            CertificateStatus.valueOf(request.status)
        } catch (_: Exception) {
            return ResponseEntity.badRequest().body(BulkActionResponse(0, request.ids.size))
        }

        var succeeded = 0
        var failed = 0
        request.ids.forEach { id ->
            val certificate = certificateRepository.findById(id).orElse(null)
            if (certificate == null || certificate.isArchived) {
                failed++
                return@forEach
            }
            val oldStatus = certificate.status
            certificate.status = newStatus
            certificate.updatedAt = Instant.now()
            certificateRepository.save(certificate)
            auditService.log(
                AuditEntry(
                    "Updated", "Certificate", certificate.id.toString(), certificate.name,
                    "Bulk status change for certificate \"${certificate.name}\"",
                    currentUserService.userId, currentUserService.userName,
                    listOf(AuditChange("Status", oldStatus.name, newStatus.name))
                )
            )
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val certificate = certificateRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        certificate.isArchived = true
        certificate.updatedAt = Instant.now()
        certificateRepository.save(certificate)

        auditService.log(
            AuditEntry(
                "Archived", "Certificate", certificate.id.toString(), certificate.name,
                "Archived certificate \"${certificate.name}\"",
                currentUserService.userId, currentUserService.userName
            )
        )

        return ResponseEntity.noContent().build()
    }

    // ── POST /check-duplicates ──────────────────────────────────────────
    @PostMapping("/check-duplicates")
    fun checkDuplicates(@RequestBody request: CheckCertificateDuplicatesRequest): ResponseEntity<List<DuplicateCheckResult>> {
        val spec = Specification<Certificate> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

            if (request.excludeId != null)
                predicates.add(cb.notEqual(root.get<UUID>("id"), request.excludeId))

            val matchConditions = mutableListOf<Predicate>()

            if (!request.thumbprint.isNullOrBlank())
                matchConditions.add(cb.equal(cb.lower(root.get("thumbprint")), request.thumbprint.lowercase()))

            if (!request.name.isNullOrBlank())
                matchConditions.add(cb.like(cb.lower(root.get("name")), "%${request.name.lowercase()}%"))

            if (!request.serialNumber.isNullOrBlank())
                matchConditions.add(cb.like(cb.lower(root.get("serialNumber")), "%${request.serialNumber.lowercase()}%"))

            if (matchConditions.isEmpty())
                return@Specification cb.and(*predicates.toTypedArray(), cb.disjunction())

            predicates.add(cb.or(*matchConditions.toTypedArray()))
            cb.and(*predicates.toTypedArray())
        }

        val results = certificateRepository.findAll(spec, PageRequest.of(0, 5))
            .content.map { DuplicateCheckResult(it.id, it.name, "Thumbprint: ${it.thumbprint ?: "N/A"}") }

        return ResponseEntity.ok(results)
    }
}
