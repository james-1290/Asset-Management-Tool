import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Content-Security-Policy tuned to what the built app actually loads: own
// bundle ('self'), React inline styles + Tailwind ('unsafe-inline'), Google
// Fonts (index.html), and blob:/data: images (avatars, model images, PDF
// preview). This is the production posture — the dev server can't use it
// because Vite HMR needs inline scripts / eval / a websocket.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

// Headers safe to send from the dev server too (no CSP — would break HMR).
const baseSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// API / SSO / SCIM are proxied to the backend so the browser sees a single
// origin — this is what lets the app's CSP keep `connect-src 'self'`.
const proxy = {
  '/api': { target: 'http://localhost:5115', changeOrigin: true },
  '/saml2': { target: 'http://localhost:5115', changeOrigin: true },
  '/login/saml2': { target: 'http://localhost:5115', changeOrigin: true },
  '/scim': { target: 'http://localhost:5115', changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // `vite preview` serves the built output — mirror the production header suite
  // (incl. CSP) so it can be verified against the real bundle before deploy.
  preview: {
    port: 5173,
    headers: { ...baseSecurityHeaders, 'Content-Security-Policy': CSP },
    proxy,
  },
  server: {
    port: 5173,
    headers: baseSecurityHeaders,
    proxy,
  },
})
