package com.assetmanagement.api.dto

import java.util.*

data class BulkArchiveRequest(
    val ids: List<UUID>
)

data class BulkStatusRequest(
    val ids: List<UUID>,
    val status: String
)

data class BulkActionResponse(
    val succeeded: Int,
    val failed: Int
)
