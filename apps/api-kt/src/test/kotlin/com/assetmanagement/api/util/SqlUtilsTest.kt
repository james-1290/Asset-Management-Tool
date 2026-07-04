package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class SqlUtilsTest {

    @Test
    fun `escapes LIKE wildcard percent`() {
        assertEquals("50\\%", SqlUtils.escapeLikePattern("50%"))
    }

    @Test
    fun `escapes LIKE wildcard underscore`() {
        assertEquals("a\\_b", SqlUtils.escapeLikePattern("a_b"))
    }

    @Test
    fun `escapes the escape character itself`() {
        assertEquals("c\\\\d", SqlUtils.escapeLikePattern("c\\d"))
    }

    @Test
    fun `leaves plain text unchanged`() {
        assertEquals("laptop", SqlUtils.escapeLikePattern("laptop"))
    }
}
