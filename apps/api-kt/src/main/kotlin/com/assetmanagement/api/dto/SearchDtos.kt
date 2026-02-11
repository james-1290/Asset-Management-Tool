package com.assetmanagement.api.dto

import java.util.*

data class SearchResultItem(
    val id: UUID,
    val name: String,
    val subtitle: String? = null
)

data class SearchResponse(
    val assets: List<SearchResultItem>,
    val certificates: List<SearchResultItem>,
    val applications: List<SearchResultItem>,
    val people: List<SearchResultItem>,
    val locations: List<SearchResultItem>
)
