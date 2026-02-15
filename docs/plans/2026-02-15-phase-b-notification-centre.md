# Phase B: Notification Centre + User Alerts — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent in-app notification system with two-tier alerts (global admin + personal user), snooze/dismiss, a full notification centre page, per-type Slack channels, and personal alert rules.

**Architecture:** New `user_notifications` and `user_alert_rules` tables store per-user notification state and personal alert configs. The existing `AlertProcessingService` is extended to create `user_notifications` rows after sending email/Slack digests. New REST endpoints expose notification CRUD, and the frontend gets an enhanced bell + full notification centre page + personal alert rules UI.

**Tech Stack:** Kotlin/Spring Boot, MySQL 8.3, Flyway migrations, React + TypeScript, React Query, shadcn/ui, react-hook-form + zod

---

## Task 1: Database Migration — New Tables

**Files:**
- Create: `apps/api-kt/src/main/resources/db/migration/V008__user_notifications_and_alert_rules.sql`

**What to build:**
Two new tables: `user_notifications` (per-user notification with read/dismiss/snooze state) and `user_alert_rules` (personal alert rules). Also add 3 new system_setting keys for per-type Slack webhooks.

**SQL:**

```sql
CREATE TABLE user_notifications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    notification_type VARCHAR(20) NOT NULL DEFAULT 'global',
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL DEFAULT '',
    threshold_days INT NOT NULL,
    expiry_date DATETIME(6) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME(6) NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed_at DATETIME(6) NULL,
    snoozed_until DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_notif_user_read (user_id, is_read, is_dismissed),
    INDEX idx_user_notif_user_created (user_id, created_at),
    INDEX idx_user_notif_dedup (entity_type, entity_id, user_id, threshold_days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_alert_rules (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    entity_types VARCHAR(255) NOT NULL,
    thresholds VARCHAR(100) NOT NULL DEFAULT '90,30,14,7',
    conditions TEXT NULL,
    notify_email BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_user_alert_rules_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_alert_rules_user (user_id),
    INDEX idx_user_alert_rules_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Verify:** Start the API — Flyway should apply V008 without errors. Check tables exist:
```bash
curl -s http://localhost:5115/api/v1/health
```

**Commit:** `feat: add user_notifications and user_alert_rules tables (V008 migration)`

---

## Task 2: Backend Models + Repositories

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/UserNotification.kt`
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/model/UserAlertRule.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/repository/Repositories.kt`

**UserNotification.kt:**
```kotlin
package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "user_notifications")
class UserNotification(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    var userId: UUID = UUID.randomUUID(),

    @Column(name = "entity_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var entityType: String = "",

    @Column(name = "entity_id", nullable = false, columnDefinition = "CHAR(36)")
    var entityId: UUID = UUID.randomUUID(),

    @Column(name = "entity_name", nullable = false)
    var entityName: String = "",

    @Column(name = "notification_type", nullable = false, columnDefinition = "VARCHAR(20)")
    var notificationType: String = "global",

    @Column(name = "title", nullable = false)
    var title: String = "",

    @Column(name = "message", nullable = false)
    var message: String = "",

    @Column(name = "threshold_days", nullable = false)
    var thresholdDays: Int = 0,

    @Column(name = "expiry_date", nullable = false)
    var expiryDate: Instant = Instant.now(),

    @Column(name = "is_read", nullable = false)
    var isRead: Boolean = false,

    @Column(name = "read_at")
    var readAt: Instant? = null,

    @Column(name = "is_dismissed", nullable = false)
    var isDismissed: Boolean = false,

    @Column(name = "dismissed_at")
    var dismissedAt: Instant? = null,

    @Column(name = "snoozed_until")
    var snoozedUntil: Instant? = null,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now()
)
```

**UserAlertRule.kt:**
```kotlin
package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "user_alert_rules")
class UserAlertRule(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
    var userId: UUID = UUID.randomUUID(),

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "entity_types", nullable = false)
    var entityTypes: String = "",

    @Column(name = "thresholds", nullable = false)
    var thresholds: String = "90,30,14,7",

    @Column(name = "conditions", columnDefinition = "TEXT")
    var conditions: String? = null,

    @Column(name = "notify_email", nullable = false)
    var notifyEmail: Boolean = false,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
)
```

**Add to Repositories.kt:**
```kotlin
@Repository
interface UserNotificationRepository : JpaRepository<UserNotification, UUID>, JpaSpecificationExecutor<UserNotification> {
    fun countByUserIdAndIsReadFalseAndIsDismissedFalse(userId: UUID): Long
    fun existsByEntityTypeAndEntityIdAndUserIdAndThresholdDays(entityType: String, entityId: UUID, userId: UUID, thresholdDays: Int): Boolean
    fun findByUserIdAndIsDismissedFalseAndIsReadFalseOrderByCreatedAtDesc(userId: UUID, pageable: Pageable): Page<UserNotification>
}

