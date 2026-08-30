package com.assetmanagement.api.config

import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.servlet.resource.NoResourceFoundException
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.server.ResponseStatusException
import org.springframework.dao.DataIntegrityViolationException
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

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleTypeMismatch(ex: MethodArgumentTypeMismatchException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.badRequest().body(mapOf("error" to "Invalid value for '${ex.name}'"))
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

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleDataIntegrity(ex: DataIntegrityViolationException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(409)
            .body(mapOf("error" to "A data conflict occurred. The record may already exist or reference invalid data."))
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException::class)
    fun handleOptimisticLock(ex: ObjectOptimisticLockingFailureException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(409)
            .body(mapOf("error" to "This record was modified by another user. Please refresh and try again."))
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSize(ex: MaxUploadSizeExceededException): ResponseEntity<Map<String, Any>> {
        // Without this an over-limit upload falls through to the generic 500;
        // 413 with a clear message is the correct, actionable response.
        return ResponseEntity.status(413)
            .body(mapOf("error" to "The uploaded file is too large. The maximum allowed size is 10MB."))
    }

    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNoResource(ex: NoResourceFoundException): ResponseEntity<Map<String, Any>> {
        // A request for a path this app doesn't serve. Without this it fell
        // through to the generic handler and was reported as "An internal error
        // occurred" with a 500 and a logged stack trace — alarming, wrong, and
        // noisy for something as ordinary as a browser asking for /favicon.ico.
        return ResponseEntity.status(404).body(mapOf("error" to "Not found"))
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
