package com.assetmanagement.api.dto

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ScimUser(
    val schemas: List<String> = listOf("urn:ietf:params:scim:schemas:core:2.0:User"),
    val id: String? = null,
    val externalId: String? = null,
    val userName: String? = null,
    val name: ScimName? = null,
    val emails: List<ScimEmail>? = null,
    val displayName: String? = null,
    val active: Boolean = true,
    val meta: ScimMeta? = null
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ScimName(
    val givenName: String? = null,
    val familyName: String? = null,
    val formatted: String? = null
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ScimEmail(
    val value: String? = null,
    val type: String? = "work",
    val primary: Boolean = true
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ScimMeta(
    val resourceType: String? = "User",
    val location: String? = null,
    val created: String? = null,
    val lastModified: String? = null
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ScimListResponse<T>(
    val schemas: List<String> = listOf("urn:ietf:params:scim:api:messages:2.0:ListResponse"),
    val totalResults: Int = 0,
    val startIndex: Int = 1,
    val itemsPerPage: Int = 0,
    @JsonProperty("Resources")
    val resources: List<T> = emptyList()
)

data class ScimPatchOp(
    val schemas: List<String> = listOf("urn:ietf:params:scim:api:messages:2.0:PatchOp"),
    @JsonProperty("Operations")
    val operations: List<ScimOperation> = emptyList()
)

data class ScimOperation(
    val op: String = "",
    val path: String? = null,
    val value: Any? = null
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ScimError(
    val schemas: List<String> = listOf("urn:ietf:params:scim:api:messages:2.0:Error"),
    val status: String,
    val detail: String? = null
)