@Repository
interface UserAlertRuleRepository : JpaRepository<UserAlertRule, UUID> {
    fun findByUserIdOrderByCreatedAtDesc(userId: UUID): List<UserAlertRule>
    fun findByIsActiveTrue(): List<UserAlertRule>
}
```

**Verify:** Build with `./gradlew build -x test` — no compilation errors.

**Commit:** `feat: add UserNotification and UserAlertRule models + repositories`

---

## Task 3: Backend DTOs

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/UserNotificationDtos.kt`
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/UserAlertRuleDtos.kt`

**UserNotificationDtos.kt:**
```kotlin
package com.assetmanagement.api.dto

import java.time.Instant
import java.util.UUID

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

data class SnoozeRequest(
    val duration: String  // "1d", "3d", "1w", "until_expiry"
)

data class UnreadCountResponse(
    val count: Long
)
```

**UserAlertRuleDtos.kt:**
```kotlin
package com.assetmanagement.api.dto

import java.time.Instant
import java.util.UUID

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
```

**Commit:** `feat: add notification and alert rule DTOs`

---

## Task 4: Backend — UserNotificationsController

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/UserNotificationsController.kt`

**What to build:** REST endpoints for listing, reading, dismissing, snoozing, and bulk-reading notifications for the current user.

```kotlin
package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.UserNotification
import com.assetmanagement.api.repository.UserNotificationRepository
import com.assetmanagement.api.service.CurrentUserService
import jakarta.persistence.criteria.Predicate
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@RestController
@RequestMapping("/api/v1/user-notifications")
class UserNotificationsController(
    private val userNotificationRepository: UserNotificationRepository,
    private val currentUserService: CurrentUserService
) {
    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int,
        @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(defaultValue = "all") status: String  // "unread", "read", "all"
    ): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val now = Instant.now()

        val spec = Specification<UserNotification> { root, _, cb ->
            val predicates = mutableListOf<Predicate>()
            predicates.add(cb.equal(root.get<UUID>("userId"), userId))

            when (status) {
                "unread" -> {
                    predicates.add(cb.equal(root.get<Boolean>("isRead"), false))
                    predicates.add(cb.equal(root.get<Boolean>("isDismissed"), false))
                }
                "read" -> predicates.add(cb.equal(root.get<Boolean>("isRead"), true))
            }

            cb.and(*predicates.toTypedArray())
        }

        val pageable = PageRequest.of(
            (page - 1).coerceAtLeast(0), pageSize,
            Sort.by(Sort.Direction.DESC, "createdAt")
        )
        val result = userNotificationRepository.findAll(spec, pageable)

        return ResponseEntity.ok(PagedResponse(
            items = result.content.map { it.toDto() },
            page = page,
            pageSize = pageSize,
            totalCount = result.totalElements
        ))
    }

    @GetMapping("/unread-count")
    fun getUnreadCount(): ResponseEntity<UnreadCountResponse> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val count = userNotificationRepository.countByUserIdAndIsReadFalseAndIsDismissedFalse(userId)
        return ResponseEntity.ok(UnreadCountResponse(count))
    }

    @PostMapping("/{id}/read")
    fun markRead(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (notif.userId != userId) return ResponseEntity.status(403).build()

        notif.isRead = true
        notif.readAt = Instant.now()
        userNotificationRepository.save(notif)
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/{id}/dismiss")
    fun dismiss(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (notif.userId != userId) return ResponseEntity.status(403).build()

        notif.isDismissed = true
        notif.dismissedAt = Instant.now()
        userNotificationRepository.save(notif)
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/{id}/snooze")
    fun snooze(@PathVariable id: UUID, @RequestBody request: SnoozeRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val notif = userNotificationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (notif.userId != userId) return ResponseEntity.status(403).build()

        val now = Instant.now()
        notif.snoozedUntil = when (request.duration) {
            "1d" -> now.plus(1, ChronoUnit.DAYS)
            "3d" -> now.plus(3, ChronoUnit.DAYS)
            "1w" -> now.plus(7, ChronoUnit.DAYS)
            "until_expiry" -> notif.expiryDate
            else -> return ResponseEntity.badRequest().body(mapOf("error" to "Invalid duration. Use: 1d, 3d, 1w, until_expiry"))
        }
        userNotificationRepository.save(notif)
        return ResponseEntity.ok(notif.toDto())
    }

    @PostMapping("/read-all")
    fun markAllRead(): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()

        val spec = Specification<UserNotification> { root, _, cb ->
            cb.and(
                cb.equal(root.get<UUID>("userId"), userId),
                cb.equal(root.get<Boolean>("isRead"), false),
                cb.equal(root.get<Boolean>("isDismissed"), false)
            )
        }
        val unread = userNotificationRepository.findAll(spec)
        val now = Instant.now()
        unread.forEach { it.isRead = true; it.readAt = now }
        userNotificationRepository.saveAll(unread)

        return ResponseEntity.ok(mapOf("marked" to unread.size))
    }

    private fun UserNotification.toDto() = UserNotificationDto(
        id = id, entityType = entityType, entityId = entityId, entityName = entityName,
        notificationType = notificationType, title = title, message = message,
        thresholdDays = thresholdDays, expiryDate = expiryDate, isRead = isRead,
        readAt = readAt, isDismissed = isDismissed, dismissedAt = dismissedAt,
        snoozedUntil = snoozedUntil, createdAt = createdAt
    )
}
```

