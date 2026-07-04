package com.assetmanagement.api.util

import com.opencsv.CSVWriter
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.nio.charset.StandardCharsets

/**
 * Shared CSV export wiring: consistent content-type / UTF-8 / download-filename
 * headers and formula-injection sanitisation for every export path.
 *
 * [stream] is the OOM-guarded path for unbounded entity lists: it consumes a
 * lazy [Sequence] and enforces [MAX_ROWS]. [toResponseEntity] is the buffered
 * path for the bounded, multi-section report exports.
 */
object CsvExport {
    /** Hard cap on exported data rows, guarding heap and response size. */
    const val MAX_ROWS = 100_000

    private val log = LoggerFactory.getLogger(CsvExport::class.java)
    private const val CONTENT_TYPE = "text/csv"

    /**
     * Stream a CSV download to [response]. Writes [header], then a sanitised row
     * per element of [source] (mapped via [toRow]) up to [maxRows]. If [source]
     * yields more than [maxRows], the surplus is dropped, a warning is logged and
     * a truncation notice line is appended so the truncation is never silent.
     *
     * [source] should be lazily/limit-bounded by the caller (e.g. a `findBy { …
     * limit(MAX_ROWS + 1) … }` query) so the full table is never held in memory.
     */
    fun <T> stream(
        response: HttpServletResponse,
        filename: String,
        header: Array<String>,
        source: Sequence<T>,
        maxRows: Int = MAX_ROWS,
        toRow: (T) -> Array<String?>,
    ) {
        writeTo(response, filename) { writer ->
            writer.writeNext(header)
            var count = 0
            var truncated = false
            for (item in source) {
                if (count >= maxRows) {
                    truncated = true
                    break
                }
                writer.writeNext(CsvUtils.sanitizeRow(toRow(item)))
                count++
            }
            if (truncated) {
                log.warn("CSV export '{}' hit the {}-row cap; output truncated", filename, maxRows)
                writer.writeNext(
                    arrayOf("# Truncated at $maxRows rows. Narrow your filters to export the remaining data."),
                )
            }
        }
    }

    /** Set download headers and hand a UTF-8 [CSVWriter] to [block] (flushed and
     *  closed automatically). For exports that don't fit the header+rows shape. */
    fun writeTo(response: HttpServletResponse, filename: String, block: (CSVWriter) -> Unit) {
        response.contentType = CONTENT_TYPE
        response.characterEncoding = StandardCharsets.UTF_8.name()
        response.setHeader("Content-Disposition", "attachment; filename=$filename")
        CSVWriter(OutputStreamWriter(response.outputStream, StandardCharsets.UTF_8)).use { writer ->
            block(writer)
            writer.flush()
        }
    }

    /** Build a buffered CSV [ResponseEntity] (shared wiring for bounded exports
     *  such as the report summaries). */
    fun toResponseEntity(filename: String, block: (CSVWriter) -> Unit): ResponseEntity<ByteArray> {
        val baos = ByteArrayOutputStream()
        CSVWriter(OutputStreamWriter(baos, StandardCharsets.UTF_8)).use { writer ->
            block(writer)
            writer.flush()
        }
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=$filename")
            .contentType(MediaType.parseMediaType(CONTENT_TYPE))
            .body(baos.toByteArray())
    }
}
