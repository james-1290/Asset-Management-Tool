package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.SavedView
import com.assetmanagement.api.repository.SavedViewRepository
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.time.Instant
import java.util.*

@RestController
@RequestMapping("/api/v1/saved-views")
class SavedViewsController(
    private val savedViewRepository: SavedViewRepository,
    private val currentUserService: CurrentUserService
) {

    @GetMapping
    fun getAll(@RequestParam entityType: String): ResponseEntity<Any> {
        if (entityType.isBlank()) return ResponseEntity.badRequest().body("entityType is required")
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val views = savedViewRepository.findByUserIdAndEntityType(userId, entityType)
            .sortedBy { it.name }.map { it.toDto() }
        return ResponseEntity.ok(views)
    }

    @PostMapping
    fun create(@RequestBody request: CreateSavedViewRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val view = SavedView(userId = userId, entityType = request.entityType, name = request.name, configuration = request.configuration)
        savedViewRepository.save(view)
        return ResponseEntity.created(URI("/api/v1/saved-views?entityType=${view.entityType}")).body(view.toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateSavedViewRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val view = savedViewRepository.findById(id).orElse(null)
        if (view == null || view.userId != userId) return ResponseEntity.notFound().build()
        view.name = request.name; view.configuration = request.configuration; view.updatedAt = Instant.now()
        savedViewRepository.save(view)
        return ResponseEntity.ok(view.toDto())
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val view = savedViewRepository.findById(id).orElse(null)
        if (view == null || view.userId != userId) return ResponseEntity.notFound().build()
        savedViewRepository.delete(view)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{id}/default")
    fun setDefault(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val view = savedViewRepository.findById(id).orElse(null)
        if (view == null || view.userId != userId) return ResponseEntity.notFound().build()

        savedViewRepository.findByUserIdAndEntityType(userId, view.entityType)
            .filter { it.isDefault && it.id != id }
            .forEach { it.isDefault = false; it.updatedAt = Instant.now(); savedViewRepository.save(it) }

        view.isDefault = !view.isDefault; view.updatedAt = Instant.now()
        savedViewRepository.save(view)
        return ResponseEntity.ok(view.toDto())
    }

    private fun SavedView.toDto() = SavedViewDto(id, entityType, name, isDefault, configuration, createdAt, updatedAt)
}
