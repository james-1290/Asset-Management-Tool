package com.assetmanagement.api.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.io.ResourceLoader
import org.springframework.security.saml2.core.Saml2X509Credential
import org.springframework.security.saml2.provider.service.registration.InMemoryRelyingPartyRegistrationRepository
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistration
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrations
import java.security.KeyFactory
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.interfaces.RSAPrivateKey
import java.security.spec.PKCS8EncodedKeySpec
import java.util.Base64

@Configuration
@ConditionalOnProperty(name = ["saml.enabled"], havingValue = "true")
class SamlConfig(
    @Value("\${saml.registration-id}") private val registrationId: String,
    @Value("\${saml.entity-id}") private val entityId: String,
    @Value("\${saml.acs-url}") private val acsUrl: String,
    @Value("\${saml.metadata-url}") private val metadataUrl: String,
    @Value("\${saml.signing-key}") private val signingKeyLocation: String,
    @Value("\${saml.signing-cert}") private val signingCertLocation: String,
    private val resourceLoader: ResourceLoader
) {

    @Bean
    fun relyingPartyRegistrationRepository(): RelyingPartyRegistrationRepository {
        val signingKey = loadPrivateKey(signingKeyLocation)
        val signingCert = loadCertificate(signingCertLocation)
        val signingCredential = Saml2X509Credential.signing(signingKey, signingCert)

        val registration = RelyingPartyRegistrations
            .fromMetadataLocation(metadataUrl)
            .registrationId(registrationId)
            .entityId(entityId)
            .assertionConsumerServiceLocation(acsUrl)
            .signingX509Credentials { it.add(signingCredential) }
            .build()

        return InMemoryRelyingPartyRegistrationRepository(registration)
    }

    private fun loadPrivateKey(location: String): RSAPrivateKey {
        val resource = resourceLoader.getResource(location)
        val pem = resource.inputStream.bufferedReader().readText()
        val base64 = pem
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replace("\\s".toRegex(), "")
        val decoded = Base64.getDecoder().decode(base64)
        val keySpec = PKCS8EncodedKeySpec(decoded)
        return KeyFactory.getInstance("RSA").generatePrivate(keySpec) as RSAPrivateKey
    }

    private fun loadCertificate(location: String): X509Certificate {
        val resource = resourceLoader.getResource(location)
        return resource.inputStream.use { inputStream ->
            CertificateFactory.getInstance("X.509").generateCertificate(inputStream) as X509Certificate
        }
    }
}
