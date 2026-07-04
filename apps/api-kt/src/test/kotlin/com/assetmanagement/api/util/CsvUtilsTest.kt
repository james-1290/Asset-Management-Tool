package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CsvUtilsTest {

    @Test
    fun `prefixes formula-trigger characters with a single quote`() {
        assertEquals("'=1+1", CsvUtils.sanitize("=1+1"))
        assertEquals("'+cmd", CsvUtils.sanitize("+cmd"))
        assertEquals("'-2", CsvUtils.sanitize("-2"))
        assertEquals("'@SUM(A1)", CsvUtils.sanitize("@SUM(A1)"))
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
}
