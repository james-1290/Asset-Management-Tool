package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "alert_history")
class AlertHistory(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "entity_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var entityType: String = "",

    @Column(name = "entity_id", nullable = false, columnDefinition = "CHAR(36)")
    var entityId: UUID = UUID.randomUUID(),

    @Column(name = "entity_name", nullable = false)
    var entityName: String = "",

    @Column(name = "threshold_days", nullable = false)
    var thresholdDays: Int = 0,

    @Column(name = "expiry_date", nullable = false)
    var expiryDate: Instant = Instant.now(),

    @Column(name = "sent_at", nullable = false)
    var sentAt: Instant = Instant.now(),

    @Column(name = "run_id", nullable = false, columnDefinition = "CHAR(36)")
    var runId: UUID = UUID.randomUUID(),

    @Column(name = "recipients", nullable = false, columnDefinition = "TEXT")
    var recipients: String = ""
)
