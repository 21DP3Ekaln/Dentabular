import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

// Lightweight wrappers around Next.js' navigation
// APIs that consider the routing configuration with enhanced locale handling
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation({
    ...routing,
    // Ensure locale is always included in the URL
    localePrefix: 'always'
  });