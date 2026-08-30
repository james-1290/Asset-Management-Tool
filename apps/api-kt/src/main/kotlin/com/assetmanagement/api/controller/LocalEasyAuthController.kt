package com.assetmanagement.api.controller

import com.assetmanagement.api.security.LocalEasyAuthEmulator
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.net.URI

/**
 * Local stand-ins for the `/.auth` endpoints App Service publishes, so the
 * frontend can be written against the real Azure contract and needs no
 * environment-specific branches.
 *
 * In Azure these paths are served by the platform's auth sidecar and never
 * reach this container, so this controller is inert there — and it only exists
 * at all when the local emulator is switched on, which itself refuses to start
 * outside a dev profile.
 */
@RestController
@RequestMapping("/.auth")
@ConditionalOnProperty(name = ["auth.easy-auth.local-emulator.enabled"], havingValue = "true")
class LocalEasyAuthController(
    private val emulator: LocalEasyAuthEmulator,
    /**
     * Where to land after signing in when the caller names no destination.
     *
     * On App Service `/` is the app itself, so `/` is the right default there
     * and when the SPA proxies `/.auth` to this API. Hitting this API's own port
     * directly, though, `/` is nothing at all — so the dev profile points this
     * at the frontend.
     */
    @Value("\${auth.easy-auth.local-emulator.default-redirect:/}") private val defaultRedirect: String
) {

    /**
     * `GET /.auth/login/aad` — with `identity`, assumes it and redirects; without
     * one, offers the available developer identities.
     */
    @GetMapping("/login/aad")
    fun login(
        @RequestParam(required = false) identity: String?,
        @RequestParam(name = "post_login_redirect_uri", required = false) redirectUri: String?,
        response: HttpServletResponse
    ): ResponseEntity<Any> {
        val target = redirectUri?.takeIf { it.isNotBlank() }?.let { safeRedirect(it) } ?: defaultRedirect
        val chosen = emulator.find(identity)
            ?: return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(picker(target))

        response.addCookie(sessionCookie(chosen.key, maxAge = -1))
        return ResponseEntity.status(302).location(URI.create(target)).build()
    }

    @RequestMapping(value = ["/logout"], method = [RequestMethod.GET, RequestMethod.POST])
    fun logout(
        @RequestParam(name = "post_logout_redirect_uri", required = false) redirectUri: String?,
        response: HttpServletResponse
    ): ResponseEntity<Any> {
        response.addCookie(sessionCookie("", maxAge = 0))
        val target = redirectUri?.takeIf { it.isNotBlank() }?.let { safeRedirect(it) } ?: defaultRedirect
        return ResponseEntity.status(302).location(URI.create(target)).build()
    }

    /**
     * `GET /.auth/me` — the platform returns a single-element array of the
     * authenticated principal, or an empty array when anonymous.
     */
    @GetMapping("/me")
    fun me(request: HttpServletRequest): ResponseEntity<List<Map<String, Any>>> {
        val cookie = request.cookies?.firstOrNull { it.name == LocalEasyAuthEmulator.SESSION_COOKIE }?.value
        val identity = emulator.find(cookie)
            ?: return ResponseEntity.ok(emptyList())

        return ResponseEntity.ok(
            listOf(
                mapOf(
                    "provider_name" to "aad",
                    "user_id" to identity.email,
                    "user_claims" to emulator.claims(identity)
                )
            )
        )
    }

    private fun sessionCookie(value: String, maxAge: Int): Cookie =
        Cookie(LocalEasyAuthEmulator.SESSION_COOKIE, value).apply {
            path = "/"
            isHttpOnly = true
            this.maxAge = maxAge
            setAttribute("SameSite", "Lax")
        }

    /**
     * Only same-site absolute paths are honoured **from the query string**.
     * Rejects protocol-relative (`//evil.com`) and backslash forms that a naive
     * `startsWith("/")` misses, so the emulator can't be turned into an open
     * redirect. The configured default is exempt: it comes from deployment
     * configuration, not from the caller.
     */
    private fun safeRedirect(uri: String?): String {
        if (uri.isNullOrBlank()) return "/"
        if (!uri.startsWith("/")) return "/"
        if (uri.startsWith("//") || uri.startsWith("/\\")) return "/"
        return uri
    }

    private fun picker(target: String): String {
        val rows = emulator.identities.joinToString("\n") { id ->
            val roles = id.roles.joinToString(", ").ifEmpty { "no roles — sign-in is refused" }
            """
            <li>
              <a href="/.auth/login/aad?identity=${id.key}&amp;post_login_redirect_uri=${escape(target)}">
                <strong>${escape(id.displayName)}</strong>
              </a>
              <span>${escape(id.email)} — ${escape(roles)}</span>
            </li>
            """.trimIndent()
        }
        return """
            <!doctype html>
            <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Local sign-in (Easy Auth emulator)</title>
              <style>
                body { font-family: system-ui, sans-serif; max-width: 34rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.5; }
                h1 { font-size: 1.25rem; }
                p.warn { background: #fff4e5; border-left: 3px solid #f59e0b; padding: 0.75rem; }
                ul { list-style: none; padding: 0; }
                li { border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem; }
                li span { display: block; color: #6b7280; font-size: 0.875rem; }
                p.target { color: #6b7280; font-size: 0.875rem; }
                code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; }
              </style>
            </head>
            <body>
              <h1>Local sign-in</h1>
              <p class="warn">
                Development only. This stands in for Azure App Service's Entra sign-in and
                grants any identity below without a password.
              </p>
              <p class="target">After signing in you'll be sent to <code>${escape(target)}</code>.</p>
              <ul>
            $rows
              </ul>
            </body>
            </html>
        """.trimIndent()
    }

    private fun escape(s: String): String = s
        .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        .replace("\"", "&quot;").replace("'", "&#39;")
}
