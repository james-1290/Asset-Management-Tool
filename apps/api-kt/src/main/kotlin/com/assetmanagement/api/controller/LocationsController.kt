package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.Location
import com.assetmanagement.api.util.CsvUtils
import com.assetmanagement.api.util.SqlUtils
import com.assetmanagement.api.repository.ApplicationRepository
import com.assetmanagement.api.repository.AssetRepository
import com.assetmanagement.api.repository.CertificateRepository
import com.assetmanagement.api.repository.LocationRepository
import com.assetmanagement.api.repository.PersonRepository
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
import org.springframework.transaction.annotation.Transactional
import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.io.OutputStreamWriter
import java.net.URI
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.*

@RestController
@RequestMapping("/api/v1/locations")
@PreAuthorize("hasAnyRole('Admin', 'Operator')")
class LocationsController(
    private val locationRepository: LocationRepository,
    private val assetRepository: AssetRepository,
    private val personRepository: PersonRepository,
    private val certificateRepository: CertificateRepository,
    private val applicationRepository: ApplicationRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)

    private fun buildSpec(search: String?): Specification<Location> = Specification { root, _, cb ->
        val predicates = mutableListOf<Predicate>()
        predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))
        if (!search.isNullOrBlank()) {
            predicates.add(cb.like(cb.lower(root.get("name")), "%${SqlUtils.escapeLikePattern(search.lowercase())}%", '\\'))
        }
        cb.and(*predicates.toTypedArray())
    }

    private fun sortOf(sortBy: String, sortDir: String): Sort {
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val prop = when (sortBy.lowercase()) {
            "address" -> "address"
            "city" -> "city"
            "country" -> "country"
            "createdat" -> "createdAt"
            else -> "name"
        }
        return Sort.by(dir, prop)
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) search: String?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String
    ): ResponseEntity<PagedResponse<LocationDto>> {
        val p = maxOf(1, page)
        val ps = pageSize.coerceIn(1, 100)
        val spec = buildSpec(search)
        val pageReq = PageRequest.of(p - 1, ps, sortOf(sortBy, sortDir))
        val result = locationRepository.findAll(spec, pageReq)
        val items = result.content.map { it.toDto() }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/export")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    fun export(
        @RequestParam(required = false) search: String?,
        @RequestParam(defaultValue = "name") sortBy: String,
        @RequestParam(defaultValue = "asc") sortDir: String,
        response: HttpServletResponse
    ) {
        response.contentType = "text/csv"
        response.setHeader("Content-Disposition", "attachment; filename=locations-export.csv")
        val spec = buildSpec(search)
        val locations = locationRepository.findAll(spec, sortOf(sortBy, sortDir))
        val writer = CSVWriter(OutputStreamWriter(response.outputStream))
        writer.writeNext(arrayOf("Name", "Address", "City", "Country", "CreatedAt", "UpdatedAt"))
        locations.forEach { l ->
            writer.writeNext(CsvUtils.sanitizeRow(arrayOf(l.name, l.address ?: "", l.city ?: "", l.country ?: "",
                dateFormat.format(l.createdAt), dateFormat.format(l.updatedAt))))
        }
        writer.flush()
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<LocationDto> {
        val location = locationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(location.toDto())
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/assets")
    fun getAssets(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!locationRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Asset> { root, query, cb ->
            cb.and(
                cb.equal(root.get<UUID>("locationId"), id),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        val assets = assetRepository.findAll(spec, Sort.by("name")).map { a ->
            LocationAssetDto(a.id, a.name, a.assetType?.name, a.status.name, a.assignedPerson?.fullName)
        }
        return ResponseEntity.ok(assets)
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/people")
    fun getPeople(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!locationRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Person> { root, _, cb ->
            cb.and(
                cb.equal(root.get<UUID>("locationId"), id),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        val people = personRepository.findAll(spec, Sort.by("fullName")).map { p ->
            LocationPersonDto(p.id, p.fullName, p.email, p.department, p.jobTitle)
        }
        return ResponseEntity.ok(people)
    }

    @PostMapping
    @Transactional
    fun create(@Valid @RequestBody request: CreateLocationRequest): ResponseEntity<LocationDto> {
        val location = Location(name = request.name, address = request.address, city = request.city, country = request.country)
        locationRepository.save(location)

        auditService.log(AuditEntry("Created", "Location", location.id.toString(), location.name,
            "Created location \"${location.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.created(URI("/api/v1/locations/${location.id}")).body(location.toDto())
    }

    @PutMapping("/{id}")
    @Transactional
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateLocationRequest): ResponseEntity<Any> {
        val location = locationRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()

        // Track field changes before applying
        val changes = mutableListOf<AuditChange>()
        if (location.name != request.name) changes.add(AuditChange("Name", location.name, request.name))
        if (location.address != request.address) changes.add(AuditChange("Address", location.address, request.address))
        if (location.city != request.city) changes.add(AuditChange("City", location.city, request.city))
        if (location.country != request.country) changes.add(AuditChange("Country", location.country, request.country))

        location.name = request.name
        location.address = request.address
        location.city = request.city
        location.country = request.country
        location.updatedAt = Instant.now()
        locationRepository.save(location)

        auditService.log(AuditEntry("Updated", "Location", location.id.toString(), location.name,
            "Updated location \"${location.name}\"", currentUserService.userId, currentUserService.userName,
            if (changes.isNotEmpty()) changes else null))

        return ResponseEntity.ok(location.toDto())
    }

    @DeleteMapping("/{id}")
    @Transactional
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val location = locationRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()

        // Prevent archiving if items are still assigned to this location
        val assetCount = assetRepository.countByLocationIdAndIsArchivedFalse(id)
        val personCount = personRepository.countByLocationIdAndIsArchivedFalse(id)
        val certificateCount = certificateRepository.countByLocationIdAndIsArchivedFalse(id)
        val applicationCount = applicationRepository.countByLocationIdAndIsArchivedFalse(id)

        if (assetCount + personCount + certificateCount + applicationCount > 0) {
            val parts = mutableListOf<String>()
            if (assetCount > 0) parts.add("$assetCount asset${if (assetCount > 1) "s" else ""}")
            if (personCount > 0) parts.add("$personCount ${if (personCount > 1) "people" else "person"}")
            if (certificateCount > 0) parts.add("$certificateCount certificate${if (certificateCount > 1) "s" else ""}")
            if (applicationCount > 0) parts.add("$applicationCount application${if (applicationCount > 1) "s" else ""}")
            val summary = parts.joinToString(", ")
            return ResponseEntity.status(409).body(mapOf(
                "error" to "Cannot delete location",
                "message" to "This location still has $summary assigned. Remove all items before deleting.",
                "counts" to mapOf(
                    "assets" to assetCount,
                    "people" to personCount,
                    "certificates" to certificateCount,
                    "applications" to applicationCount
                )
            ))
        }

        location.isArchived = true
        location.updatedAt = Instant.now()
        locationRepository.save(location)

        auditService.log(AuditEntry("Archived", "Location", location.id.toString(), location.name,
            "Archived location \"${location.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.noContent().build()
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/certificates")
    fun getCertificates(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!locationRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Certificate> { root, _, cb ->
            cb.and(
                cb.equal(root.get<UUID>("locationId"), id),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        val certs = certificateRepository.findAll(spec, Sort.by("name")).map { c ->
            LocationCertificateDto(c.id, c.name, c.certificateType?.name, c.expiryDate)
        }
        return ResponseEntity.ok(certs)
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}/applications")
    fun getApplications(@PathVariable id: UUID): ResponseEntity<Any> {
        if (!locationRepository.existsById(id)) return ResponseEntity.notFound().build()
        val spec = Specification<com.assetmanagement.api.model.Application> { root, _, cb ->
            cb.and(
                cb.equal(root.get<UUID>("locationId"), id),
                cb.equal(root.get<Boolean>("isArchived"), false)
            )
        }
        val apps = applicationRepository.findAll(spec, Sort.by("name")).map { a ->
            LocationApplicationDto(a.id, a.name, a.applicationType?.name, a.expiryDate)
        }
        return ResponseEntity.ok(apps)
    }

    @PostMapping("/{id}/reassign-and-archive")
    @Transactional
    fun reassignAndArchive(
        @PathVariable id: UUID,
        @RequestBody request: ReassignAndArchiveRequest
    ): ResponseEntity<Any> {
        val source = locationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()

        // Validate target if provided
        val target = if (request.targetLocationId != null) {
            val t = locationRepository.findById(request.targetLocationId).orElse(null)
                ?: return ResponseEntity.badRequest().body(mapOf("error" to "Target location not found"))
            if (id == request.targetLocationId)
                return ResponseEntity.badRequest().body(mapOf("error" to "Target must be different from source"))
            if (t.isArchived)
                return ResponseEntity.badRequest().body(mapOf("error" to "Target location is archived"))
            t
        } else null

        val newLocationId = request.targetLocationId // null = unassign
        val targetName = target?.name ?: "Unassigned"

        // Reassign assets
        val assetSpec = Specification<com.assetmanagement.api.model.Asset> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("locationId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val assets = assetRepository.findAll(assetSpec)
        assets.forEach { it.locationId = newLocationId }
        assetRepository.saveAll(assets)
        for (asset in assets) {
            auditService.log(AuditEntry("Updated", "Asset", asset.id.toString(), asset.name,
                "Moved asset \"${asset.name}\" from \"${source.name}\" to \"$targetName\"",
                currentUserService.userId, currentUserService.userName,
                listOf(AuditChange("Location", source.name, targetName))))
        }

        // Reassign people
        val personSpec = Specification<com.assetmanagement.api.model.Person> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("locationId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val people = personRepository.findAll(personSpec)
        people.forEach { it.locationId = newLocationId }
        personRepository.saveAll(people)
        for (person in people) {
            auditService.log(AuditEntry("Updated", "Person", person.id.toString(), person.fullName,
                "Moved person \"${person.fullName}\" from \"${source.name}\" to \"$targetName\"",
                currentUserService.userId, currentUserService.userName,
                listOf(AuditChange("Location", source.name, targetName))))
        }

        // Reassign certificates
        val certSpec = Specification<com.assetmanagement.api.model.Certificate> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("locationId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val certs = certificateRepository.findAll(certSpec)
        certs.forEach { it.locationId = newLocationId }
        certificateRepository.saveAll(certs)
        for (cert in certs) {
            auditService.log(AuditEntry("Updated", "Certificate", cert.id.toString(), cert.name,
                "Moved certificate \"${cert.name}\" from \"${source.name}\" to \"$targetName\"",
                currentUserService.userId, currentUserService.userName,
                listOf(AuditChange("Location", source.name, targetName))))
        }

        // Reassign applications
        val appSpec = Specification<com.assetmanagement.api.model.Application> { root, _, cb ->
            cb.and(cb.equal(root.get<UUID>("locationId"), id), cb.equal(root.get<Boolean>("isArchived"), false))
        }
        val apps = applicationRepository.findAll(appSpec)
        apps.forEach { it.locationId = newLocationId }
        applicationRepository.saveAll(apps)
        for (app in apps) {
            auditService.log(AuditEntry("Updated", "Application", app.id.toString(), app.name,
                "Moved application \"${app.name}\" from \"${source.name}\" to \"$targetName\"",
                currentUserService.userId, currentUserService.userName,
                listOf(AuditChange("Location", source.name, targetName))))
        }

        // Archive the source location
        source.isArchived = true
        source.updatedAt = Instant.now()
        locationRepository.save(source)

        val actionDesc = if (target != null)
            "Reassigned all items from \"${source.name}\" to \"${target.name}\" and archived"
        else
            "Unassigned all items from \"${source.name}\" and archived"

        auditService.log(AuditEntry("Reassigned & Archived", "Location", source.id.toString(), source.name,
            actionDesc, currentUserService.userId, currentUserService.userName))

        return ResponseEntity.ok(mapOf("message" to "All items processed and location archived"))
    }

    // ── POST /check-duplicates ─────────────────────────────────────────
    @PostMapping("/check-duplicates")
    fun checkDuplicates(@RequestBody request: CheckLocationDuplicatesRequest): ResponseEntity<List<DuplicateCheckResult>> {
        val spec = Specification<Location> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))

            if (request.excludeId != null)
                predicates.add(cb.notEqual(root.get<UUID>("id"), request.excludeId))

            if (request.name.isNullOrBlank())
                return@Specification cb.and(*predicates.toTypedArray(), cb.disjunction())

            predicates.add(cb.like(cb.lower(root.get("name")), "%${SqlUtils.escapeLikePattern(request.name.lowercase())}%", '\\'))
            cb.and(*predicates.toTypedArray())
        }

        val results = locationRepository.findAll(spec, PageRequest.of(0, 5))
            .content.map { DuplicateCheckResult(it.id, it.name, "${it.city ?: ""} ${it.country ?: ""}".trim().ifEmpty { "N/A" }) }

        return ResponseEntity.ok(results)
    }

    private fun Location.toDto() = LocationDto(id, name, address, city, country, isArchived, createdAt, updatedAt)
}
