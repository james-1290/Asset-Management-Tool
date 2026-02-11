package com.assetmanagement.api.dto

data class ImportRowResult(
    val rowNumber: Int,
    val isValid: Boolean,
    val errors: List<String>,
    val data: Map<String, String?>
)

data class ImportValidationResponse(
    val entityType: String,
    val totalRows: Int,
    val validRows: Int,
    val invalidRows: Int,
    val rows: List<ImportRowResult>
)

data class ImportExecuteResponse(
    val entityType: String,
    val imported: Int,
    val skipped: Int,
    val failed: Int,
    val errors: List<String>
)
