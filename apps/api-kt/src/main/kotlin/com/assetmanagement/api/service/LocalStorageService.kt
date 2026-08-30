package com.assetmanagement.api.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.core.env.Environment
import org.springframework.stereotype.Service
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption

/**
 * Stores attachments on the local filesystem. The default, and the right choice
 * for local development.
 *
 * **Not** suitable for Azure App Service, whose container storage is ephemeral:
 * uploads written here are lost on restart, scale or redeploy. Set
 * `app.storage.type=azure-blob` for a real deployment — see
 * [AzureBlobStorageService].
 */
@Service
@ConditionalOnProperty(name = ["app.storage.type"], havingValue = "local", matchIfMissing = true)
class LocalStorageService(
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String,
    environment: Environment
) : StorageService {

    private val log = LoggerFactory.getLogger(LocalStorageService::class.java)

    init {
        // A warning rather than a hard failure: a deployment may legitimately
        // have mounted durable storage at this path. But silently losing
        // people's uploads on the next restart is the worse outcome, so say so
        // loudly wherever this isn't obviously a developer machine.
        val devProfile = environment.activeProfiles.any { it.lowercase() in setOf("dev", "test", "local") }
        if (!devProfile) {
            log.warn(
                "STORAGE: attachments are being written to the local filesystem ({}). On Azure App " +
                    "Service container storage is EPHEMERAL — uploads will be lost on restart, scale " +
                    "or redeploy. Set app.storage.type=azure-blob, or ensure this path is durable.",
                uploadDir
            )
        }
    }

    override fun store(key: String, inputStream: InputStream, contentLength: Long) {
        val path = resolvePath(key)
        Files.createDirectories(path.parent)
        Files.copy(inputStream, path, StandardCopyOption.REPLACE_EXISTING)
    }

    override fun load(key: String): InputStream {
        val path = resolvePath(key)
        if (!Files.exists(path)) {
            throw IllegalArgumentException("File not found: $key")
        }
        return Files.newInputStream(path)
    }

    override fun delete(key: String) {
        val path = resolvePath(key)
        Files.deleteIfExists(path)
    }

    private fun resolvePath(key: String): Path {
        StorageKeys.validate(key)
        val basePath = Paths.get(uploadDir).toAbsolutePath().normalize()
        val resolved = basePath.resolve(key).normalize()
        if (!resolved.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid storage key: path traversal detected")
        }
        return resolved
    }
}
