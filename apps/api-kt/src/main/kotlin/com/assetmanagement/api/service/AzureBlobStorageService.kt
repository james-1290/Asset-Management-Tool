package com.assetmanagement.api.service

import com.azure.identity.DefaultAzureCredentialBuilder
import com.azure.storage.blob.BlobContainerClient
import com.azure.storage.blob.BlobServiceClientBuilder
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import java.io.InputStream

/**
 * Stores attachments in Azure Blob Storage.
 *
 * App Service container storage is ephemeral — anything written to local disk is
 * lost on restart, scale or redeploy — so uploads cannot live on the filesystem
 * in a real deployment.
 *
 * Authentication prefers a **managed identity** (`DefaultAzureCredential`),
 * which keeps a storage secret out of the configuration entirely. A connection
 * string is accepted for environments without one.
 */
@Service
@ConditionalOnProperty(name = ["app.storage.type"], havingValue = "azure-blob")
class AzureBlobStorageService(
    @Value("\${app.storage.blob.container:attachments}") private val containerName: String,
    @Value("\${app.storage.blob.account-name:}") private val accountName: String,
    @Value("\${app.storage.blob.connection-string:}") private val connectionString: String
) : StorageService {

    private val log = LoggerFactory.getLogger(AzureBlobStorageService::class.java)

    init {
        require(accountName.isNotBlank() || connectionString.isNotBlank()) {
            "Blob storage is selected (app.storage.type=azure-blob) but neither " +
                "BLOB_ACCOUNT_NAME nor BLOB_CONNECTION_STRING is set."
        }
    }

    /**
     * Built on first use rather than at startup: reaching the container is a
     * network call, and a storage outage should fail the request that needs
     * storage, not stop the application from booting.
     */
    private val container: BlobContainerClient by lazy {
        val builder = BlobServiceClientBuilder()
        if (connectionString.isNotBlank()) {
            builder.connectionString(connectionString)
        } else {
            builder.endpoint("https://$accountName.blob.core.windows.net")
                .credential(DefaultAzureCredentialBuilder().build())
        }
        builder.buildClient().getBlobContainerClient(containerName).apply {
            if (!exists()) {
                log.info("Creating blob container '{}'", containerName)
                createIfNotExists()
            }
        }
    }

    override fun store(key: String, inputStream: InputStream, contentLength: Long) {
        container.getBlobClient(StorageKeys.validate(key)).upload(inputStream, contentLength, true)
    }

    override fun load(key: String): InputStream {
        val blob = container.getBlobClient(StorageKeys.validate(key))
        require(blob.exists()) { "File not found: $key" }
        return blob.openInputStream()
    }

    override fun delete(key: String) {
        container.getBlobClient(StorageKeys.validate(key)).deleteIfExists()
    }
}