**Verify:** Build, start API, test with curl:
```bash
TOKEN=$(curl -s -X POST http://localhost:5115/api/v1/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | jq -r .token)
curl -s http://localhost:5115/api/v1/user-notifications -H "Authorization: Bearer $TOKEN" | jq .
curl -s http://localhost:5115/api/v1/user-notifications/unread-count -H "Authorization: Bearer $TOKEN" | jq .
```

**Commit:** `feat: add UserNotificationsController with read/dismiss/snooze endpoints`

---

## Task 5: Backend — UserAlertRulesController

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/UserAlertRulesController.kt`

**What to build:** CRUD endpoints for personal alert rules.

```kotlin
package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.*
import com.assetmanagement.api.model.UserAlertRule
import com.assetmanagement.api.repository.UserAlertRuleRepository
import com.assetmanagement.api.service.CurrentUserService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/alert-rules")
class UserAlertRulesController(
    private val userAlertRuleRepository: UserAlertRuleRepository,
    private val currentUserService: CurrentUserService
) {
    @GetMapping
    fun getAll(): ResponseEntity<List<UserAlertRuleDto>> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rules = userAlertRuleRepository.findByUserIdOrderByCreatedAtDesc(userId)
        return ResponseEntity.ok(rules.map { it.toDto() })
    }

    @PostMapping
    fun create(@RequestBody request: CreateAlertRuleRequest): ResponseEntity<UserAlertRuleDto> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rule = UserAlertRule(
            userId = userId,
            name = request.name.trim(),
            entityTypes = request.entityTypes,
            thresholds = request.thresholds,
            notifyEmail = request.notifyEmail
        )
        val saved = userAlertRuleRepository.save(rule)
        return ResponseEntity.created(URI("/api/v1/alert-rules/${saved.id}")).body(saved.toDto())
    }

    @PutMapping("/{id}")
    fun update(@PathVariable id: UUID, @RequestBody request: UpdateAlertRuleRequest): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rule = userAlertRuleRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (rule.userId != userId) return ResponseEntity.status(403).build()

        rule.name = request.name.trim()
        rule.entityTypes = request.entityTypes
        rule.thresholds = request.thresholds
        rule.notifyEmail = request.notifyEmail
        rule.isActive = request.isActive
        rule.updatedAt = Instant.now()
        userAlertRuleRepository.save(rule)
        return ResponseEntity.ok(rule.toDto())
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: UUID): ResponseEntity<Any> {
        val userId = currentUserService.userId ?: return ResponseEntity.status(401).build()
        val rule = userAlertRuleRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        if (rule.userId != userId) return ResponseEntity.status(403).build()

        userAlertRuleRepository.delete(rule)
        return ResponseEntity.noContent().build()
    }

    private fun UserAlertRule.toDto() = UserAlertRuleDto(
        id = id, name = name, entityTypes = entityTypes, thresholds = thresholds,
        conditions = conditions, notifyEmail = notifyEmail, isActive = isActive,
        createdAt = createdAt, updatedAt = updatedAt
    )
}
```

**Verify:** Build, start API, curl CRUD:
```bash
# Create
curl -s -X POST http://localhost:5115/api/v1/alert-rules -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"Finance licences","entityTypes":"Application","thresholds":"60,30","notifyEmail":true}' | jq .
# List
curl -s http://localhost:5115/api/v1/alert-rules -H "Authorization: Bearer $TOKEN" | jq .
```

**Commit:** `feat: add UserAlertRulesController with CRUD endpoints`

---

## Task 6: Backend — Extend AlertProcessingService to Create User Notifications

**Files:**
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/service/AlertProcessingService.kt`

