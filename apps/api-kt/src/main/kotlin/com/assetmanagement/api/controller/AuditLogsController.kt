package com.assetmanagement.api.controller

import com.assetmanagement.api.dto.AuditLogDto
import com.assetmanagement.api.dto.PagedResponse
import com.assetmanagement.api.util.CsvUtils
import com.assetmanagement.api.model.AuditLog
import com.assetmanagement.api.repository.AuditLogRepository
import com.opencsv.CSVWriter
import jakarta.persistence.criteria.Predicate
import jakarta.servlet.http.HttpServletResponse
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.io.OutputStreamWriter
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@RestController
@RequestMapping("/api/v1/auditlogs")
class AuditLogsController(
    private val auditLogRepository: AuditLogRepository
) {
    private val dateFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC)

    @GetMapping
    fun getAll(
        @RequestParam(defaultValue = "1") page: Int, @RequestParam(defaultValue = "25") pageSize: Int,
        @RequestParam(required = false) entityType: String?, @RequestParam(required = false) action: String?,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "timestamp") sortBy: String,
        @RequestParam(defaultValue = "desc") sortDir: String
    ): ResponseEntity<PagedResponse<AuditLogDto>> {
        val p = maxOf(1, page); val ps = pageSize.coerceIn(1, 100)
        val spec = buildSpec(entityType, action, search)
        val sort = sortOf(sortBy, sortDir)
        val result = auditLogRepository.findAll(spec, PageRequest.of(p - 1, ps, sort))
        val items = result.content.map { it.toDto() }
        return ResponseEntity.ok(PagedResponse(items, p, ps, result.totalElements))
    }

    @GetMapping("/export")
    fun export(
        @RequestParam(required = false) entityType: String?, @RequestParam(required = false) action: String?,
        @RequestParam(required = false) search: String?, @RequestParam(defaultValue = "timestamp") sortBy: String,
        @RequestParam(defaultValue = "desc") sortDir: String, response: HttpServletResponse
    ) {
        response.contentType = "text/csv"
        response.setHeader("Content-Disposition", "attachment; filename=audit-log-export.csv")
        val logs = auditLogRepository.findAll(buildSpec(entityType, action, search), sortOf(sortBy, sortDir))
        val writer = CSVWriter(OutputStreamWriter(response.outputStream))
        writer.writeNext(arrayOf("Timestamp", "ActorName", "Action", "EntityType", "EntityName", "Details", "Source"))
        logs.forEach { l ->
            writer.writeNext(CsvUtils.sanitizeRow(arrayOf(dateFormat.format(l.timestamp), l.actorName, l.action, l.entityType,
                l.entityName ?: "", l.details ?: "", l.source.name)))
        }
        writer.flush()
    }

    private fun buildSpec(entityType: String?, action: String?, search: String?): Specification<AuditLog> = Specification { root, _, cb ->
        val preds = mutableListOf<Predicate>()
        if (!entityType.isNullOrBlank()) preds.add(cb.equal(root.get<String>("entityType"), entityType))
        if (!action.isNullOrBlank()) preds.add(cb.equal(root.get<String>("action"), action))
        if (!search.isNullOrBlank()) {
            val pattern = "%${search.lowercase()}%"
            preds.add(cb.or(
                cb.like(cb.lower(root.get("details")), pattern),
                cb.like(cb.lower(root.get("actorName")), pattern),
                cb.like(cb.lower(root.get("entityName")), pattern)
            ))
        }
        if (preds.isEmpty()) null else cb.and(*preds.toTypedArray())
    }

    private fun sortOf(sortBy: String, sortDir: String): Sort {
        val dir = if (sortDir.equals("desc", ignoreCase = true)) Sort.Direction.DESC else Sort.Direction.ASC
        val prop = when (sortBy.lowercase()) {
            "action" -> "action"; "entitytype" -> "entityType"; "entityname" -> "entityName"; "actorname" -> "actorName"
            else -> "timestamp"
        }
        return Sort.by(dir, prop)
    }

    private fun AuditLog.toDto() = AuditLogDto(id, actorName, action, entityType, entityId, entityName, source.name, details, timestamp)
}
