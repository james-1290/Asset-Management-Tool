package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletResponse

class CsvExportTest {

    @Test
    fun `stream writes headers, download wiring and sanitised rows`() {
        val response = MockHttpServletResponse()
        CsvExport.stream(
            response,
            "assets-export.csv",
            arrayOf("Name", "Note"),
            sequenceOf("=cmd" to "safe", "Laptop" to null),
        ) { (name, note) -> arrayOf(name, note) }

        assertTrue(response.contentType!!.startsWith("text/csv"))
        assertEquals("UTF-8", response.characterEncoding)
        assertEquals(
            "attachment; filename=assets-export.csv",
            response.getHeader("Content-Disposition"),
        )

        val lines = response.contentAsString.trim().lines()
        assertEquals("\"Name\",\"Note\"", lines[0])
        // Formula-trigger cell is prefixed with a single quote; null becomes empty.
        assertEquals("\"'=cmd\",\"safe\"", lines[1])
        assertEquals("\"Laptop\",\"\"", lines[2])
    }

    @Test
    fun `stream caps rows and appends a truncation notice`() {
        val response = MockHttpServletResponse()
        // 5 source rows, cap of 2 -> 2 data rows + a truncation notice.
        CsvExport.stream(
            response,
            "capped.csv",
            arrayOf("N"),
            generateSequence(1) { it + 1 }.take(5),
            maxRows = 2,
        ) { arrayOf(it.toString()) }

        val body = response.contentAsString
        val dataLines = body.trim().lines()
        // header + 2 rows + truncation notice
        assertEquals(4, dataLines.size)
        assertTrue(body.contains("Truncated at 2 rows"), "expected truncation notice, got:\n$body")
    }

    @Test
    fun `stream under the cap has no truncation notice`() {
        val response = MockHttpServletResponse()
        CsvExport.stream(
            response,
            "small.csv",
            arrayOf("N"),
            sequenceOf(1, 2),
            maxRows = 10,
        ) { arrayOf(it.toString()) }

        assertFalse(response.contentAsString.contains("Truncated"))
    }

    @Test
    fun `toResponseEntity returns csv bytes with download headers`() {
        val entity = CsvExport.toResponseEntity("report.csv") { writer ->
            writer.writeNext(arrayOf("Metric", "Value"))
            writer.writeNext(CsvUtils.sanitizeRow(arrayOf("Total", "42")))
        }

        assertEquals("text/csv", entity.headers.contentType.toString())
        assertEquals(
            "attachment; filename=report.csv",
            entity.headers.getFirst("Content-Disposition"),
        )
        val body = String(entity.body!!)
        assertTrue(body.contains("\"Metric\",\"Value\""))
        assertTrue(body.contains("\"Total\",\"42\""))
    }
}