**What to change:** After `processAlerts()` sends email/Slack, also create `user_notifications` rows for all active users (global alerts). Also add `processPersonalAlerts()` that runs personal rules per user.

Key additions:
1. Inject `UserNotificationRepository`, `UserAlertRuleRepository`, `UserRepository`
2. In `processAlerts()`, after existing email/Slack sending, call `createGlobalNotifications(allItems)` which creates one `UserNotification` per active user per expiring item (with dedup check)
3. Add `processPersonalAlerts()` — iterates active `UserAlertRule` records, queries expiring items for that rule's entity types and thresholds, creates `UserNotification` with `notificationType = "personal"`, optionally sends email to user's address
4. Call both from the scheduler

**Dedup logic:** Before creating a UserNotification, check `existsByEntityTypeAndEntityIdAndUserIdAndThresholdDays()` — skip if already exists.

**Title format:** `"${entityName} — ${entityType} expiring in ${daysUntilExpiry} days"` (or "expired" if past)

**Commit:** `feat: extend AlertProcessingService to create user notifications (global + personal)`

---

## Task 7: Backend — Per-Type Slack Webhooks

**Files:**
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/service/SlackService.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/service/AlertProcessingService.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/controller/SettingsController.kt`
- Modify: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/dto/SettingsDtos.kt`

**What to change:**

1. **SettingsDtos.kt** — Add to `AlertSettingsDto`:
   ```kotlin
   val slackWarrantyWebhookUrl: String = "",
   val slackCertificateWebhookUrl: String = "",
   val slackLicenceWebhookUrl: String = ""
   ```

2. **SettingsController.kt** — Read/write the 3 new system_setting keys in `getAlerts()`/`updateAlerts()`:
   - `alerts.slack.warrantyWebhookUrl`
   - `alerts.slack.certificateWebhookUrl`
   - `alerts.slack.licenceWebhookUrl`
   - Mask values on read (same pattern as existing webhook)

3. **SlackService.kt** — Change `sendDigestMessage()` to accept optional per-type webhook URLs. If a per-type webhook is set, send that type's items to that webhook separately. If not set, fall back to global webhook. Refactor into `sendToWebhook(webhookUrl, orgName, items, sectionTitle)`.

