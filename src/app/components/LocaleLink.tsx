'use client';

import { Link as IntlLink } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { ComponentProps, forwardRef } from 'react';

// Type for our LocaleLink component
type LocaleLinkProps = ComponentProps<typeof IntlLink>;

// LocaleLink component that always preserves the current locale
const LocaleLink = forwardRef<HTMLAnchorElement, LocaleLinkProps>(
  ({ href, locale, ...rest }, ref) => {
    // Get current locale
    const currentLocale = useLocale();
    
    // Use explicitly provided locale or default to current locale
    const linkLocale = locale || currentLocale;
    
    return <IntlLink ref={ref} href={href} locale={linkLocale} {...rest} />;
  }
);

// Display name for debugging
LocaleLink.displayName = 'LocaleLink';

export default LocaleLink; 