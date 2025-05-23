import { Term, TermTranslation, CategoryTranslation, Category, Language } from '@/types/i18n';
import { prisma } from './prisma';

// For server components
export function getCurrentLocale(localeFromParams: string | undefined): string {
  return localeFromParams || 'en';
}

// For client components - use with usePathname from next-intl/navigation
export function getLocaleFromPath(pathname: string): string {
  return pathname.split('/')[1] || 'en';
}

// Helper function to get term name in user's preferred language
export function getTermName(term: Term, locale = 'en'): string {
  if (!term?.activeVersion?.translations?.length) return 'Untitled Term';
  
  // Try to find the translation in the preferred language
  const translation = term.activeVersion.translations.find(
    (t: TermTranslation) => t.language.code === locale
  );
  
  // If found, return the name, otherwise return the first available translation name
  return translation?.name || term.activeVersion.translations[0]?.name || 'Untitled Term';
}

// Helper function to get term description in user's preferred language
export function getTermDescription(term: Term, locale = 'en'): string {
  if (!term?.activeVersion?.translations?.length) return 'No description available';
  
  const translation = term.activeVersion.translations.find(
    (t: TermTranslation) => t.language.code === locale
  );
  
  return translation?.description || term.activeVersion.translations[0]?.description || 'No description available';
}

// Helper function to get full translation (name and description)
export function getTermTranslation(term: Term, locale = 'en') {
  if (!term?.activeVersion?.translations?.length) {
    return { 
      name: 'Untitled Term', 
      description: 'No description available' 
    };
  }
  
  const translation = term.activeVersion.translations.find(
    (t: TermTranslation) => t.language.code === locale
  );
  
  return {
    name: translation?.name || term.activeVersion.translations[0]?.name || 'Untitled Term',
    description: translation?.description || term.activeVersion.translations[0]?.description || 'No description available'
  };
}

// Helper function to get category name from translations
export function getCategoryName(term: Term, locale = 'en'): string {
  if (!term?.category?.translations?.length) return 'Uncategorized';
  
  // Try to find a translation for the requested language
  const translation = term.category.translations.find(
    (t: CategoryTranslation) => {
      // Match by language code if available
      if (t.language?.code) {
        return t.language.code === locale;
      }
      // Otherwise match by languageId (assuming 1 is 'lv' and 2 is 'en')
      else {
        return (t.languageId === 1 && locale === 'lv') || 
               (t.languageId === 2 && locale === 'en');
      }
    }
  );
  
  return translation?.name || term.category.translations[0]?.name || 'Uncategorized';
}

// Helper function for getting a category name directly from a category object
export function getCategoryNameFromCategory(category: Category, locale = 'en'): string {
  if (!category?.translations?.length) return 'Uncategorized';
  
  const languageId = locale === 'lv' ? 1 : 2; // 1 for Latvian, 2 for English
  
  const localeTranslation = category.translations.find((t: CategoryTranslation) => {
    if (t.language?.code) {
      return t.language.code === locale;
    } else {
      return t.languageId === languageId;
    }
  });
  
  if (localeTranslation) return localeTranslation.name;
  
  // Fall back to English if available
  const engTranslation = category.translations.find((t: CategoryTranslation) => {
    if (t.language?.code) {
      return t.language.code === 'en';
    } else {
      return t.languageId === 2;
    }
  });
  
  if (engTranslation) return engTranslation.name;
  
  // Last resort - return any available translation or unnamed
  return category.translations[0]?.name || 'Uncategorized';
}

// Function to get all languages from the database
export async function getLanguages(): Promise<{ 
  success: boolean; 
  languages: Pick<Language, 'id' | 'code' | 'name'>[]; 
  error?: string; 
}> {
  try {
    const languages = await prisma.language.findMany({
      where: { isEnabled: true }, // Optionally, only fetch enabled languages
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' }
      ]
    });
    return { success: true, languages };
  } catch (error) {
    console.error('Error fetching languages from i18n-utils:', error);
    return { 
      success: false, 
      languages: [], 
      error: error instanceof Error ? error.message : 'Failed to fetch languages.' 
    };
  }
}
