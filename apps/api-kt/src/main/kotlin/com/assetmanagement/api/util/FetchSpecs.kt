package com.assetmanagement.api.util

import jakarta.persistence.criteria.JoinType
import org.springframework.data.jpa.domain.Specification

/**
 * A [Specification] that LEFT JOIN FETCHes the given to-one associations, used to
 * avoid the N+1 that occurs when a paged list DTO reads denormalised names off
 * LAZY `@ManyToOne` relations (one extra SELECT per row).
 *
 * The fetches are added ONLY to the data query, never to the paging count query
 * (`resultType == Long`): a fetch join in a `SELECT count(...)` is invalid, and
 * Spring Data runs the same Specification for both. Only to-ONE relations should
 * be passed — fetch-joining a collection with `Pageable` forces Hibernate to
 * paginate in memory.
 */
fun <T> withFetch(vararg attributes: String): Specification<T> =
    Specification { root, query, _ ->
        val resultType = query.resultType
        if (resultType != java.lang.Long::class.java && resultType != java.lang.Long.TYPE) {
            attributes.forEach { root.fetch<Any, Any>(it, JoinType.LEFT) }
        }
        null // contributes no predicate; combine with the filter spec via .and(...)
    }
