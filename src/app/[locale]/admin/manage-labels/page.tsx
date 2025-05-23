import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { 
  TagIcon, 
  ArrowLeftIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';
import LocaleLink from '@/app/components/LocaleLink';
import ManageLabelsClient from '@/app/components/admin/manage-labels/ManageLabelsClient';
import { getLanguages as getEnabledLanguages } from '@/lib/i18n-utils'; // Added import
import type { Language as LanguageType } from '@/types/i18n'; // Added import for type

interface Props {
  params: { locale: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ManageLabelsPage({ params, searchParams }: Props) {
  const { locale } = params;
  setRequestLocale(locale);
  
  const t = await getTranslations({ locale }); // For AdminManageLabels and navigation
  const session = await auth();

  if (!session || !session.user) {
    redirect(`/${locale}/profile`);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email as string },
  });

  if (!user || !user.isAdmin) {
    redirect(`/${locale}`);
  }

  // Pass searchParams to the client component for it to handle fetching/filtering
  const currentPage = typeof searchParams?.page === 'string' ? parseInt(searchParams.page) : 1;
  const currentSearchQuery = typeof searchParams?.search === 'string' ? searchParams.search : "";

  let availableLanguages: Pick<LanguageType, "id" | "code" | "name">[] = [];
  try {
    const langResult = await getEnabledLanguages();
    if (langResult.success) {
      availableLanguages = langResult.languages;
    } else {
      console.error("Failed to load languages for ManageLabelsPage:", langResult.error);
      // availableLanguages remains an empty array, client component should handle this
    }
  } catch (e) {
    console.error("Exception while loading languages for ManageLabelsPage:", e);
    // availableLanguages remains an empty array
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Admin Dashboard Header */}
      <div className="bg-gradient-to-r from-[#1c2541] to-[#2a3a5e] border-b border-[#30364a]/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center">
                <TagIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
                {t('AdminManageLabels.title')}
              </h1>
              <p className="text-gray-400 max-w-3xl">
                {t('AdminManageLabels.description')}
              </p>
              
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 mt-4 text-sm text-gray-400">
                <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('navigation.home')}</LocaleLink>
                <span>/</span>
                <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t('navigation.admin_panel')}</LocaleLink>
                <span>/</span>
                <span className="text-[#58a6ff]">{t('AdminManageLabels.title')}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                <LocaleLink
                  href="/admin/new-label"
                  className="bg-[#58a6ff] hover:bg-[#4393e6] text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                >
                  <PlusCircleIcon className="h-5 w-5" />
                  {t('AdminManageLabels.addNewLabelButton')}
                </LocaleLink>
                <LocaleLink
                  href="/admin"
                  className="bg-[#1a2239]/80 hover:bg-[#1a2239] text-white px-4 py-2.5 rounded-lg border border-[#30364a] flex items-center justify-center gap-2 transition-all shadow-lg group"
                >
                  <ArrowLeftIcon className="h-4 w-4 group-hover:transform group-hover:-translate-x-1 transition-transform" />
                  {t('navigation.back_to_admin')}
                </LocaleLink>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gradient-to-br from-[#1a2239] to-[#1c2541] rounded-xl border border-[#30364a] shadow-2xl overflow-hidden">
            <div className="p-0 sm:p-2 md:p-6"> {/* Adjusted padding for responsiveness */}
              <ManageLabelsClient 
                locale={locale} 
                initialPage={currentPage}
                initialSearchQuery={currentSearchQuery}
                availableLanguages={availableLanguages}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
