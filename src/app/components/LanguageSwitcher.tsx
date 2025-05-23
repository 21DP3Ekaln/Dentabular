'use client';

// Create a new component: src/components/LanguageSwitcher.tsx
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { updateUserLanguagePreference } from '@/app/actions/userActions';

export default function LanguageSwitcher() {
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  
  // Function to handle language switching
  const switchLanguage = async (locale: string) => {
    try {
      // First update user preferences if they're logged in
      await updateUserLanguagePreference(locale);
      
      // Then navigate to the same page with the new locale
      router.replace(pathname, { locale });
    } catch (error) {
      console.error('Error switching language:', error);
      // If there's an error updating preferences, still try to navigate
      router.replace(pathname, { locale });
    }
  };
  
  return (
    <div className="flex gap-2">
      <button 
        onClick={() => switchLanguage('en')}
        className={`px-2 py-1 rounded transition-colors ${
          currentLocale === 'en' 
            ? 'bg-primary text-white font-medium' 
            : 'hover:bg-gray-200'
        }`}
        aria-current={currentLocale === 'en' ? 'page' : undefined}
      >
        {t('en')}
      </button>
      <button 
        onClick={() => switchLanguage('lv')}
        className={`px-2 py-1 rounded transition-colors ${
          currentLocale === 'lv' 
            ? 'bg-primary text-white font-medium' 
            : 'hover:bg-gray-200'
        }`}
        aria-current={currentLocale === 'lv' ? 'page' : undefined}
      >
        {t('lv')}
      </button>
    </div>
  );
}