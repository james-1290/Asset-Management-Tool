package com.assetmanagement.api.util

object CsvUtils {
    private val DANGEROUS_PREFIXES = charArrayOf('=', '+', '-', '@', '\t', '\r', '|', '`')

    fun sanitize(value: String?): String {
        if (value.isNullOrEmpty()) return ""
        return if (value[0] in DANGEROUS_PREFIXES) "'$value" else value
    }

    fun sanitizeRow(values: Array<String?>): Array<String> {
        return values.map { sanitize(it) }.toTypedArray()
    }
}
