# Phase B: Notification Centre + User Alerts — Design

**Date:** 2026-02-15

**Goal:** Add a persistent in-app notification system with two-tier alerts (global admin + personal user), snooze/dismiss, a full notification centre page, and per-type Slack channels.

---

## 1. Two-Tier Alert Model

### Global Alerts (existing, enhanced)
Admin configures alert rules in Settings (warranty/certificate/licence expiry thresholds). These generate notifications visible to **all active users**. The existing `AlertProcessingService` continues to drive email/Slack digests unchanged. After processing, it now also creates `user_notifications` rows for every active user.

### Personal Alerts (new)
Any user can create their own alert rules via a "My Alerts" section. Examples: finance wants licences over £5k expiring within 60 days. Personal alerts only notify that user (in-app + optional email to their registered address). Personal rules are stored in `user_alert_rules` and processed by the same scheduler.

---

## 2. In-App Notification System

### Bell Icon (enhanced)
- Badge shows **unread count** from new lightweight endpoint
- Popover shows current/upcoming notifications (not dismissed, not snoozed)
- Each notification has actions: **Mark as read**, **Snooze** (1 day, 3 days, 1 week, until expiry), **Dismiss**
- Dismissed notifications disappear from bell but remain in history

### Notification Centre Page (`/notifications`)
- **Current tab** — active notifications (unread + snoozed items whose snooze expired)
- **History tab** — all past notifications (read, dismissed, expired) with date
- Filters: type (warranty/certificate/licence), read state
- Bulk "Mark all as read" action
- Auto-purge notifications older than 90 days (background cleanup)

---

## 3. Database Changes

### New: `user_notifications`
| Column | Type | Notes |
|--------|------|-------|
| id | CHAR(36) PK | UUID |
| user_id | CHAR(36) FK | → users.id |
| entity_type | VARCHAR(50) | Asset, Certificate, Application |
| entity_id | CHAR(36) | |
| entity_name | VARCHAR(255) | Denormalized for display |
| notification_type | VARCHAR(20) | "global" or "personal" |
| title | VARCHAR(255) | e.g. "Warranty expiring in 7 days" |
| message | VARCHAR(500) | Detail text |
| threshold_days | INT | Which threshold triggered this |
| expiry_date | DATE | The actual expiry date |
| is_read | BOOLEAN | Default false |
| read_at | TIMESTAMP | Nullable |
| is_dismissed | BOOLEAN | Default false |
| dismissed_at | TIMESTAMP | Nullable |
| snoozed_until | TIMESTAMP | Nullable; if set and in future, hide from bell |
| created_at | TIMESTAMP | |

Indexes: (user_id, is_read, is_dismissed), (user_id, created_at), (entity_type, entity_id, user_id, threshold_days) for dedup.

### New: `user_alert_rules`
| Column | Type | Notes |
|--------|------|-------|
| id | CHAR(36) PK | UUID |
| user_id | CHAR(36) FK | → users.id |
| name | VARCHAR(100) | User-provided label |
| entity_types | VARCHAR(255) | Comma-separated: "Asset", "Certificate", "Application" |
| thresholds | VARCHAR(100) | Comma-separated days: "90,30,14,7" |
| conditions | TEXT | Optional JSON for future filters (cost range, type, etc.) |
| notify_email | BOOLEAN | Also send email to user's address |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Modified: `system_setting` (new keys)
- `alerts.slack.warrantyWebhookUrl` — Slack webhook for warranty alerts
- `alerts.slack.certificateWebhookUrl` — Slack webhook for certificate alerts
- `alerts.slack.licenceWebhookUrl` — Slack webhook for licence alerts

Existing `alerts.slack.webhookUrl` becomes the fallback/default.

---

## 4. Multiple Slack Channels

Extend the admin Alerts settings to support per-alert-type Slack webhooks:
- Three optional webhook fields: Warranties, Certificates, Licences
- If a per-type webhook is set, alerts of that type go to that channel
- If not set, falls back to the existing global webhook
- `SlackService.sendDigestMessage()` updated to accept webhook URL parameter

---

## 5. Backend Endpoints

### New Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/notifications` | Paginated user notifications (query: status=unread\|read\|all) |
| GET | `/api/v1/notifications/unread-count` | Lightweight count for bell badge |
| POST | `/api/v1/notifications/{id}/read` | Mark single notification as read |
| POST | `/api/v1/notifications/{id}/dismiss` | Dismiss notification |
| POST | `/api/v1/notifications/{id}/snooze` | Snooze with body: { duration: "1d"\|"3d"\|"1w"\|"until_expiry" } |
| POST | `/api/v1/notifications/read-all` | Mark all as read for current user |
| GET | `/api/v1/alert-rules` | List user's personal alert rules |
| POST | `/api/v1/alert-rules` | Create personal alert rule |
| PUT | `/api/v1/alert-rules/{id}` | Update personal alert rule |
| DELETE | `/api/v1/alert-rules/{id}` | Delete personal alert rule |

### Modified Services
- **AlertProcessingService**: After sending email/Slack, create `user_notifications` for all active users (global) or specific user (personal rules). Dedup against existing notifications (same entity + threshold + user).
- **SlackService**: Accept per-type webhook URL, fall back to global.
- **New: NotificationCleanupService**: Scheduled job to purge notifications older than 90 days.

---

## 6. Frontend Changes

### Enhanced NotificationsBell
- Fetch unread count from `/api/v1/notifications/unread-count` (poll every 60s)
- Popover: list notifications where `is_dismissed=false` and (`snoozed_until` is null or in the past)
- Each item: entity name, expiry info, urgency color + actions (read, snooze dropdown, dismiss)
- "View all" link to `/notifications`

### New: Notification Centre Page (`/notifications`)
- Two tabs: Current / History
- Current: unread + snoozed-expired notifications, bulk "Mark all read"
- History: all notifications with read/dismissed state, date, type filter
- Click notification to navigate to entity detail page

### New: My Alerts Section (user settings or profile)
- List of user's personal alert rules
- Create/edit dialog: name, entity types (checkboxes), thresholds, email toggle
- Enable/disable toggle per rule
- Delete with confirmation

### Enhanced Admin Alerts Tab
- Replace single Slack webhook field with three per-type fields + existing global as fallback
- Label: "Warranties channel", "Certificates channel", "Licences channel", "Default (fallback)"

---

## 7. User Flow

### Admin sets up global alerts (existing)
1. Admin enables warranty/cert/licence alerts with thresholds
2. Scheduler fires → finds expiring items → sends email digest + Slack
3. **New:** Also creates `user_notifications` for all active users
4. All users see these in their bell + notification centre

### User creates personal alert
1. User goes to My Alerts → "New Alert Rule"
2. Sets: "Finance licence check" — Licences only, 60 + 30 day thresholds, email on
3. Scheduler processes personal rules alongside global ones
4. Only that user gets notifications (in-app + email to their address)

### User interacts with notification
1. Bell shows unread count (3)
2. User opens popover, sees "SSL Certificate expiring in 14 days"
3. User clicks "Snooze → 1 week" → notification hidden until next week
4. Or clicks "Dismiss" → gone from bell, visible in history
5. Or clicks notification → navigates to certificate detail page

---

## Decisions

- **No email template customisation** — hardcoded HTML templates remain
- **Notification dedup** — same entity + threshold + user = don't create duplicate
- **90-day auto-purge** — keeps notification table manageable
- **Personal alert conditions (JSON)** — designed for future cost/type filtering but not implemented in Phase B
- **Bell polling** — 60-second interval (same as current), not WebSockets
