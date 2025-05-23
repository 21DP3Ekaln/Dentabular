/* eslint-disable @typescript-eslint/no-unused-vars */
import { auth } from "@/auth";
import { getFavorites } from '@/app/actions/favoriteActions';
import LocaleLink from '@/app/components/LocaleLink';
import { HeartIcon } from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import { Term } from '@/types/i18n';
import { getCurrentLocale } from '@/lib/i18n-utils';

// Client-side components
import { FavoritesProvider } from '@/app/components/favorites/FavoritesProvider';
import ClientFavoritesList from '@/app/components/favorites/ClientFavoritesList';
import ClientFavoriteCount from '@/app/components/favorites/ClientFavoriteCount';
import ClientExportButton from '@/app/components/favorites/ClientExportButton';
import ClientFavoritesHeader from '@/app/components/favorites/ClientFavoritesHeader';



// We need to accept the params for Next.js routing with [locale]
export default async function FavoritesPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Properly await the params to get the locale
  const { locale } = await params;
  // Standardized locale handling
  const currentLocale = getCurrentLocale(locale);
  
  const session = await auth();
  const { favorites } = await getFavorites();
  const t = await getTranslations({locale: currentLocale});

  // If not authenticated, redirect to profile page
  if (!session?.user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
        {/* Hero Section */}
        <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 text-center relative overflow-hidden rounded-xl border border-[#30364a]/30">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <HeartIcon className="h-12 w-12 text-red-500 mr-3" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb]">
                  {t('profile.favorites')}
                </h1>
              </div>
              <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
                {t('profile.sign_in_description')}
              </p>
              <LocaleLink
                href="/profile"
                className="bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all inline-block"
              >
                {t('actions.sign_in')}
              </LocaleLink>
            </div>

            {/* Decorative Wave */}
            <svg
              className="absolute bottom-0 left-0 w-full text-[#0b0f23]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
            </svg>
          </div>
        </section>
      </div>
    );
  }

  // The favorites from getFavorites are already in the format that FavoritesProvider expects
  // Just ensure all dates are proper Date objects
  const processedFavorites = favorites.map((term: Term) => ({
    ...term,
    createdAt: term.createdAt instanceof Date ? term.createdAt : new Date(term.createdAt)
  }));

  return (
    <FavoritesProvider initialFavorites={processedFavorites}>
      <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
        {/* Hero Section */}
        <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 relative overflow-hidden rounded-xl border border-[#30364a]/30">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <HeartIcon className="h-12 w-12 text-red-500 mr-3" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb]">
                  {t('profile.favorites')}
                </h1>
              </div>
              <ClientFavoriteCount />
              <div className="flex justify-center mt-6 space-x-4">
                <ClientExportButton />
              </div>
            </div>

            {/* Decorative Wave */}
            <svg
              className="absolute bottom-0 left-0 w-full text-[#0b0f23]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
            </svg>
          </div>
        </section>

        {/* Favorites Count - Now handled by client component */}
        <ClientFavoritesHeader />

        {/* Favorites List - Now handled by client component */}
        <ClientFavoritesList />
      </div>
    </FavoritesProvider>
  );
}
