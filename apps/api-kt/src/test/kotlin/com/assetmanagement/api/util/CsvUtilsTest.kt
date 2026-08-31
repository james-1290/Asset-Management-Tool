package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CsvUtilsTest {

    @Test
    fun `prefixes formula-trigger characters with a single quote`() {
        assertEquals("'=1+1", CsvUtils.sanitize("=1+1"))
        assertEquals("'+cmd", CsvUtils.sanitize("+cmd"))
        // "-1+1" is a formula; a bare "-2" is not — see the numbers test below.
        assertEquals("'-1+1", CsvUtils.sanitize("-1+1"))
        assertEquals("'@SUM(A1)", CsvUtils.sanitize("@SUM(A1)"))
    }

    @Test
    fun `leaves numbers alone, including negative ones`() {
        // Prefixing these turned every negative figure in an export into text
        // that spreadsheets will not sum or sort — and the expiries report is
        // mostly negative day counts, its whole point being what has expired.
        assertEquals("-30", CsvUtils.sanitize("-30"))
        assertEquals("-2009", CsvUtils.sanitize("-2009"))
        assertEquals("-1234.56", CsvUtils.sanitize("-1234.56"))
        assertEquals("+7", CsvUtils.sanitize("+7"))
        assertEquals("42", CsvUtils.sanitize("42"))
    }

    @Test
    fun `still guards a formula that merely looks numeric`() {
        assertEquals("'-1+1", CsvUtils.sanitize("-1+1"))
        assertEquals("'=1-2", CsvUtils.sanitize("=1-2"))
        assertEquals("'-2-3", CsvUtils.sanitize("-2-3"))
        assertEquals("'+1e2+cmd", CsvUtils.sanitize("+1e2+cmd"))
    }

    @Test
    fun `leaves safe values unchanged and maps null to empty`() {
        assertEquals("Laptop", CsvUtils.sanitize("Laptop"))
        assertEquals("", CsvUtils.sanitize(null))
        assertEquals("", CsvUtils.sanitize(""))
    }

    @Test
    fun `sanitizes each cell in a row`() {
        val row = CsvUtils.sanitizeRow(arrayOf("=danger", "safe", null))
        assertArrayEquals(arrayOf("'=danger", "safe", ""), row)
    }

    @Test
    fun `reader strips the byte-order mark Excel writes`() {
        // A "CSV UTF-8" file from Excel starts with a BOM. It is not whitespace,
        // so trim() left it glued to the first header: "Name" arrived as
        // "\uFEFFName", matched no column, and every row failed with
        // "Name is required" while the name sat there in plain sight.
        val withBom = "\uFEFFName,City\nLondon office,London\n".toByteArray(Charsets.UTF_8)
        val text = CsvUtils.reader(withBom.inputStream()).readText()
        assertEquals("Name,City\nLondon office,London\n", text)
    }

    @Test
    fun `reader leaves a file without a mark untouched`() {
        val plain = "Name,City\nLondon office,London\n".toByteArray(Charsets.UTF_8)
        assertEquals("Name,City\nLondon office,London\n", CsvUtils.reader(plain.inputStream()).readText())
    }

    @Test
    fun `reader decodes as UTF-8 regardless of the platform default`() {
        val accented = "Name\nCafé Münster\n".toByteArray(Charsets.UTF_8)
        assertEquals("Name\nCafé Münster\n", CsvUtils.reader(accented.inputStream()).readText())
    }
}
