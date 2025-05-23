import { getTermVersionForEditing } from '@/app/actions/manage_termsActions';
import EditTermForm from '@/app/components/admin/edit-term/EditTermForm';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PencilIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import LocaleLink from '@/app/components/LocaleLink';

interface EditTermPageProps {
  params: Promise<{
    locale: string;
    id: string; // Term Version ID (or source version ID if creating)
  }>;
  searchParams: { [key: string]: string | string[] | undefined }; // Add searchParams
}

export async function generateMetadata({ params }: Omit<EditTermPageProps, 'searchParams'>) { // Omit searchParams here
  // Properly await the params to get the locale
  const { locale } = await params;
  // Pass locale explicitly to getTranslations
  const t = await getTranslations({ locale, namespace: 'AdminEditTerm' }); 
  return {
    title: t('metaTitle'),
  };
}

// Updated function signature to receive params and searchParams
export default async function EditTermPage({ params, searchParams }: EditTermPageProps) {
  // Properly await the params to get the locale and id
  const awaitedParams = await params; 
  const { locale, id } = awaitedParams;
  setRequestLocale(locale);

  // Determine mode from searchParams
  const modeQueryParam = searchParams?.mode;
  
  // ID from URL is the source/target version ID
  const versionId = parseInt(id, 10); 
  const t = await getTranslations('AdminEditTerm');
  
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

  if (isNaN(versionId)) {
    notFound();
  }

  // Fetch the version data (either the draft to edit or the source to copy from)
  const { termVersion: fetchedVersion, error } = await getTermVersionForEditing(versionId);

  // Determine the actual mode based on query param and fetched version status
  let editMode: 'editExisting' | 'createFromSource' = 'editExisting'; // Default to editing
  let pageTitleKey = 'pageTitle'; // Default title key
  let notEditable = false;

  if (fetchedVersion) {
    if (modeQueryParam === 'createFromSource' && fetchedVersion.status !== 'DRAFT') {
      // We are creating a new draft based on a non-draft source
      editMode = 'createFromSource';
      pageTitleKey = 'createPageTitle'; // Use a different title like "Create New Draft from vX"
    } else if (fetchedVersion.status !== 'DRAFT') {
      // Trying to edit a non-draft directly (without createFromSource mode) - this is not allowed
      notEditable = true;
    }
    // If it's a DRAFT and no mode=createFromSource, default 'editExisting' is correct.
  }

  // Add a new translation key 'createPageTitle' to your messages files
  // e.g., "Create New Draft from v{version}"

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0b0f23] to-[#0d1229] text-[#eaeaea]">
      {/* Page title with improved styling */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-8 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 flex items-center">
          <div className="bg-[#58a6ff]/10 p-2 rounded-lg mr-4">
            <PencilIcon className="h-8 w-8 text-[#58a6ff]" />
          </div>
          {/* Adjust title based on mode */}
          {error ? t('errorTitle')
           : notEditable ? t('notEditableTitle')
           // Ensure fetchedVersion exists before accessing versionNumber for translation
           : fetchedVersion ? t(pageTitleKey, { version: fetchedVersion.versionNumber }) : t('errorTitle') }
        </h1>
        {fetchedVersion && (
          <h2 className="text-xl text-gray-300 mb-4 pl-16">
            {fetchedVersion.translations.find(tr => tr.language.code === locale)?.name ||
             fetchedVersion.translations.find(tr => tr.language.code === 'en')?.name ||
             fetchedVersion.translations.find(tr => tr.language.code === 'lv')?.name ||
             `Term v${fetchedVersion.versionNumber}`}
          </h2>
        )}

        {/* Breadcrumb with improved styling */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 pl-16 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">Home</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">Admin Panel</LocaleLink>
          <span className="text-gray-600">/</span>
          {/* Remove locale prefix from href */}
          <LocaleLink href={`/admin/manage-terms`} className="hover:text-[#58a6ff] transition-colors">Manage Terms</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">Edit Term</span>
        </div>
      </section>

      {/* Main content with better spacing */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <div className="mb-8">
          {/* Remove locale prefix from href */}
          <LocaleLink
            href={`/admin/manage-terms?status=DRAFT`}
            className="inline-flex items-center text-[#58a6ff] hover:text-[#64d8cb] transition-colors gap-2 bg-[#1a2239]/40 px-4 py-2 rounded-lg border border-[#30364a] hover:border-[#58a6ff]/30"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {/* Adjust link based on mode? Maybe always go back to drafts? */}
            {t('backToDrafts')}
          </LocaleLink>
        </div>

        {error ? (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 text-center shadow-lg">
            <p className="text-red-400 text-lg">{t('fetchError', { error })}</p>
          </div>
        ) : !fetchedVersion ? (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-8 text-center shadow-lg">
            <p className="text-amber-400 text-lg">{t('termNotFound')}</p>
          </div>
        ) : notEditable ? ( // Use the notEditable flag
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-8 text-center shadow-lg">
            <p className="text-amber-400 text-lg">{t('notDraftError')}</p>
          </div>
        ) : (
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] shadow-lg overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-[#263354] to-[#223049] border-b border-[#30364a] px-7 py-5">
              <h3 className="text-[#58a6ff] font-medium flex items-center gap-2 text-lg">
                <PencilIcon className="h-5 w-5" />
                {/* Adjust title based on mode */}
                {editMode === 'createFromSource' ? t('creatingNewDraftTitle') : t('editingTermTitle')}
              </h3>
            </div>
            <div className="p-7 md:p-10">
              {/* Pass fetchedVersion and editMode to the form */}
              <EditTermForm
                termVersionData={fetchedVersion}
                locale={locale}
                mode={editMode}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
