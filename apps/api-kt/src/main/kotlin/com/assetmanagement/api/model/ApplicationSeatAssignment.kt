package com.assetmanagement.api.model

import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "application_seat_assignments")
class ApplicationSeatAssignment(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "application_id", nullable = false, columnDefinition = "CHAR(36)")
    var applicationId: UUID = UUID.randomUUID(),

    @Column(name = "person_id", nullable = false, columnDefinition = "CHAR(36)")
    var personId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", insertable = false, updatable = false)
    var person: Person? = null,

    @Column(name = "assigned_at", nullable = false)
    var assignedAt: Instant = Instant.now(),

    @Column(name = "assigned_by_id", columnDefinition = "CHAR(36)")
    var assignedById: UUID? = null,

    @Column(name = "assigned_by_name")
    var assignedByName: String? = null,

    @Column(name = "notes", columnDefinition = "TEXT")
    var notes: String? = null
)
