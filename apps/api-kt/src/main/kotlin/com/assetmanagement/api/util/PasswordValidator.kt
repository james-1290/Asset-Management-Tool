package com.assetmanagement.api.util

object PasswordValidator {

    fun validate(password: String): String? {
        if (password.length < 8) return "Password must be at least 8 characters."
        if (!password.any { it.isUpperCase() }) return "Password must contain at least one uppercase letter."
        if (!password.any { it.isLowerCase() }) return "Password must contain at least one lowercase letter."
        if (!password.any { it.isDigit() }) return "Password must contain at least one number."
        if (!password.any { !it.isLetterOrDigit() }) return "Password must contain at least one special character."
        return null
    }
}
