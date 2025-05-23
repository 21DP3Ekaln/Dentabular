import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'; // Added ArrowLeftIcon
import LocaleLink from '@/app/components/LocaleLink';
import ManageTermsClient from '@/app/components/admin/manage-terms/ManageTermsClient';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function ManageTermsPage({ params }: Props) {
  // Properly await the params to get the locale
  const { locale } = await params;
  setRequestLocale(locale);
  
  const t = await getTranslations({ locale });
  const session = await auth();

  // Redirect if user is not logged in
  if (!session || !session.user) {
    redirect('/profile');
  }

  // Fetch the user to check if they're an admin
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email as string,
    },
  });

  if (!user || !user.isAdmin) {
    redirect('/');
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Admin Dashboard Header - Styled like categories page */}
      <div className="bg-gradient-to-r from-[#1c2541] to-[#2a3a5e] border-b border-[#30364a]/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center">
                <DocumentTextIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
                {t('AdminManageTerms.title')}
              </h1>
              <p className="text-gray-400 max-w-3xl">
                {t('AdminManageTerms.description') || 'Manage all terminology entries in the database. Filter, search, and perform actions on terms.'}
              </p>
              
              {/* Breadcrumb */}
              <div className="flex items-center space-x-2 mt-4 text-sm text-gray-400">
                <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('navigation.home')}</LocaleLink>
                <span>/</span>
                <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t('navigation.admin_panel')}</LocaleLink>
                <span>/</span>
                <span className="text-[#58a6ff]">{t('AdminManageTerms.title')}</span>
              </div>
            </div>
            
            <LocaleLink
              href="/admin"
              className="bg-[#1a2239]/80 hover:bg-[#1a2239] text-white px-4 py-2 rounded-lg border border-[#30364a] flex items-center transition-all shadow-lg group"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform" />
              {t('navigation.back_to_admin')}
            </LocaleLink>
          </div>
        </div>
      </div>

      {/* Main content - Adjusted structure */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-6 shadow-lg"> {/* Keep inner div for padding/styling */}
            <ManageTermsClient locale={locale} />
          </div>
        </div>
      </main>

    </div>
  );
}
