package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class UserNotificationDto(
    val id: UUID,
    val entityType: String,
    val entityId: UUID,
    val entityName: String,
    val notificationType: String,
    val title: String,
    val message: String,
    val thresholdDays: Int,
    val expiryDate: Instant,
    val isRead: Boolean,
    val readAt: Instant?,
    val isDismissed: Boolean,
    val dismissedAt: Instant?,
    val snoozedUntil: Instant?,
    val createdAt: Instant
)

data class SnoozeRequest(val duration: String)

data class UnreadCountResponse(val count: Long)