4. **AlertProcessingService.kt** — Read the 3 per-type webhook settings and pass them to SlackService.

**Verify:** Set a per-type webhook in settings, trigger alerts, verify Slack message goes to correct channel.

**Commit:** `feat: add per-type Slack webhook channels (warranty, certificate, licence)`

---

## Task 8: Backend — Notification Cleanup Scheduled Job

**Files:**
- Create: `apps/api-kt/src/main/kotlin/com/assetmanagement/api/service/NotificationCleanupService.kt`

**What to build:** A `@Scheduled` job that deletes `user_notifications` older than 90 days.

```kotlin
package com.assetmanagement.api.service

import com.assetmanagement.api.repository.UserNotificationRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class NotificationCleanupService(
    private val userNotificationRepository: UserNotificationRepository
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 0 3 * * *")  // Daily at 3 AM
    fun cleanupOldNotifications() {
        val cutoff = Instant.now().minus(90, ChronoUnit.DAYS)
        // Use a custom query method
        val count = userNotificationRepository.deleteByCreatedAtBefore(cutoff)
        if (count > 0) {
            logger.info("Cleaned up $count notifications older than 90 days")
        }
    }
}
```

Add to `UserNotificationRepository`:
```kotlin
@Modifying
@Query("DELETE FROM UserNotification n WHERE n.createdAt < :cutoff")
fun deleteByCreatedAtBefore(@Param("cutoff") cutoff: Instant): Int
```

**Commit:** `feat: add daily notification cleanup job (90-day retention)`

---

## Task 9: Frontend — API Client + Types + Hooks for Notifications

**Files:**
- Create: `apps/web/src/lib/api/user-notifications.ts`
- Create: `apps/web/src/types/user-notification.ts`
- Create: `apps/web/src/hooks/use-user-notifications.ts`

**Types (`user-notification.ts`):**
```typescript
export interface UserNotification {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  notificationType: "global" | "personal";
  title: string;
  message: string;
  thresholdDays: number;
  expiryDate: string;
  isRead: boolean;
  readAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
}

export interface UserAlertRule {
  id: string;
  name: string;
  entityTypes: string;
  thresholds: string;
  conditions: string | null;
  notifyEmail: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  entityTypes: string;
  thresholds: string;
  notifyEmail: boolean;
}

export interface UpdateAlertRuleRequest extends CreateAlertRuleRequest {
  isActive: boolean;
}
```

**API client (`user-notifications.ts`):** Standard `apiClient.get/post/put/delete` calls to `/user-notifications` and `/alert-rules` endpoints.

**Hooks (`use-user-notifications.ts`):** React Query hooks:
- `useUserNotifications(page, status)` — paginated list
- `useUnreadCount()` — lightweight count with 60s refetch + refetchOnWindowFocus
- `useMarkRead()`, `useDismiss()`, `useSnooze()`, `useMarkAllRead()` — mutations that invalidate queries
- `useAlertRules()`, `useCreateAlertRule()`, `useUpdateAlertRule()`, `useDeleteAlertRule()` — CRUD hooks

**Commit:** `feat: add frontend API client, types, and React Query hooks for notifications`

---

## Task 10: Frontend — Enhanced NotificationsBell

**Files:**
- Modify: `apps/web/src/components/notifications-bell.tsx`

**What to change:** Replace the current summary-based bell with one powered by `useUnreadCount()` and `useUserNotifications()`. The popover should show actual `UserNotification` items (not just expiry summaries) with read/snooze/dismiss actions.

Key changes:
1. Badge count from `useUnreadCount()` instead of `useNotificationSummary()`
2. Popover lists notifications where `isDismissed=false` and (`snoozedUntil` is null or past)
3. Each item shows: entity name, title, urgency color, time ago
4. Actions per item: "Mark read" (eye icon), "Snooze" (clock icon with dropdown: 1 day, 3 days, 1 week, until expiry), "Dismiss" (x icon)
5. "Mark all read" button at top
6. "View all" link at bottom → navigates to `/notifications`
7. Keep existing urgency color logic (red/orange/yellow based on days until expiry)

