package com.assetmanagement.api.controller
import com.assetmanagement.api.util.daysUntil

import com.assetmanagement.api.dto.SearchCounts
import com.assetmanagement.api.dto.SearchResponse
import com.assetmanagement.api.dto.SearchResultItem
import com.assetmanagement.api.model.*
import com.assetmanagement.api.repository.*
import com.assetmanagement.api.util.SqlUtils
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/v1/search")
class SearchController(
    private val assetRepository: AssetRepository,
    private val certificateRepository: CertificateRepository,
    private val applicationRepository: ApplicationRepository,
    private val personRepository: PersonRepository,
    private val locationRepository: LocationRepository
) {

    @GetMapping
    @Transactional(readOnly = true)
    fun search(@RequestParam(required = false) q: String?, @RequestParam(defaultValue = "5") limit: Int): ResponseEntity<SearchResponse> {
        val lim = limit.coerceIn(1, 20)
        if (q.isNullOrBlank() || q.length < 2) {
            return ResponseEntity.ok(SearchResponse(emptyList(), emptyList(), emptyList(), emptyList(), emptyList()))
        }
        val pattern = "%${SqlUtils.escapeLikePattern(q.lowercase())}%"

        // --- Assets ---
        val assetSpec = Specification<Asset> { root, _, cb ->
            cb.and(
                cb.equal(root.get<Boolean>("isArchived"), false),
                cb.or(
                    cb.like(cb.lower(root.get("name")), pattern, '\\'),
                    cb.like(cb.lower(root.get("serialNumber")), pattern, '\\')
                )
            )
        }
        val assetCount = assetRepository.count(assetSpec).toInt()
        val assets = assetRepository.findAll(assetSpec, PageRequest.of(0, lim, Sort.by("name"))).content.map { asset ->
            val typeName = try { asset.assetType?.name } catch (_: Exception) { null }
            val subtitle = listOfNotNull(typeName, asset.status.name).joinToString(" \u00b7 ").ifEmpty { null }
            val extra = try {
                asset.assignedPerson?.fullName
            } catch (_: Exception) {
                null
            } ?: asset.status.name
            SearchResultItem(asset.id, asset.name, subtitle, extra)
        }

        // --- Certificates ---
        val certSpec = Specification<Certificate> { root, _, cb ->
            cb.and(
                cb.equal(root.get<Boolean>("isArchived"), false),
                cb.like(cb.lower(root.get("name")), pattern, '\\')
            )
        }
        val certCount = certificateRepository.count(certSpec).toInt()
        val certs = certificateRepository.findAll(certSpec, PageRequest.of(0, lim, Sort.by("name"))).content.map { cert ->
            val typeName = try { cert.certificateType?.name } catch (_: Exception) { null }
            val subtitle = typeName
            val extra = if (cert.expiryDate != null) {
                val daysUntil = daysUntil(cert.expiryDate!!)
                if (daysUntil in 0..90) "Expires in $daysUntil days"
                else if (daysUntil < 0 && daysUntil >= -90) "Expired"
                else cert.status.name
            } else {
                cert.status.name
            }
            SearchResultItem(cert.id, cert.name, subtitle, extra)
        }

        // --- Applications ---
        val appSpec = Specification<Application> { root, _, cb ->
            cb.and(
                cb.equal(root.get<Boolean>("isArchived"), false),
                cb.like(cb.lower(root.get("name")), pattern, '\\')
            )
        }
        val appCount = applicationRepository.count(appSpec).toInt()
        val apps = applicationRepository.findAll(appSpec, PageRequest.of(0, lim, Sort.by("name"))).content.map { app ->
            val typeName = try { app.applicationType?.name } catch (_: Exception) { null }
            val subtitle = listOfNotNull(typeName, app.publisher).joinToString(" \u00b7 ").ifEmpty { null }
            val extra = app.licenceType?.name ?: app.publisher
            SearchResultItem(app.id, app.name, subtitle, extra)
        }

        // --- People ---
        val personSpec = Specification<Person> { root, _, cb ->
            cb.and(
                cb.equal(root.get<Boolean>("isArchived"), false),
                cb.like(cb.lower(root.get("fullName")), pattern, '\\')
            )
        }
        val personCount = personRepository.count(personSpec).toInt()
        val personRows = personRepository.findAll(personSpec, PageRequest.of(0, lim, Sort.by("fullName"))).content
        // One grouped COUNT for all matched people, instead of loading each
        // person's whole assignedAssets collection just to count it.
        val assetCountByPerson =
            if (personRows.isEmpty()) emptyMap()
            else countMap(assetRepository.countActiveByAssignedPersonIds(personRows.map { it.id }))
        val people = personRows.map { person ->
            val subtitle = listOfNotNull(person.department, person.jobTitle).joinToString(" \u00b7 ").ifEmpty { person.email }
            val assignedCount = assetCountByPerson[person.id] ?: 0
            val extra = if (assignedCount > 0) "$assignedCount asset${if (assignedCount != 1L) "s" else ""}" else null
            SearchResultItem(person.id, person.fullName, subtitle, extra)
        }

        // --- Locations ---
        val locationSpec = Specification<Location> { root, _, cb ->
            cb.and(
                cb.equal(root.get<Boolean>("isArchived"), false),
                cb.like(cb.lower(root.get("name")), pattern, '\\')
            )
        }
        val locationCount = locationRepository.count(locationSpec).toInt()
        val locationRows = locationRepository.findAll(locationSpec, PageRequest.of(0, lim, Sort.by("name"))).content
        // One grouped COUNT for all matched locations, instead of loading each
        // location's whole assets collection just to count it.
        val assetCountByLocation =
            if (locationRows.isEmpty()) emptyMap()
            else countMap(assetRepository.countActiveByLocationIds(locationRows.map { it.id }))
        val locations = locationRows.map { loc ->
            val subtitle = listOfNotNull(loc.city, loc.country).joinToString(", ").ifEmpty { null }
            val locAssetCount = assetCountByLocation[loc.id] ?: 0
            val extra = if (locAssetCount > 0) "$locAssetCount asset${if (locAssetCount != 1L) "s" else ""}" else null
            SearchResultItem(loc.id, loc.name, subtitle, extra)
        }

        val counts = SearchCounts(assetCount, certCount, appCount, personCount, locationCount)
        return ResponseEntity.ok(SearchResponse(assets, certs, apps, people, locations, counts))
    }

    /**
     * Turns grouped-count rows ([id, count]) into a lookup map. Returns empty for
     * an empty id list (skips a pointless `IN ()` query, which some DBs reject).
     */
    private fun countMap(rows: List<Array<Any>>): Map<UUID, Long> =
        rows.associate { it[0] as UUID to (it[1] as Long) }
}
