package com.assetmanagement.api.service

import java.io.InputStream

interface StorageService {
    fun store(key: String, inputStream: InputStream, contentLength: Long)
    fun load(key: String): InputStream
    fun delete(key: String)
}
