package com.assetmanagement.api.model

import jakarta.persistence.*
import java.util.*

@Entity
@Table(name = "application_history_changes")
class ApplicationHistoryChange(
    @Id
    @Column(name = "id", columnDefinition = "CHAR(36)")
    var id: UUID = UUID.randomUUID(),

    @Column(name = "application_history_id", nullable = false, columnDefinition = "CHAR(36)")
    var applicationHistoryId: UUID = UUID.randomUUID(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_history_id", insertable = false, updatable = false)
    var applicationHistory: ApplicationHistory? = null,

    @Column(name = "field_name", nullable = false)
    var fieldName: String = "",

    @Column(name = "old_value", columnDefinition = "TEXT")
    var oldValue: String? = null,

    @Column(name = "new_value", columnDefinition = "TEXT")
    var newValue: String? = null
)
