package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.SearchResponse
import com.assetmanagement.api.dto.SearchResultItem
import com.assetmanagement.api.repository.*
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
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
    fun search(@RequestParam(required = false) q: String?, @RequestParam(defaultValue = "5") limit: Int): ResponseEntity<SearchResponse> {
        val lim = limit.coerceIn(1, 20)
        if (q.isNullOrBlank() || q.length < 2) {
            return ResponseEntity.ok(SearchResponse(emptyList(), emptyList(), emptyList(), emptyList(), emptyList()))
        }
        val pattern = "%${q.lowercase()}%"

        val assets = assetRepository.findAll({ root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false),
                cb.or(cb.like(cb.lower(root.get("name")), pattern), cb.like(cb.lower(root.get("assetTag")), pattern)))
        }, PageRequest.of(0, lim, Sort.by("name"))).content.map { SearchResultItem(it.id, it.name, "Tag: ${it.assetTag}") }

        val certs = certificateRepository.findAll({ root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false), cb.like(cb.lower(root.get("name")), pattern))
        }, PageRequest.of(0, lim, Sort.by("name"))).content.map { SearchResultItem(it.id, it.name, it.issuer) }

        val apps = applicationRepository.findAll({ root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false), cb.like(cb.lower(root.get("name")), pattern))
        }, PageRequest.of(0, lim, Sort.by("name"))).content.map { SearchResultItem(it.id, it.name, it.publisher) }

        val people = personRepository.findAll({ root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false), cb.like(cb.lower(root.get("fullName")), pattern))
        }, PageRequest.of(0, lim, Sort.by("fullName"))).content.map { SearchResultItem(it.id, it.fullName, it.email) }

        val locations = locationRepository.findAll({ root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false), cb.like(cb.lower(root.get("name")), pattern))
        }, PageRequest.of(0, lim, Sort.by("name"))).content.map { SearchResultItem(it.id, it.name, it.city) }

        return ResponseEntity.ok(SearchResponse(assets, certs, apps, people, locations))
    }
}
