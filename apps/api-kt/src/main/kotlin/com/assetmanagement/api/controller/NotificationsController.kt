package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.NotificationGroup
import com.assetmanagement.api.dto.NotificationItem
import com.assetmanagement.api.dto.NotificationSummary
import com.assetmanagement.api.repository.ApplicationRepository
import com.assetmanagement.api.repository.AssetRepository
import com.assetmanagement.api.repository.CertificateRepository
import com.assetmanagement.api.repository.SystemSettingRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.time.temporal.ChronoUnit

@RestController
@RequestMapping("/api/v1/notifications")
class NotificationsController(
    private val assetRepository: AssetRepository,
    private val certificateRepository: CertificateRepository,
    private val applicationRepository: ApplicationRepository,
    private val systemSettingRepository: SystemSettingRepository
) {

    @GetMapping("/summary")
    fun getSummary(): ResponseEntity<NotificationSummary> {
        val thresholdStr = systemSettingRepository.findByKey("alerts.thresholds")?.value ?: "90,30,14,7"
        val maxDays = thresholdStr.split(",").mapNotNull { it.trim().toLongOrNull() }.maxOrNull() ?: 90L
        val now = Instant.now()
        val cutoff = now.plus(maxDays, ChronoUnit.DAYS)

        val warrantySpec = org.springframework.data.jpa.domain.Specification<com.assetmanagement.api.model.Asset> { root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false),
                cb.isNotNull(root.get<Instant>("warrantyExpiryDate")),
                cb.greaterThanOrEqualTo(root.get("warrantyExpiryDate"), now),
                cb.lessThanOrEqualTo(root.get("warrantyExpiryDate"), cutoff))
        }
        val warrantyCount = assetRepository.count(warrantySpec).toInt()
        val warrantyItems = assetRepository.findAll(warrantySpec, PageRequest.of(0, 5, Sort.by("warrantyExpiryDate")))
            .content.map { NotificationItem(it.id, it.name, it.warrantyExpiryDate!!) }

        val certSpec = org.springframework.data.jpa.domain.Specification<com.assetmanagement.api.model.Certificate> { root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false),
                cb.isNotNull(root.get<Instant>("expiryDate")),
                cb.greaterThanOrEqualTo(root.get("expiryDate"), now),
                cb.lessThanOrEqualTo(root.get("expiryDate"), cutoff))
        }
        val certCount = certificateRepository.count(certSpec).toInt()
        val certItems = certificateRepository.findAll(certSpec, PageRequest.of(0, 5, Sort.by("expiryDate")))
            .content.map { NotificationItem(it.id, it.name, it.expiryDate!!) }

        val licenceSpec = org.springframework.data.jpa.domain.Specification<com.assetmanagement.api.model.Application> { root, _, cb ->
            cb.and(cb.equal(root.get<Boolean>("isArchived"), false),
                cb.isNotNull(root.get<Instant>("expiryDate")),
                cb.greaterThanOrEqualTo(root.get("expiryDate"), now),
                cb.lessThanOrEqualTo(root.get("expiryDate"), cutoff))
        }
        val licenceCount = applicationRepository.count(licenceSpec).toInt()
        val licenceItems = applicationRepository.findAll(licenceSpec, PageRequest.of(0, 5, Sort.by("expiryDate")))
            .content.map { NotificationItem(it.id, it.name, it.expiryDate!!) }

        return ResponseEntity.ok(NotificationSummary(
            warrantyCount + certCount + licenceCount,
            NotificationGroup(warrantyCount, warrantyItems),
            NotificationGroup(certCount, certItems),
            NotificationGroup(licenceCount, licenceItems)
        ))
    }
}
