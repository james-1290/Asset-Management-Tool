package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.RoleDto
import com.assetmanagement.api.repository.RoleRepository
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/roles")
@PreAuthorize("hasRole('Admin')")
class RolesController(
    private val roleRepository: RoleRepository
) {

    @GetMapping
    fun getAll(): ResponseEntity<List<RoleDto>> {
        val roles = roleRepository.findAll()
            .sortedBy { it.name }
            .map { RoleDto(it.id, it.name, it.description) }
        return ResponseEntity.ok(roles)
    }
}
