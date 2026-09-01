package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.SavedView
import com.assetmanagement.api.repository.SavedViewRepository
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
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
    // Maps entities to DTOs, which walks lazy associations; open-session-in-view
    // is off, so the mapping has to happen inside a session.
    @Transactional(readOnly = true)
    fun getAll(@RequestParam entityType: String): ResponseEntity<Any> {
        if (entityType.isBlank()) return ResponseEntity.badRequest().body(mapOf("error" to "entityType is required"))
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val views = savedViewRepository.findByUserIdAndEntityType(userId, entityType)
            .sortedBy { it.name }.map { it.toDto() }
        return ResponseEntity.ok(views)
    }

    @PostMapping
    fun create(@RequestBody request: CreateSavedViewRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        invalid(request.entityType, request.name, request.configuration)?.let { return it }
        val view =
            SavedView(userId = userId, entityType = request.entityType, name = request.name, configuration = request.configuration)
        savedViewRepository.save(view)
        return ResponseEntity.created(URI("/api/v1/saved-views?entityType=${view.entityType}")).body(view.toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateSavedViewRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        invalid(null, request.name, request.configuration)?.let { return it }
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
    @Transactional
    fun setDefault(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val view = savedViewRepository.findById(id).orElse(null)
        if (view == null || view.userId != userId) return ResponseEntity.notFound().build()

        savedViewRepository.findByUserIdAndEntityType(userId, view.entityType)
            .filter { it.isDefault && it.id != id }
            .forEach { it.isDefault = false; it.updatedAt = Instant.now(); savedViewRepository.save(it) }

        view.isDefault = true; view.updatedAt = Instant.now()
        savedViewRepository.save(view)
        return ResponseEntity.ok(view.toDto())
    }

    private fun SavedView.toDto() = SavedViewDto(id, entityType, name, isDefault, configuration, createdAt, updatedAt)

    /**
     * A saved view is only useful if the client can read it back. The write path
     * accepted a blank name, a blank entity type, and a `configuration` that was
     * not JSON at all — and the UI parses that field inside a try/catch, so a bad
     * row does nothing, silently, every time it is applied.
     */
    private fun invalid(entityType: String?, name: String, configuration: String): ResponseEntity<Any>? {
        if (name.isBlank())
            return ResponseEntity.badRequest().body(mapOf("error" to "Name is required."))
        if (name.length > 255)
            return ResponseEntity.badRequest().body(mapOf("error" to "Name must be 255 characters or fewer."))
        if (entityType != null && entityType.isBlank())
            return ResponseEntity.badRequest().body(mapOf("error" to "Entity type is required."))
        try {
            tools.jackson.databind.json.JsonMapper.builder().build().readTree(configuration)
        } catch (e: tools.jackson.core.JacksonException) {
            // The parser's own message says where it broke, which is the only
            // useful thing to tell a caller that sent malformed JSON.
            return ResponseEntity.badRequest().body(mapOf(
                "error" to "Configuration must be valid JSON.",
                "message" to (e.originalMessage ?: "unparseable"),
            ))
        }
        return null
    }
}
