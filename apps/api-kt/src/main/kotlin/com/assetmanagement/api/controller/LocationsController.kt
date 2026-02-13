package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.Location
import com.assetmanagement.api.repository.AssetRepository
import com.assetmanagement.api.repository.LocationRepository
import com.assetmanagement.api.repository.PersonRepository
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
@RequestMapping("/api/v1/locations")
class LocationsController(
    private val locationRepository: LocationRepository,
    private val assetRepository: AssetRepository,
    private val personRepository: PersonRepository,
    private val auditService: AuditService,
    private val currentUserService: CurrentUserService
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)

    private fun buildSpec(search: String?): Specification<Location> = Specification { root, _, cb ->
        val predicates = mutableListOf<Predicate>()
        predicates.add(cb.equal(root.get<Boolean>("isArchived"), false))
        if (!search.isNullOrBlank()) {
            predicates.add(cb.like(cb.lower(root.get("name")), "%${search.lowercase()}%"))
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

    @GetMapping("/export")
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
            writer.writeNext(arrayOf(l.name, l.address ?: "", l.city ?: "", l.country ?: "",
                dateFormat.format(l.createdAt), dateFormat.format(l.updatedAt)))
        }
        writer.flush()
    }

    @GetMapping("/{id}")
    fun getById(@PathVariable id: UUID): ResponseEntity<LocationDto> {
        val location = locationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(location.toDto())
    }

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
    fun create(@RequestBody request: CreateLocationRequest): ResponseEntity<LocationDto> {
        val location = Location(name = request.name, address = request.address, city = request.city, country = request.country)
        locationRepository.save(location)

        auditService.log(AuditEntry("Created", "Location", location.id.toString(), location.name,
            "Created location \"${location.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.created(URI("/api/v1/locations/${location.id}")).body(location.toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateLocationRequest): ResponseEntity<Any> {
        val location = locationRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()

        location.name = request.name
        location.address = request.address
        location.city = request.city
        location.country = request.country
        location.updatedAt = Instant.now()
        locationRepository.save(location)

        auditService.log(AuditEntry("Updated", "Location", location.id.toString(), location.name,
            "Updated location \"${location.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.ok(location.toDto())
    }

    @DeleteMapping("/{id}")
    fun archive(@PathVariable id: UUID): ResponseEntity<Any> {
        val location = locationRepository.findById(id).orElse(null) ?: return ResponseEntity.notFound().build()

        location.isArchived = true
        location.updatedAt = Instant.now()
        locationRepository.save(location)

        auditService.log(AuditEntry("Archived", "Location", location.id.toString(), location.name,
            "Archived location \"${location.name}\"", currentUserService.userId, currentUserService.userName))

        return ResponseEntity.noContent().build()
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

            predicates.add(cb.like(cb.lower(root.get("name")), "%${request.name.lowercase()}%"))
            cb.and(*predicates.toTypedArray())
        }

        val results = locationRepository.findAll(spec, PageRequest.of(0, 5))
            .content.map { DuplicateCheckResult(it.id, it.name, "${it.city ?: ""} ${it.country ?: ""}".trim().ifEmpty { "N/A" }) }

        return ResponseEntity.ok(results)
    }

    private fun Location.toDto() = LocationDto(id, name, address, city, country, isArchived, createdAt, updatedAt)
}
