package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class NotificationItem(
    val id: UUID,
    val name: String,
    val expiryDate: Instant
)

data class NotificationGroup(
    val count: Int,
    val items: List<NotificationItem>
)

data class NotificationSummary(
    val totalCount: Int,
    val warranties: NotificationGroup,
    val certificates: NotificationGroup,
    val licences: NotificationGroup
)
