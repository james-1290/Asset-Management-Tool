package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.Person
import com.assetmanagement.api.util.CsvUtils
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.service.*
import com.opencsv.CSVWriter
import jakarta.persistence.criteria.Predicate
import jakarta.servlet.http.HttpServletResponse
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.io.OutputStreamWriter
import java.net.URI
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.*

@RestController
@RequestMapping("/api/v1/people")
class PeopleController(
    private val personRepository: PersonRepository,
    private val locationRepository: LocationRepository,
    private val assetRepository: AssetRepository,
    private val certificateRepository: CertificateRepository,
    private val applicationRepository: ApplicationRepository,
    private val personHistoryRepository: PersonHistoryRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)

    @GetMapping("/search")
    fun search(@RequestParam(required = false) q: String?, @RequestParam(defaultValue = "5") limit: Int): ResponseEntity<List<PersonSearchResult>> {
        val results = personRepository.search(q ?: "", PageRequest.of(0, limit))
            .map { PersonSearchResult(it.id, it.fullName) }
        return ResponseEntity.ok(results)
    }

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?,
        @RequestParam(defaultValue = "fullname") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<PersonDto>> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)
        val spec = buildSpec(search)
        val sort = sortOf(sortBy, sortDir)
        val result = personRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        val items = result.content.map { it.toDto() }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    @GetMapping("/export")
    fun export(
        @RequestParam(required = false) search: String?,
        @RequestParam(defaultValue = "fullname") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        @RequestParam(required = false) ids: String?,
        response: HttpServletResponse
    ) {
        response.contentType = "text/csv"
        response.setHeader("Content-Disposition", "attachment; filename=people-export.csv")
        val people = if (!ids.isNullOrBlank()) {
            val idList = ids.split(",").mapNotNull { runCatching { UUID.fromString(it.trim()) }.getOrNull() }
            personRepository.findAllById(idList).filter { !it.isArchived }
        } else {
            personRepository.findAll(buildSpec(search), sortOf(sortBy, sortDir))
        }
        val writer = CSVWriter(OutputStreamWriter(response.outputStream))
        writer.writeNext(arrayOf("FullName", "Email", "Department", "JobTitle", "Location", "CreatedAt", "UpdatedAt"))
        people.forEach { p ->
            writer.writeNext(CsvUtils.sanitizeRow(arrayOf(p.fullName, p.email ?: "", p.department ?: "", p.jobTitle ?: "",
                p.location?.name ?: "", dateFormat.format(p.createdAt), dateFormat.format(p.updatedAt))))
        }
        writer.flush()
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<PersonDto> {
        val person = personRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(person.toDto())
    }

    @GetMapping("/{id}/history")
    fun getHistory(@PathVariable id: UUID, @RequestParam(required = false) limit: Int?): ResponseEntity<Any> {
        if (!personRepository.existsById(id)) return ResponseEntity.notFound().build()
        val pageable = PageRequest.of(0, limit ?: 50)
        val history = personHistoryRepository.findByPersonIdOrderByTimestampDesc(id, pageable).map { h ->
            PersonHistoryDto(h.id, h.eventType.name, h.details, h.timestamp,
                h.performedByUser?.displayName,
                h.changes.map { c -> PersonHistoryChangeDto(c.fieldName, c.oldValue, c.newValue) })
        }
        return ResponseEntity.ok(history)
    }

    @GetMapping("/{id}/assets")
    fun getAssignedAssets(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!personRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Asset> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("assignedPersonId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val assets = assetRepository.findAll(spec, Sort.by("name")).map { a ->
            AssignedAssetDto(a.id, a.name, a.serialNumber, a.status.name, a.assetType?.name ?: "", a.location?.name)
        }
        return ResponseEntity.ok(assets)
    }

    @PostMapping
    fun create(@RequestBody request: CreatePersonRequest): ResponseEntity<Any> {
        if (request.locationId != null) {
            val loc = locationRepository.findById(request.locationId).orElse(null)
            if (loc == null || loc.isArchived) return ResponseEntity.badRequest().body("Invalid location ID.")
        }
        val person = Person(fullName = request.fullName, email = request.email, department = request.department,
            jobTitle = request.jobTitle, locationId = request.locationId)
        personRepository.save(person)

        auditService.log(AuditEntry("Created", "Person", person.id.toString(), person.fullName,
            "Created person \"${person.fullName}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.created(URI("/api/v1/people/${person.id}")).body(personRepository.findById(person.id).get().toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdatePersonRequest): ResponseEntity<Any> {
        val person = personRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        if (request.locationId != null) {
            val loc = locationRepository.findById(request.locationId).orElse(null)
            if (loc == null || loc.isArchived) return ResponseEntity.badRequest().body("Invalid location ID.")
        }

        val changes = mutableListOf<AuditChange>()
        if (person.fullName != request.fullName) changes.add(AuditChange("Full Name", person.fullName, request.fullName))
        if (person.email != request.email) changes.add(AuditChange("Email", person.email, request.email))
        if (person.department != request.department) changes.add(AuditChange("Department", person.department, request.department))
        if (person.jobTitle != request.jobTitle) changes.add(AuditChange("Job Title", person.jobTitle, request.jobTitle))

        person.fullName = request.fullName
        person.email = request.email
        person.department = request.department
        person.jobTitle = request.jobTitle
        person.locationId = request.locationId
        person.updatedAt = Instant.now()
        personRepository.save(person)

        auditService.log(AuditEntry("Updated", "Person", person.id.toString(), person.fullName,
            "Updated person \"${person.fullName}\"", currentUserService.userId, currentUserService.userName, changes))

        return ResponseEntity.ok(personRepository.findById(person.id).get().toDto())
    }

    @PostMapping("/bulk-archive")
    fun bulkArchive(@RequestBody request: BulkArchiveRequest): ResponseEntity<BulkActionResponse> {
        var succeeded = 0; var failed = 0
        request.ids.forEach { id ->
            val person = personRepository.findById(id).orElse(null)
            if (person == null || person.isArchived) { failed++; return@forEach }
            person.isArchived = true; person.updatedAt = Instant.now()
            personRepository.save(person)
            auditService.log(AuditEntry("Archived", "Person", person.id.toString(), person.fullName,
                "Bulk archived person \"${person.fullName}\"", currentUserService.userId, currentUserService.userName))
            succeeded++
        }
        return ResponseEntity.ok(BulkActionResponse(succeeded, failed))
    }

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val person = personRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        person.isArchived = true; person.updatedAt = Instant.now()
        personRepository.save(person)
        auditService.log(AuditEntry("Archived", "Person", person.id.toString(), person.fullName,
            "Archived person \"${person.fullName}\"", currentUserService.userId, currentUserService.userName))
        return ResponseEntity.noContent().build()
    }

    // ── POST /check-duplicates ─────────────────────────────────────────
    @PostMapping("/check-duplicates")
    fun checkDuplicates(@RequestBody request: CheckPersonDuplicatesRequest): ResponseEntity<List<DuplicateCheckResult>> {
        val spec = Specification<Person> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

            if (request.excludeId != null)
                predicates.add(cb.notEqual(root.get<UUID>("id"), request.excludeId))

            val matchConditions = mutableListOf<Predicate>()

            if (!request.email.isNullOrBlank())
                matchConditions.add(cb.equal(cb.lower(root.get("email")), request.email.lowercase()))

            if (!request.fullName.isNullOrBlank())
                matchConditions.add(cb.like(cb.lower(root.get("fullName")), "%${request.fullName.lowercase()}%"))

            if (matchConditions.isEmpty())
                return@Specification cb.and(*predicates.toTypedArray(), cb.disjunction())

            predicates.add(cb.or(*matchConditions.toTypedArray()))
            cb.and(*predicates.toTypedArray())
        }

        val results = personRepository.findAll(spec, PageRequest.of(0, 5))
            .content.map { DuplicateCheckResult(it.id, it.fullName, "Email: ${it.email ?: "N/A"}") }

        return ResponseEntity.ok(results)
    }

    @GetMapping("/{id}/summary")
    fun getSummary(@PathVariable id: UUID): ResponseEntity<PersonSummaryDto> {
        if (!personRepository.existsById(id)) return ResponseEntity.notFound().build()

        val assetSpec = Specification<com.assetmanagement.api.model.Asset> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("assignedPersonId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val certSpec = Specification<com.assetmanagement.api.model.Certificate> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("personId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val appSpec = Specification<com.assetmanagement.api.model.Application> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("personId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }

        return ResponseEntity.ok(PersonSummaryDto(
            assetCount = assetRepository.count(assetSpec).toInt(),
            certificateCount = certificateRepository.count(certSpec).toInt(),
            applicationCount = applicationRepository.count(appSpec).toInt()
        ))
    }

    @GetMapping("/{id}/certificates")
    fun getAssignedCertificates(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!personRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Certificate> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("personId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val certs = certificateRepository.findAll(spec, Sort.by("name")).map { c ->
            AssignedCertificateDto(c.id, c.name, c.certificateType?.name ?: "", c.status.name, c.expiryDate)
        }
        return ResponseEntity.ok(certs)
    }

    @GetMapping("/{id}/applications")
    fun getAssignedApplications(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!personRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Application> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("personId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val apps = applicationRepository.findAll(spec, Sort.by("name")).map { a ->
            AssignedApplicationDto(a.id, a.name, a.applicationType?.name ?: "", a.status.name, a.licenceType?.name, a.expiryDate)
        }
        return ResponseEntity.ok(apps)
    }

    @PostMapping("/{id}/offboard")
    @Transactional
    fun offboard(@PathVariable id: UUID, @RequestBody request: OffboardRequest): ResponseEntity<Any> {
        val person = personRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()
        val results = mutableListOf<String>()

        for (action in request.actions) {
            when (action.entityType) {
                "Asset" -> {
                    val asset = assetRepository.findById(action.entityId).orElse(null) ?: continue
                    when (action.action) {
                        "free" -> {
                            asset.assignedPersonId = null
                            asset.status = com.assetmanagement.api.model.enums.AssetStatus.Available
                            asset.updatedAt = Instant.now()
                            assetRepository.save(asset)
                            auditService.log(AuditEntry("CheckedIn", "Asset", asset.id.toString(), asset.name,
                                "Checked in asset \"${asset.name}\" during offboarding of \"${person.fullName}\"",
                                currentUserService.userId, currentUserService.userName))
                            auditService.log(AuditEntry("AssetCheckedIn", "Person", person.id.toString(), person.fullName,
                                "Asset \"${asset.name}\" checked in during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            results.add("Freed: ${asset.name}")
                        }
                        "transfer" -> {
                            val targetId = action.transferToPersonId ?: continue
                            val targetPerson = personRepository.findById(targetId).orElse(null) ?: continue
                            // Check in from source
                            asset.assignedPersonId = targetId
                            asset.status = com.assetmanagement.api.model.enums.AssetStatus.CheckedOut
                            asset.updatedAt = Instant.now()
                            assetRepository.save(asset)
                            auditService.log(AuditEntry("CheckedIn", "Asset", asset.id.toString(), asset.name,
                                "Checked in asset \"${asset.name}\" from \"${person.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            auditService.log(AuditEntry("AssetCheckedIn", "Person", person.id.toString(), person.fullName,
                                "Asset \"${asset.name}\" transferred to \"${targetPerson.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            // Check out to target
                            auditService.log(AuditEntry("CheckedOut", "Asset", asset.id.toString(), asset.name,
                                "Checked out asset \"${asset.name}\" to \"${targetPerson.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            auditService.log(AuditEntry("AssetCheckedOut", "Person", targetPerson.id.toString(), targetPerson.fullName,
                                "Asset \"${asset.name}\" transferred from \"${person.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            results.add("Transferred: ${asset.name} → ${targetPerson.fullName}")
                        }
                        "keep" -> results.add("Kept: ${asset.name}")
                    }
                }
                "Certificate" -> {
                    val cert = certificateRepository.findById(action.entityId).orElse(null) ?: continue
                    when (action.action) {
                        "free" -> {
                            cert.personId = null
                            cert.updatedAt = Instant.now()
                            certificateRepository.save(cert)
                            auditService.log(AuditEntry("Updated", "Certificate", cert.id.toString(), cert.name,
                                "Unassigned certificate \"${cert.name}\" from \"${person.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            results.add("Freed: ${cert.name}")
                        }
                        "transfer" -> {
                            val targetId = action.transferToPersonId ?: continue
                            val targetPerson = personRepository.findById(targetId).orElse(null) ?: continue
                            cert.personId = targetId
                            cert.updatedAt = Instant.now()
                            certificateRepository.save(cert)
                            auditService.log(AuditEntry("Updated", "Certificate", cert.id.toString(), cert.name,
                                "Transferred certificate \"${cert.name}\" from \"${person.fullName}\" to \"${targetPerson.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            results.add("Transferred: ${cert.name} → ${targetPerson.fullName}")
                        }
                        "keep" -> results.add("Kept: ${cert.name}")
                    }
                }
                "Application" -> {
                    val app = applicationRepository.findById(action.entityId).orElse(null) ?: continue
                    when (action.action) {
                        "free" -> {
                            app.personId = null
                            app.updatedAt = Instant.now()
                            applicationRepository.save(app)
                            auditService.log(AuditEntry("Updated", "Application", app.id.toString(), app.name,
                                "Unassigned application \"${app.name}\" from \"${person.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            results.add("Freed: ${app.name}")
                        }
                        "transfer" -> {
                            val targetId = action.transferToPersonId ?: continue
                            val targetPerson = personRepository.findById(targetId).orElse(null) ?: continue
                            app.personId = targetId
                            app.updatedAt = Instant.now()
                            applicationRepository.save(app)
                            auditService.log(AuditEntry("Updated", "Application", app.id.toString(), app.name,
                                "Transferred application \"${app.name}\" from \"${person.fullName}\" to \"${targetPerson.fullName}\" during offboarding",
                                currentUserService.userId, currentUserService.userName))
                            results.add("Transferred: ${app.name} → ${targetPerson.fullName}")
                        }
                        "keep" -> results.add("Kept: ${app.name}")
                    }
                }
            }
        }

        if (request.deactivatePerson) {
            person.isArchived = true
            person.updatedAt = Instant.now()
            personRepository.save(person)
            auditService.log(AuditEntry("Archived", "Person", person.id.toString(), person.fullName,
                "Archived person \"${person.fullName}\" during offboarding",
                currentUserService.userId, currentUserService.userName))
            results.add("Person archived")
        }

        return ResponseEntity.ok(OffboardResultDto(results))
    }

    private fun buildSpec(search: String?): Specification<Person> = Specification { root, _, cb ->
        val predicates = mutableListOf<Predicate>()
        predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))
        if (!search.isNullOrBlank()) {
            val pattern = "%${search.lowercase()}%"
            predicates.add(cb.or(
                cb.like(cb.lower(root.get("fullName")), pattern),
                cb.like(cb.lower(root.get("email")), pattern)
            ))
        }
        cb.and(*predicates.toTypedArray())
    }

    private fun sortOf(sortBy: String, sortDir: String): Sort {
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val prop = when (sortBy.lowercase()) {
            "email" -> "email"; "department" -> "department"; "jobtitle" -> "jobTitle"
            "createdat" -> "createdAt"; else -> "fullName"
        }
        return Sort.by(dir, prop)
    }

    private fun Person.toDto() = PersonDto(id, fullName, email, department, jobTitle, locationId, location?.name, isArchived, createdAt, updatedAt)
}
