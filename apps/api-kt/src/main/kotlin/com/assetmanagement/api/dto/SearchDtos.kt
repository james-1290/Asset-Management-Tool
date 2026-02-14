package com.assetmanagement.api.dto

import java.util.*

data class SearchResultItem(
    val id: UUID,
    val name: String,
    val subtitle: String? = null,
    val extra: String? = null
)

data class SearchCounts(
    val assets: Int,
    val certificates: Int,
    val applications: Int,
    val people: Int,
    val locations: Int
)

data class SearchResponse(
    val assets: List<SearchResultItem>,
    val certificates: List<SearchResultItem>,
    val applications: List<SearchResultItem>,
    val people: List<SearchResultItem>,
    val locations: List<SearchResultItem>,
    val counts: SearchCounts = SearchCounts(0, 0, 0, 0, 0)
)
