package com.assetmanagement.api.dto

import java.time.Instant
import java.util.*

data class UserAlertRuleDto(
    val id: UUID,
    val name: String,
    val entityTypes: String,
    val thresholds: String,
    val conditions: String?,
    val notifyEmail: Boolean,
    val isActive: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class CreateAlertRuleRequest(
    val name: String,
    val entityTypes: String,
    val thresholds: String,
    val notifyEmail: Boolean = false
)

data class UpdateAlertRuleRequest(
    val name: String,
    val entityTypes: String,
    val thresholds: String,
    val notifyEmail: Boolean = false,
    val isActive: Boolean = true
)
