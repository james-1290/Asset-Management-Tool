package com.assetmanagement.api.util

object CsvUtils {
    private val DANGEROUS_PREFIXES = charArrayOf('=', '+', '-', '@', '\t', '\r', '|', '`')

    /** A plain number, optionally signed, with an optional decimal part. */
    private val NUMERIC = Regex("^[+-]?\\d+(\\.\\d+)?$")

    fun sanitize(value: String?): String {
        if (value.isNullOrEmpty()) return ""
        // A number is not a formula, even with a leading sign. Prefixing it
        // turned every negative figure into text a spreadsheet will not sum —
        // and the expiries report is mostly negative day counts, since its
        // point is what has already expired.
        if (NUMERIC.matches(value)) return value
        return if (value[0] in DANGEROUS_PREFIXES) "'$value" else value
    }

    fun sanitizeRow(values: Array<String?>): Array<String> {
        return values.map { sanitize(it) }.toTypedArray()
    }
}
