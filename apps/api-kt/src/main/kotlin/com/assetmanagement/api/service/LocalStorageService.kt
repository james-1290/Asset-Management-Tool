package com.assetmanagement.api.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption

@Service
class LocalStorageService(
    @Value("\${app.upload-dir:./uploads}") private val uploadDir: String
) : StorageService {

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
        val basePath = Paths.get(uploadDir).toAbsolutePath().normalize()
        val resolved = basePath.resolve(key).normalize()
        if (!resolved.startsWith(basePath)) {
            throw IllegalArgumentException("Invalid storage key: path traversal detected")
        }
        return resolved
    }
}
