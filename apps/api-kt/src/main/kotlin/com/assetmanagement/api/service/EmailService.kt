package com.assetmanagement.api.service

import com.assetmanagement.api.repository.SystemSettingRepository
import com.azure.identity.ClientSecretCredentialBuilder
import com.microsoft.graph.serviceclient.GraphServiceClient
import com.microsoft.graph.models.BodyType
import com.microsoft.graph.models.EmailAddress
import com.microsoft.graph.models.ItemBody
import com.microsoft.graph.models.Message
import com.microsoft.graph.models.Recipient
import com.microsoft.graph.users.item.sendmail.SendMailPostRequestBody
import jakarta.mail.internet.MimeMessage
import org.slf4j.LoggerFactory
import org.springframework.mail.javamail.JavaMailSenderImpl
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

@Service
class EmailService(
    private val systemSettingRepository: SystemSettingRepository
) {
    private val log = LoggerFactory.getLogger(EmailService::class.java)

    private fun getSetting(key: String, default: String = ""): String =
        systemSettingRepository.findByKey(key)?.value ?: default

    private fun getProvider(): String = getSetting("alerts.email.provider", "smtp")

    // --- SMTP ---

    private fun createMailSender(): JavaMailSenderImpl {
        val sender = JavaMailSenderImpl()
        sender.host = getSetting("alerts.smtp.host")
        sender.port = getSetting("alerts.smtp.port", "587").toIntOrNull() ?: 587
        val username = getSetting("alerts.smtp.username")
        if (username.isNotBlank()) {
            sender.username = username
            sender.password = getSetting("alerts.smtp.password")
        }
        val props = sender.javaMailProperties
        props["mail.transport.protocol"] = "smtp"
        props["mail.smtp.auth"] = (username.isNotBlank()).toString()
        props["mail.smtp.starttls.enable"] = "true"
        props["mail.smtp.connectiontimeout"] = "10000"
        props["mail.smtp.timeout"] = "10000"
        props["mail.smtp.writetimeout"] = "10000"
        return sender
    }

    private fun isSmtpConfigured(): Boolean {
        val host = getSetting("alerts.smtp.host")
        val from = getSetting("alerts.smtp.fromAddress")
        val recipients = getSetting("alerts.recipients")
        return host.isNotBlank() && from.isNotBlank() && recipients.isNotBlank()
    }

    private fun sendSmtpEmail(recipients: List<String>, subject: String, htmlBody: String) {
        val sender = createMailSender()
        val fromAddress = getSetting("alerts.smtp.fromAddress")

        val message: MimeMessage = sender.createMimeMessage()
        val helper = MimeMessageHelper(message, true, "UTF-8")
        helper.setFrom(fromAddress)
        helper.setTo(recipients.toTypedArray())
        helper.setSubject(subject)
        helper.setText(htmlBody, true)

        sender.send(message)
    }

    // --- Microsoft Graph ---

    private fun isGraphConfigured(): Boolean {
        val tenantId = getSetting("alerts.graph.tenantId")
        val clientId = getSetting("alerts.graph.clientId")
        val clientSecret = getSetting("alerts.graph.clientSecret")
        val from = getSetting("alerts.graph.fromAddress")
        val recipients = getSetting("alerts.recipients")
        return tenantId.isNotBlank() && clientId.isNotBlank() && clientSecret.isNotBlank()
                && from.isNotBlank() && recipients.isNotBlank()
    }

    private fun createGraphClient(): GraphServiceClient {
        val tenantId = getSetting("alerts.graph.tenantId")
        val clientId = getSetting("alerts.graph.clientId")
        val clientSecret = getSetting("alerts.graph.clientSecret")

        val credential = ClientSecretCredentialBuilder()
            .tenantId(tenantId)
            .clientId(clientId)
            .clientSecret(clientSecret)
            .build()

        return GraphServiceClient(credential, "https://graph.microsoft.com/.default")
    }

    private fun sendGraphEmail(recipients: List<String>, subject: String, htmlBody: String) {
        val graphClient = createGraphClient()
        val fromAddress = getSetting("alerts.graph.fromAddress")

        val message = Message().apply {
            this.subject = subject
            body = ItemBody().apply {
                contentType = BodyType.Html
                content = htmlBody
            }
            toRecipients = recipients.map { addr ->
                Recipient().apply {
                    emailAddress = EmailAddress().apply {
                        address = addr
                    }
                }
            }
        }

        val requestBody = SendMailPostRequestBody().apply {
            this.message = message
            saveToSentItems = false
        }

        graphClient.users().byUserId(fromAddress).sendMail().post(requestBody)
    }

    // --- Public API ---

    fun isConfigured(): Boolean {
        return when (getProvider()) {
            "graph" -> isGraphConfigured()
            else -> isSmtpConfigured()
        }
    }

    fun getRecipients(): List<String> =
        getSetting("alerts.recipients")
            .split(",")
            .map { it.trim() }
            .filter { it.isNotBlank() }

    fun sendDigestEmail(recipients: List<String>, subject: String, htmlBody: String) {
        val provider = getProvider()
        log.info("Sending digest email via {} to {} recipients: {}", provider, recipients.size, subject)

        when (provider) {
            "graph" -> sendGraphEmail(recipients, subject, htmlBody)
            else -> sendSmtpEmail(recipients, subject, htmlBody)
        }

        log.info("Digest email sent successfully via {}", provider)
    }

    fun sendTestEmail(recipient: String) {
        val provider = getProvider()
        val subject = "Asset Management - Test Email"
        val htmlBody = """
            <html>
            <body style="font-family: sans-serif; padding: 20px;">
                <h2>Test Email</h2>
                <p>This is a test email from the Asset Management Tool.</p>
                <p>Provider: <strong>${provider.uppercase()}</strong></p>
                <p>If you received this, your email configuration is working correctly.</p>
            </body>
            </html>
        """.trimIndent()

        log.info("Sending test email via {} to {}", provider, recipient)

        when (provider) {
            "graph" -> sendGraphEmail(listOf(recipient), subject, htmlBody)
            else -> {
                val sender = createMailSender()
                val fromAddress = getSetting("alerts.smtp.fromAddress")
                val message: MimeMessage = sender.createMimeMessage()
                val helper = MimeMessageHelper(message, true, "UTF-8")
                helper.setFrom(fromAddress)
                helper.setTo(recipient)
                helper.setSubject(subject)
                helper.setText(htmlBody, true)
                sender.send(message)
            }
        }

        log.info("Test email sent successfully via {}", provider)
    }
}
