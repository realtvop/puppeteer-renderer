import qs from 'qs'
import express, { NextFunction, Request, Response } from 'express'
import createRenderer from './lib/renderer'
import router from './router'

const port = process.env.PORT || 3000

const app = express()

// Configure.
app.disable('x-powered-by')
app.set('query parser', (s: any) => qs.parse(s, { allowDots: true }))

// Global CORS middleware: allow any origin and handle preflight
app.use((req: Request, res: Response, next: NextFunction) => {
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

// Render url.
app.use(router)

// Index
app.get('/', (req: Request, res: Response) => {
  let message = `You can use <a href="/html">/html</a>, <a href="/screenshot">/screenshot</a> or <a href="/pdf">/pdf</a> endpoint.`
  
  if (process.env.ENABLE_UI === 'true') {
    message += ` <br><br>Or visit <a href="/ui">/ui</a> for the web interface.`
  }
  
  res.status(200).send(message)
})

// Not found page.
app.use((req: Request, res: Response) => {
  res.status(404).send('Not found.')
})

// Error page.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  res.status(500).send('Oops, An expected error seems to have occurred.')
})

// Create renderer and start server.
createRenderer({
  //devtools:true,

  ignoreHTTPSErrors: !!process.env.IGNORE_HTTPS_ERRORS,

  // We want to support multiple args in a string, to support spaces we will use -- as the separator
  // and rebuild the array with valid values:
  // '--host-rules=MAP localhost yourproxy --test' -> ['', 'host-rules=MAP localhost yourproxy', '', 'test'] -> ['--host-rules=MAP localhost yourproxy', '--test']
  args:
    typeof process.env.PUPPETEER_ARGS === 'string'
      ? process.env.PUPPETEER_ARGS.split('--')
          .filter(value => value !== '')
          .map(function (value) {
            return '--' + value
          })
      : [],
})
  .then(() => {
    app.listen(port, () => {
      console.info(`Listen port on ${port}.`)
    })
  })
  .catch(e => {
    console.error('Fail to initialize renderer.', e)
  })

// Terminate process
process.on('SIGINT', () => {
  process.exit(0)
})
