'use strict'

const { expect } = require('chai')
const request = require('supertest')
const express = require('express')
const qs = require('qs')

// Create a minimal test app with the same CORS middleware
function createTestApp() {
  const app = express()
  
  app.disable('x-powered-by')
  app.set('query parser', (s) => qs.parse(s, { allowDots: true }))

  // Global CORS middleware: allow any origin and handle preflight
  app.use((req, res, next) => {
    // Allow any origin
    res.header('Access-Control-Allow-Origin', '*')
    // Allowed methods
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    // Echo requested headers if provided, otherwise allow common headers
    const reqHeaders = req.header('Access-Control-Request-Headers')
    res.header(
      'Access-Control-Allow-Headers',
      reqHeaders || 'Content-Type, Authorization, Accept, Origin, Referer, User-Agent, Cache-Control, Pragma, X-Requested-With'
    )
    // Expose headers that clients may need to read (e.g., for /pdf downloads)
    res.header('Access-Control-Expose-Headers', 'Content-Disposition')
    // Cache preflight for 24 hours
    res.header('Access-Control-Max-Age', '86400')

    if (req.method === 'OPTIONS') {
      // Short-circuit preflight
      return res.status(204).send()
    }
    next()
  })

  // Test routes
  app.get('/html', (req, res) => {
    res.status(200).send('<html><body>Test</body></html>')
  })

  app.get('/screenshot', (req, res) => {
    res.status(200).send('screenshot')
  })

  app.get('/pdf', (req, res) => {
    res.status(200).send('pdf')
  })

  return app
}

describe('CORS Middleware', function () {
  let app

  before(function () {
    app = createTestApp()
  })

  describe('OPTIONS preflight requests', function () {
    it('should handle OPTIONS request with 204 status', async function () {
      const res = await request(app)
        .options('/html')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')

      expect(res.status).to.equal(204)
      expect(res.text).to.equal('')
    })

    it('should set correct CORS headers on OPTIONS request', async function () {
      const res = await request(app)
        .options('/html')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type, X-Custom-Header')

      expect(res.headers['access-control-allow-origin']).to.equal('*')
      expect(res.headers['access-control-allow-methods']).to.equal('GET,POST,PUT,PATCH,DELETE,OPTIONS')
      expect(res.headers['access-control-allow-headers']).to.equal('Content-Type, X-Custom-Header')
      expect(res.headers['access-control-max-age']).to.equal('86400')
    })

    it('should handle OPTIONS request for /screenshot endpoint', async function () {
      const res = await request(app)
        .options('/screenshot')
        .set('Origin', 'https://another-site.com')

      expect(res.status).to.equal(204)
      expect(res.headers['access-control-allow-origin']).to.equal('*')
    })

    it('should handle OPTIONS request for /pdf endpoint', async function () {
      const res = await request(app)
        .options('/pdf')
        .set('Origin', 'https://third-site.org')

      expect(res.status).to.equal(204)
      expect(res.headers['access-control-allow-origin']).to.equal('*')
    })
  })

  describe('Regular requests with CORS headers', function () {
    it('should include CORS headers on GET /html', async function () {
      const res = await request(app)
        .get('/html')
        .set('Origin', 'https://example.com')

      expect(res.status).to.equal(200)
      expect(res.headers['access-control-allow-origin']).to.equal('*')
      expect(res.headers['access-control-allow-methods']).to.equal('GET,POST,PUT,PATCH,DELETE,OPTIONS')
      expect(res.headers['access-control-expose-headers']).to.equal('Content-Disposition')
    })

    it('should include CORS headers on GET /screenshot', async function () {
      const res = await request(app)
        .get('/screenshot')
        .set('Origin', 'https://example.com')

      expect(res.status).to.equal(200)
      expect(res.headers['access-control-allow-origin']).to.equal('*')
    })

    it('should include CORS headers on GET /pdf', async function () {
      const res = await request(app)
        .get('/pdf')
        .set('Origin', 'https://example.com')

      expect(res.status).to.equal(200)
      expect(res.headers['access-control-allow-origin']).to.equal('*')
      expect(res.headers['access-control-expose-headers']).to.equal('Content-Disposition')
    })
  })

  describe('Cross-origin compatibility', function () {
    it('should allow requests from any origin', async function () {
      const origins = [
        'https://example.com',
        'https://another-site.org',
        'http://localhost:8080',
        'https://random-domain.net',
      ]

      for (const origin of origins) {
        const res = await request(app)
          .get('/html')
          .set('Origin', origin)

        expect(res.headers['access-control-allow-origin']).to.equal('*')
      }
    })

    it('should handle OPTIONS from any origin', async function () {
      const origins = [
        'https://foo.com',
        'https://bar.net',
        'http://localhost:3000',
      ]

      for (const origin of origins) {
        const res = await request(app)
          .options('/html')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')

        expect(res.status).to.equal(204)
        expect(res.headers['access-control-allow-origin']).to.equal('*')
      }
    })
  })

  describe('Custom headers support', function () {
    it('should echo requested headers in Access-Control-Allow-Headers', async function () {
      const customHeaders = 'X-Custom-1, X-Custom-2, Authorization'
      
      const res = await request(app)
        .options('/html')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Headers', customHeaders)

      expect(res.headers['access-control-allow-headers']).to.equal(customHeaders)
    })

    it('should use default headers when no custom headers requested', async function () {
      const res = await request(app)
        .options('/html')
        .set('Origin', 'https://example.com')

      expect(res.headers['access-control-allow-headers']).to.include('Content-Type')
      expect(res.headers['access-control-allow-headers']).to.include('Authorization')
    })
  })
})
