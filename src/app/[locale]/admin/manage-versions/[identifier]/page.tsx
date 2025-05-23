import { getAllTermVersionsByIdentifier } from '@/app/actions/manage_termsActions';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DocumentDuplicateIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import LocaleLink from '@/app/components/LocaleLink';
import VersionHistoryTable from '@/app/components/admin/manage-versions/VersionHistoryTable';

interface ManageVersionsPageProps {
  params: Promise<{
    locale: string;
    identifier: string; // Term identifier from the URL
  }>;
}

export async function generateMetadata({ params }: ManageVersionsPageProps) {
  // Properly await the params to get the identifier
  const { identifier } = await params;
  const t = await getTranslations('AdminManageVersions'); // Use default locale or fetch based on context if needed
  // Fetch termName using the existing function that gets all versions (includes termName)
  const { termName } = await getAllTermVersionsByIdentifier(identifier);
  return {
    title: t('metaTitle', { termName: termName || identifier }),
  };
}

export default async function ManageVersionsPage({ params }: ManageVersionsPageProps) {
  // Properly await the params to get the locale and identifier
  const { locale, identifier } = await params; // Await params directly
  setRequestLocale(locale);

  // Load necessary translations
  const t = await getTranslations({ locale, namespace: 'AdminManageVersions' });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tAdminAction = await getTranslations({ locale, namespace: 'admin.action' });

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

  const { versions, error, termName } = await getAllTermVersionsByIdentifier(identifier);

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Page title */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center">
          <DocumentDuplicateIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('pageTitle')}
        </h1>
        <h2 className="text-xl text-gray-300 mb-4">{termName || identifier}</h2>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-2 text-sm text-gray-400">
          <LocaleLink href="/" className="hover:text-[#58a6ff]">{tNav('home')}</LocaleLink>
          <span>/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff]">{tNav('admin_panel')}</LocaleLink>
          <span>/</span>
          <LocaleLink href={`/admin/manage-terms`} className="hover:text-[#58a6ff]">{tAdminAction('manage_terms')}</LocaleLink>
          <span>/</span>
          <span className="text-[#58a6ff]">{t('pageTitle')}</span> {/* Use pageTitle which means "Manage Versions" */}
        </div>
      </section>

      {/* Main content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
        <div className="mb-6">
          {/* Remove locale prefix from href */}
          <LocaleLink
            href={`/admin/manage-terms`}
            className="inline-flex items-center text-[#58a6ff] hover:text-[#64d8cb] transition-colors gap-1"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('backToManageTerms')}
          </LocaleLink>
        </div>

        {error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400">{t('fetchError', { error })}</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6 text-center">
            <p className="text-amber-400">{t('noVersionsFound')}</p>
          </div>
        ) : (
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] shadow-lg overflow-hidden">
            <div className="bg-[#263354] border-b border-[#30364a] px-6 py-4">
              <h3 className="text-[#58a6ff] font-medium flex items-center gap-2">
                <DocumentDuplicateIcon className="h-5 w-5" />
                {t('pageTitle')} - {termName || identifier}
              </h3>
            </div>
            <div className="p-0">
              <VersionHistoryTable versions={versions} locale={locale} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
