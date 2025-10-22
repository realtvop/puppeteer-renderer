import * as yup from 'yup'
import express, { Router } from 'express'
import { renderer } from './lib/renderer'
import { pageSchema, pageViewportSchema, pdfSchema, screenshotSchema } from './lib/validate-schema'
import contentDisposition from 'content-disposition'
import { validateUrlDomain } from './lib/domain-validator'
import * as fs from 'fs'
import * as path from 'path'

const router: Router = express.Router()

const urlSchema = yup.object({ url: yup.string().required() }).transform(current => {
  const regex = /^https?:\/\//;
  if (!regex.test(current.url)) {
    current.url = `https://${current.url}`
  }
  return current;
})

router.get('/ui', async (req, res, next) => {
  try {
    // Check if UI is enabled via environment variable
    if (process.env.ENABLE_UI !== 'true') {
      return res.status(404).send('UI not enabled.')
    }

    const uiPath = path.join(__dirname, 'ui.html')
    const html = fs.readFileSync(uiPath, 'utf-8')
    res.status(200).type('html').send(html)
  } catch (e) {
    next(e)
  }
})

router.get('/html', async (req, res, next) => {
  try {
    const { url, ...pageOptions } = urlSchema.concat(pageSchema).validateSync(req.query)
    
    // Validate domain
    validateUrlDomain(url)
    
    const html = await renderer!.html(url, pageOptions)
    res.status(200).send(html)
  } catch (e) {
    next(e)
  }
})

router.get('/screenshot', async (req, res, next) => {
  try {
    const { url, ...pageOptions } = urlSchema.concat(pageSchema).validateSync(req.query)
    const pageViewportOptions = pageViewportSchema.validateSync(req.query)
    const screenshotOptions = screenshotSchema.validateSync(req.query)

    // Validate domain
    validateUrlDomain(url)

    const { type, buffer } = await renderer!.screenshot(
      url,
      pageOptions,
      pageViewportOptions,
      screenshotOptions
    )
    res
      .set({
        'Content-Type': `image/${type || 'png'}`,
        'Content-Length': buffer.length,
      })
      .send(buffer)
  } catch (e) {
    next(e)
  }
})

router.get('/pdf', async (req, res, next) => {
  try {
    const { url, filename, contentDispositionType, ...pageOptions } = urlSchema
      .concat(
        yup.object({ filename: yup.string().nullable(), contentDispositionType: yup.string() })
      )
      .concat(pageSchema)
      .validateSync(req.query)
    const pdfOptions = pdfSchema.validateSync(req.query)

    // Validate domain
    validateUrlDomain(url)

    const pdf = await renderer!.pdf(url, pageOptions, pdfOptions)

    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdf.length,
        'Content-Disposition': contentDisposition(filename || getPDFFilename(url), {
          type: contentDispositionType || 'attachment',
        }),
      })
      .send(pdf)
  } catch (e) {
    next(e)
  }
})

function getPDFFilename(url: string) {
  const urlObj = new URL(url)

  let filename = urlObj.hostname

  if (urlObj.pathname !== '/') {
    // Get last part of path
    filename = urlObj.pathname.split('/').pop() || ''

    // Cut off extension
    const extDotPosition = filename.lastIndexOf('.')
    if (extDotPosition > 0) {
      filename = filename.substring(0, extDotPosition)
    }
  }

  // Add .pdf extension
  if (!filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf'
  }

  return filename
}

export default router
