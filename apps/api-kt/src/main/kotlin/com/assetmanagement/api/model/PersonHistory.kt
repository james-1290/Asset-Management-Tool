package com.assetmanagement.api.model

import com.assetmanagement.api.model.enums.PersonHistoryEventType
import jakarta.persistence.*
import java.time.Instant
import java.util.*

@Entity
@Table(name = "person_history", indexes = [Index(columnList = "person_id")])
class PersonHistory(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "person_id", nullable = false, columnDefinition = "CHAR(36)")
    var personId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "person_id", insertable = false, updatable = false)
    var person: Person? = null,

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, columnDefinition = "VARCHAR(50)")
    var eventType: PersonHistoryEventType = PersonHistoryEventType.Created,

    @Column(name = "performed_by_user_id", columnDefinition = "CHAR(36)")
    var performedByUserId: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_user_id", insertable = false, updatable = false)
    var performedByUser: User? = null,

    @Column(name = "details", columnDefinition = "TEXT")
    var details: String? = null,

    @Column(name = "timestamp", nullable = false)
    var timestamp: Instant = Instant.now(),

    @OneToMany(mappedBy = "personHistory", cascade = [CascadeType.ALL], orphanRemoval = true)
    var changes: MutableList<PersonHistoryChange> = mutableListOf()
)
