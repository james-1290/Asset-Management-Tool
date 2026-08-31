package com.assetmanagement.api.util

import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.io.Reader
import java.nio.charset.StandardCharsets

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

    /** The byte-order mark Excel writes at the start of a "CSV UTF-8" file. */
    private const val BOM = '\uFEFF'

    /**
     * A reader for an uploaded CSV.
     *
     * Two things the default `InputStreamReader(stream)` gets wrong here:
     *
     * - It decodes with the platform's default charset, so the same file could
     *   import differently on a developer's machine and on the server.
     * - It keeps the byte-order mark. Excel writes one for "CSV UTF-8", its
     *   usual export format, and the mark is not whitespace — so `trim()` left
     *   it glued to the first header. "Name" arrived as "\uFEFFName", matched
     *   nothing, and every row failed with "Name is required" while the name sat
     *   there in plain sight.
     */
    fun reader(input: InputStream): Reader {
        val reader = BufferedReader(InputStreamReader(input, StandardCharsets.UTF_8))
        reader.mark(1)
        if (reader.read() != BOM.code) reader.reset()
        return reader
    }
}
