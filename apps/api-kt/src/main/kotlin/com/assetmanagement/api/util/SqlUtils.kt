package com.assetmanagement.api.util

object SqlUtils {
    /**
     * Escapes SQL LIKE wildcard characters (%, _, \) in user input
     * to prevent LIKE pattern injection.
     * Use with the escape character '\' in the LIKE predicate:
     *   cb.like(expression, pattern, '\\')
     */
    fun escapeLikePattern(input: String): String {
        return input.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
    }
}