**Commit:** `feat: enhance notifications bell with read/snooze/dismiss actions`

---

## Task 11: Frontend — Notification Centre Page

**Files:**
- Create: `apps/web/src/pages/notifications.tsx`
- Modify: `apps/web/src/App.tsx` (add route)

**What to build:** Full-page notification centre with two tabs: Current and History.

**Current tab:** Shows unread + snoozed-expired notifications. Each row: entity type badge, entity name (clickable → detail page), title, expiry date, urgency color, time ago, actions (read/snooze/dismiss). Bulk "Mark all read" button.

**History tab:** Shows all notifications (including read/dismissed). Same columns plus status column (Read, Dismissed, Snoozed). No actions needed.

Use `useUserNotifications()` with `status` param ("unread" for Current, "all" for History). Standard `PageHeader` + `DataTable` or simple table layout. Pagination at bottom.

**Route:** Add `<Route path="/notifications" element={<NotificationsPage />} />` to App.tsx.

**Commit:** `feat: add notification centre page with current/history tabs`

---

## Task 12: Frontend — My Alerts (Personal Alert Rules)

**Files:**
- Create: `apps/web/src/components/settings/my-alerts-tab.tsx`
- Modify: `apps/web/src/pages/settings.tsx` (add tab)

**What to build:** A "My Alerts" tab in Settings page where users can create/edit/delete personal alert rules.

**UI:**
- List of alert rules as cards: name, entity types badges, thresholds, email toggle, active/inactive toggle
- "New Alert Rule" button → dialog with form:
  - Name (text input)
  - Entity types (checkboxes: Warranties, Certificates, Licences)
  - Thresholds (text input, comma-separated days, e.g. "60,30,14")
  - Email notifications toggle
- Edit button on each rule → same dialog prefilled
- Delete button with confirmation
- Active/inactive toggle inline

**Settings page change:** Add "My Alerts" to TABS array (visible to all users, not just admin). Add `<TabsTrigger>` and `<TabsContent>`.

**Commit:** `feat: add My Alerts settings tab for personal alert rules`

---

## Task 13: Frontend — Per-Type Slack Webhooks in Admin Settings

**Files:**
- Modify: `apps/web/src/components/settings/alerts-tab.tsx`
- Modify: `apps/web/src/types/settings.ts`

**What to change:**

1. **types/settings.ts** — Add to `AlertSettings`:
   ```typescript
   slackWarrantyWebhookUrl: string;
   slackCertificateWebhookUrl: string;
   slackLicenceWebhookUrl: string;
   ```

2. **alerts-tab.tsx** — Replace single Slack webhook field with 4 fields:
   - Default (fallback) — existing `slackWebhookUrl`
   - Warranties channel — `slackWarrantyWebhookUrl`
   - Certificates channel — `slackCertificateWebhookUrl`
   - Licences channel — `slackLicenceWebhookUrl`
   - Helper text: "Per-type webhooks override the default. Leave blank to use default."

**Commit:** `feat: add per-type Slack webhook fields to admin alert settings`

---

## Task 14: Sidebar Nav + Verification + Docs

**Files:**
- Modify: `apps/web/src/components/app-sidebar.tsx` (add Notifications nav item)
- Modify: `CHANGELOG.md`
- Modify: `tasks/todo.md`

**Sidebar:** Add a "Notifications" nav item under the standalone section (near Dashboard), with `Bell` icon from lucide-react, pointing to `/notifications`.

**Verify:**
1. Build backend: `./gradlew build -x test` — no errors
2. Build frontend: `npx tsc --noEmit` — no errors
3. Start API, login, verify all new endpoints with curl
4. Start frontend, verify bell shows unread count, popover has actions, notification centre page loads, My Alerts tab works

**CHANGELOG:** Add Phase B entry with timestamp.

**todo.md:** Add Phase B completion item.

**Commit:** `docs: update CHANGELOG and todo for Phase B notification centre`
