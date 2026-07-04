package com.assetmanagement.api.util

import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class PasswordValidatorTest {

    @Test
    fun `accepts a password meeting all rules`() {
        assertNull(PasswordValidator.validate("Str0ng!pass"))
    }

    @Test
    fun `rejects a password shorter than 8 characters`() {
        assertNotNull(PasswordValidator.validate("Ab1!"))
    }

    @Test
    fun `rejects a password with no uppercase letter`() {
        assertNotNull(PasswordValidator.validate("weak1!pass"))
    }

    @Test
    fun `rejects a password with no digit`() {
        assertNotNull(PasswordValidator.validate("NoDigits!"))
    }

    @Test
    fun `rejects a password with no special character`() {
        assertNotNull(PasswordValidator.validate("NoSpecial1"))
    }
}
