package com.assetmanagement.api.config

import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.server.ResponseStatusException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import jakarta.validation.ConstraintViolationException
import java.util.UUID

@RestControllerAdvice
class GlobalExceptionHandler {
    private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(e: AccessDeniedException): ResponseEntity<Map<String, String>> {
        return ResponseEntity.status(403).body(mapOf("error" to "Access denied"))
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleMessageNotReadable(ex: HttpMessageNotReadableException): ResponseEntity<Map<String, Any>> {
        val message = when {
            ex.message?.contains("Cannot deserialize") == true -> "Invalid request body format"
            ex.message?.contains("Unrecognized field") == true -> {
                val field = Regex("Unrecognized field \"(\\w+)\"").find(ex.message ?: "")?.groupValues?.get(1)
                if (field != null) "Unknown field: $field" else "Unknown field in request body"
            }
            ex.message?.contains("Required request body is missing") == true -> "Request body is required"
            else -> "Invalid request body"
        }
        return ResponseEntity.badRequest().body(mapOf("error" to message))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationErrors(e: MethodArgumentNotValidException): ResponseEntity<Map<String, Any>> {
        val errors = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Invalid value") }
        val message = errors.values.firstOrNull() ?: "Validation failed"
        return ResponseEntity.badRequest().body(mapOf(
            "error" to message,
            "details" to errors
        ))
    }

    @ExceptionHandler(MissingServletRequestParameterException::class)
    fun handleMissingParam(ex: MissingServletRequestParameterException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.badRequest().body(mapOf("error" to "Missing required parameter: ${ex.parameterName}"))
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<Map<String, Any>> {
        val message = ex.constraintViolations.firstOrNull()?.message ?: "Validation failed"
        return ResponseEntity.badRequest().body(mapOf("error" to message))
    }

    @ExceptionHandler(ResponseStatusException::class)
    fun handleResponseStatusException(ex: ResponseStatusException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(ex.getStatusCode()).body(mapOf("error" to (ex.reason ?: "Error")))
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException::class)
    fun handleOptimisticLock(ex: ObjectOptimisticLockingFailureException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(409)
            .body(mapOf("error" to "This record was modified by another user. Please refresh and try again."))
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(e: Exception): ResponseEntity<Map<String, String>> {
        val errorId = UUID.randomUUID().toString()
        log.error("Unhandled exception [errorId={}]", errorId, e)
        return ResponseEntity.status(500).body(mapOf(
            "error" to "An internal error occurred",
            "errorId" to errorId
        ))
    }
}
