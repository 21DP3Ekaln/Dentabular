import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
// Create next-intl middleware with enhanced locale detection
export default createMiddleware({
  // Use routing config
  ...routing,
  
  // Add locale detection from user preferences cookie
  localeDetection: true,
  
  // Default locale when none is found
  defaultLocale: 'en',
  
  // Always redirect to a locale-prefixed path
  localePrefix: 'always'
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};