package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.service.ScimService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/scim/v2")
@ConditionalOnProperty(name = ["scim.enabled"], havingValue = "true")
class ScimController(
    private val scimService: ScimService
) {
    companion object {
        val SCIM_JSON = MediaType.parseMediaType("application/scim+json")
    }

    private fun baseUrl(request: HttpServletRequest): String {
        val scheme = request.getHeader("X-Forwarded-Proto") ?: request.scheme
        val host = request.getHeader("X-Forwarded-Host") ?: "${request.serverName}:${request.serverPort}"
        return "$scheme://$host"
    }

    @GetMapping("/ServiceProviderConfig", produces = ["application/scim+json"])
    fun serviceProviderConfig(): ResponseEntity<Map<String, Any>> {
        val config = mapOf(
            "schemas" to listOf("urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"),
            "documentationUri" to "https://tools.ietf.org/html/rfc7644",
            "patch" to mapOf("supported" to true),
            "bulk" to mapOf("supported" to false, "maxOperations" to 0, "maxPayloadSize" to 0),
            "filter" to mapOf("supported" to true, "maxResults" to 200),
            "changePassword" to mapOf("supported" to false),
            "sort" to mapOf("supported" to false),
            "etag" to mapOf("supported" to false),
            "authenticationSchemes" to listOf(
                mapOf(
                    "type" to "oauthbearertoken",
                    "name" to "OAuth Bearer Token",
                    "description" to "Authentication scheme using the OAuth Bearer Token Standard"
                )
            )
        )
        return ResponseEntity.ok().contentType(SCIM_JSON).body(config)
    }

    @GetMapping("/Schemas", produces = ["application/scim+json"])
    fun schemas(): ResponseEntity<Map<String, Any>> {
        val userSchema = mapOf(
            "id" to "urn:ietf:params:scim:schemas:core:2.0:User",
            "name" to "User",
            "description" to "User Account",
            "attributes" to listOf(
                mapOf("name" to "userName", "type" to "string", "required" to true, "uniqueness" to "server"),
                mapOf("name" to "displayName", "type" to "string", "required" to false),
                mapOf("name" to "active", "type" to "boolean", "required" to false),
                mapOf("name" to "emails", "type" to "complex", "multiValued" to true, "required" to false),
                mapOf("name" to "externalId", "type" to "string", "required" to false),
                mapOf("name" to "name", "type" to "complex", "required" to false)
            )
        )
        return ResponseEntity.ok().contentType(SCIM_JSON).body(
            mapOf(
                "schemas" to listOf("urn:ietf:params:scim:api:messages:2.0:ListResponse"),
                "totalResults" to 1,
                "Resources" to listOf(userSchema)
            )
        )
    }

    @GetMapping("/ResourceTypes", produces = ["application/scim+json"])
    fun resourceTypes(): ResponseEntity<Map<String, Any>> {
        val resourceType = mapOf(
            "schemas" to listOf("urn:ietf:params:scim:schemas:core:2.0:ResourceType"),
            "id" to "User",
            "name" to "User",
            "endpoint" to "/scim/v2/Users",
            "schema" to "urn:ietf:params:scim:schemas:core:2.0:User"
        )
        return ResponseEntity.ok().contentType(SCIM_JSON).body(
            mapOf(
                "schemas" to listOf("urn:ietf:params:scim:api:messages:2.0:ListResponse"),
                "totalResults" to 1,
                "Resources" to listOf(resourceType)
            )
        )
    }

    @GetMapping("/Users", produces = ["application/scim+json"])
    fun listUsers(
        @RequestParam(required = false) filter: String?,
        @RequestParam(defaultValue = "1") startIndex: Int,
        @RequestParam(defaultValue = "100") count: Int,
        request: HttpServletRequest
    ): ResponseEntity<ScimListResponse<ScimUser>> {
        val result = scimService.listUsers(filter, startIndex, count, baseUrl(request))
        return ResponseEntity.ok().contentType(SCIM_JSON).body(result)
    }

    @GetMapping("/Users/{id}", produces = ["application/scim+json"])
    fun getUser(@PathVariable id: UUID, request: HttpServletRequest): ResponseEntity<Any> {
        val user = scimService.getUser(id, baseUrl(request))
            ?: return notFound("User $id not found")
        return ResponseEntity.ok().contentType(SCIM_JSON).body(user)
    }

    @PostMapping("/Users", produces = ["application/scim+json"], consumes = ["application/scim+json", "application/json"])
    fun createUser(@RequestBody scimUser: ScimUser, request: HttpServletRequest): ResponseEntity<Any> {
        return try {
            val created = scimService.createUser(scimUser, baseUrl(request))
            ResponseEntity.status(HttpStatus.CREATED).contentType(SCIM_JSON).body(created)
        } catch (e: Exception) {
            ResponseEntity.status(HttpStatus.CONFLICT).contentType(SCIM_JSON).body(
                ScimError(status = "409", detail = e.message ?: "User already exists")
            )
        }
    }

    @PutMapping("/Users/{id}", produces = ["application/scim+json"], consumes = ["application/scim+json", "application/json"])
    fun replaceUser(@PathVariable id: UUID, @RequestBody scimUser: ScimUser, request: HttpServletRequest): ResponseEntity<Any> {
        val updated = scimService.replaceUser(id, scimUser, baseUrl(request))
            ?: return notFound("User $id not found")
        return ResponseEntity.ok().contentType(SCIM_JSON).body(updated)
    }

    @PatchMapping("/Users/{id}", produces = ["application/scim+json"], consumes = ["application/scim+json", "application/json"])
    fun patchUser(@PathVariable id: UUID, @RequestBody patchOp: ScimPatchOp, request: HttpServletRequest): ResponseEntity<Any> {
        val updated = scimService.patchUser(id, patchOp, baseUrl(request))
            ?: return notFound("User $id not found")
        return ResponseEntity.ok().contentType(SCIM_JSON).body(updated)
    }

    @DeleteMapping("/Users/{id}", produces = ["application/scim+json"])
    fun deleteUser(@PathVariable id: UUID): ResponseEntity<Any> {
        return if (scimService.deactivateUser(id)) {
            ResponseEntity.noContent().build()
        } else {
            notFound("User $id not found")
        }
    }

    private fun notFound(detail: String): ResponseEntity<Any> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(SCIM_JSON).body(
            ScimError(status = "404", detail = detail)
        )
    }
}
