import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Exclude: static files (with extensions), api routes, _next, sitemap.xml, robots.txt
  // sitemap.xml and robots.txt are served by Next.js App Router as dynamic routes —
  // next-intl must NOT intercept them or it will break the XML/text response.
  matcher: ['/((?!api|_next|_vercel|sitemap\\.xml|robots\\.txt|.*\\..*).*)'],
}
