import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  TagIcon,
  ChatBubbleLeftRightIcon,
  // ArrowPathIcon, // Removed as it's no longer used
  ShieldCheckIcon,
  UsersIcon,
  DocumentTextIcon,
  DocumentPlusIcon,
  ClockIcon,
  BookmarkSquareIcon // Example for Labels, can change if another is preferred
} from '@heroicons/react/24/outline';
import { getPendingTermsCount } from "@/app/actions/adminActions";
import { getLabelsCount } from "@/app/actions/labelActions"; // Import getLabelsCount
import LocaleLink from '@/app/components/LocaleLink';
import { getTranslations } from 'next-intl/server';


// Content component that fetches and displays admin data
async function AdminPanelContent({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });

  // Fetch recent comments
  const recentComments = await prisma.comment.findMany({
    where: {
      parentCommentId: null,
      isDeleted: false
    },
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      user: true,
      term: true,
      responses: {
        where: { isDeleted: false },
        include: { user: true }
      }
    }
  });

  // Fetch recent users
  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Fetch terms needing approval
  const termsNeedingApproval = await prisma.termVersion.findMany({
    where: {
      status: 'DRAFT'
    },
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      term: true,
      translations: {
        include: {
          language: true
        }
      }
    }
  });

  return (
    <div className="space-y-8">

      {/* Quick action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LocaleLink
          href="/admin/new-term"
          className="bg-[#1a2239] hover:bg-[#263354] border border-[#30364a] hover:border-[#58a6ff]/30 text-[#eaeaea] p-4 rounded-xl shadow-md flex items-center justify-center gap-3 transition-all"
        >
          <DocumentPlusIcon className="h-5 w-5 text-[#58a6ff]" />
          <span>{t('admin.action.add_new_term')}</span>
        </LocaleLink>
        <LocaleLink
          href="/admin/new-category"
          className="bg-[#1a2239] hover:bg-[#263354] border border-[#30364a] hover:border-[#58a6ff]/30 text-[#eaeaea] p-4 rounded-xl shadow-md flex items-center justify-center gap-3 transition-all"
        >
          <TagIcon className="h-5 w-5 text-[#58a6ff]" />
          <span>{t('admin.action.add_new_category')}</span>
        </LocaleLink>
        <LocaleLink
          href="/admin/new-label"
          className="bg-[#1a2239] hover:bg-[#263354] border border-[#30364a] hover:border-[#58a6ff]/30 text-[#eaeaea] p-4 rounded-xl shadow-md flex items-center justify-center gap-3 transition-all"
        >
          {/* Using TagIcon for labels as well, can be changed if a more specific icon is preferred */}
          <TagIcon className="h-5 w-5 text-[#58a6ff]" /> 
          <span>{t('admin.action.add_new_label')}</span>
        </LocaleLink>
        {/* Import/Export button removed */}
      </div>

      {/* Two-column layout for recent items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent comments */}
        <div className="bg-[#1a2239] rounded-xl border border-[#30364a] shadow-lg overflow-hidden">
          <div className="bg-[#263354] p-4 border-b border-[#30364a]">
            <div className="flex items-center justify-between">
              <h3 className="text-[#58a6ff] font-medium flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                {t('admin.section.recent_comments')}
              </h3>
              <LocaleLink href="/admin/comments" className="text-xs text-[#64d8cb] hover:underline">
                {t('admin.action.view_all')} →
              </LocaleLink>
            </div>
          </div>
          <div className="divide-y divide-[#30364a]">
            {recentComments.length > 0 ? (
              recentComments.map(comment => (
                <div key={comment.id} className="p-4 hover:bg-[#10142a]/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] font-bold flex-shrink-0">
                      {comment.user.fullName ? comment.user.fullName.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-[#eaeaea] truncate">{comment.user.fullName || t('common.anonymous')}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{t('admin.on')} <span className="text-[#64d8cb]">{`${t('admin.term_id')}: ${comment.termId}`}</span></p>
                      <p className="text-sm text-gray-300 line-clamp-2">{comment.content}</p>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${comment.isClosed ? 'bg-green-900/20 text-green-400' : 'bg-amber-900/20 text-amber-400'}`}>
                            {comment.isClosed ? t('admin.status.closed') : t('admin.status.open')}
                          </span>
                          {comment.responses.length > 0 && (
                            <span className="text-xs bg-[#263354] text-[#58a6ff] px-2 py-0.5 rounded-full">
                              {comment.responses.length} {comment.responses.length === 1 ? t('admin.response_singular') : t('admin.response_plural')}
                            </span>
                          )}
                        </div>
                        <LocaleLink href={`/comments/${comment.termId}`} className="text-xs text-[#58a6ff] hover:underline">
                          {t('admin.action.view_respond')}
                        </LocaleLink>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                {t('admin.no_recent_comments')}
              </div>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-[#1a2239] rounded-xl border border-[#30364a] shadow-lg overflow-hidden">
          <div className="bg-[#263354] p-4 border-b border-[#30364a]">
            <div className="flex items-center justify-between">
              <h3 className="text-[#58a6ff] font-medium flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                {t('admin.section.recently_joined_users')}
              </h3>
              <LocaleLink href="/admin/users" className="text-xs text-[#64d8cb] hover:underline">
                {t('admin.action.view_all')} →
              </LocaleLink>
            </div>
          </div>
          <div className="divide-y divide-[#30364a]">
            {recentUsers.length > 0 ? (
              recentUsers.map(user => (
                <div key={user.id} className="p-4 hover:bg-[#10142a]/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] font-bold flex-shrink-0">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#eaeaea] truncate">{user.fullName}</p>
                      <p className="text-sm text-gray-400 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${user.isAdmin ? 'bg-blue-900/20 text-blue-400' : 'bg-slate-900/20 text-slate-400'}`}>
                          {user.isAdmin ? t('admin.role.admin') : t('admin.role.user')}
                        </span>
                        {user.isDisabled && (
                          <span className="text-xs bg-red-900/20 text-red-400 px-2 py-0.5 rounded-full">
                            {t('admin.status.disabled')}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {t('admin.joined')} {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <LocaleLink href={`/admin/users/${user.id}`} className="text-xs text-[#58a6ff] whitespace-nowrap hover:underline">
                      {t('admin.action.manage')}
                    </LocaleLink>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">
                {t('admin.no_recent_users')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms pending approval */}
      <div className={`bg-[#1a2239] rounded-xl border ${termsNeedingApproval.length > 0 ? 'border-amber-500/30' : 'border-[#30364a]'} shadow-lg overflow-hidden`}>
        <div className={`${termsNeedingApproval.length > 0 ? 'bg-gradient-to-r from-amber-900/30 to-[#263354]' : 'bg-[#263354]'} p-4 border-b border-[#30364a]`}>
          <div className="flex items-center justify-between">
            <h3 className={`${termsNeedingApproval.length > 0 ? 'text-amber-400' : 'text-[#58a6ff]'} font-medium flex items-center gap-2`}>
              <ClockIcon className="h-5 w-5" />
              {t('admin.section.terms_pending_approval')} {termsNeedingApproval.length > 0 && `(${termsNeedingApproval.length})`}
            </h3>
            <LocaleLink href="/admin/pending-terms" className="text-xs text-[#64d8cb] hover:underline">
              {t('admin.action.view_all')} →
            </LocaleLink>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#30364a]">
            <thead className="bg-[#10142a]/40">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin.term_id')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin.latvian_name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin.english_name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin.version')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin.created')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-[#1a2239] divide-y divide-[#30364a]">
              {termsNeedingApproval.length > 0 ? (
                termsNeedingApproval.map(version => {
                  // Get translations
                  const lvTranslation = version.translations.find(t => t.language.code === 'lv');
                  const enTranslation = version.translations.find(t => t.language.code === 'en');

                  return (
                    <tr key={version.id} className="hover:bg-[#10142a]/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{version.termId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{lvTranslation?.name || t('admin.no_translation')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{enTranslation?.name || t('admin.no_translation')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{version.versionNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(version.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <LocaleLink href={`/admin/terms/${version.termId}/versions/${version.id}`} className="text-[#58a6ff] hover:underline">
                          {t('admin.action.review')}
                        </LocaleLink>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    {t('admin.no_terms_pending_approval')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default async function AdminPanel({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Properly await the params to get the locale
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const session = await auth()

  // Redirect if user is not logged in
  if (!session || !session.user) {
    redirect('/profile')
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

  // Fetch dashboard stats
  const [
    totalUsers, 
    totalTerms, 
    totalCategories, 
    pendingTermsResult,
    labelsCountResult 
  ] = await Promise.all([
    prisma.user.count(),
    prisma.termini.count(),
    prisma.category.count(),
    getPendingTermsCount(),
    getLabelsCount() // Fetch labels count
  ]);

  const pendingTerms = pendingTermsResult.success ? pendingTermsResult.count : 0;
  const totalLabels = labelsCountResult.success ? labelsCountResult.count : 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Page title */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center">
          <ShieldCheckIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('admin.title')}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t('admin.description')}
        </p>
      </section>

      {/* Stats Cards */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-10">
        {/* Row 1: Users, Terms, Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Users Card */}
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-6 shadow-lg">
            <div className="flex items-center mb-3">
              <div className="bg-blue-900/20 p-2 rounded-lg mr-3">
                <UsersIcon className="h-6 w-6 text-blue-400" />
              </div>
              <h2 className="text-white font-medium">{t('admin.stats.users')}</h2>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{totalUsers}</p>
            <p className="text-gray-400 text-sm">{t('admin.stats.total_registered_users')}</p>
            <div className="mt-4">
              <LocaleLink
                href="/admin/users"
                className="text-[#58a6ff] hover:text-[#4393e6] text-sm transition-colors inline-flex items-center"
              >
                {t('admin.action.manage_users')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </LocaleLink>
            </div>
          </div>

          {/* Terms Card */}
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-6 shadow-lg">
            <div className="flex items-center mb-3">
              <div className="bg-green-900/20 p-2 rounded-lg mr-3">
                <DocumentTextIcon className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="text-white font-medium">{t('admin.stats.terms')}</h2>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{totalTerms}</p>
            <p className="text-gray-400 text-sm">{t('admin.stats.total_published_terms')}</p>
            <div className="mt-4">
              {/* Corrected Link */}
              <LocaleLink
                href="/admin/manage-terms"
                className="text-[#58a6ff] hover:text-[#4393e6] text-sm transition-colors inline-flex items-center"
              >
                {t('admin.action.manage_terms')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </LocaleLink>
            </div>
          </div>

          {/* Categories Card */}
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-6 shadow-lg">
            <div className="flex items-center mb-3">
              <div className="bg-purple-900/20 p-2 rounded-lg mr-3">
                <TagIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h2 className="text-white font-medium">{t('admin.stats.categories')}</h2>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{totalCategories}</p>
            <p className="text-gray-400 text-sm">{t('admin.stats.total_term_categories')}</p>
            <div className="mt-4">
              <LocaleLink
                href="/admin/categories"
                className="text-[#58a6ff] hover:text-[#4393e6] text-sm transition-colors inline-flex items-center"
              >
                {t('admin.action.manage_categories')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </LocaleLink>
            </div>
          </div>
        </div> {/* Closes Row 1 grid */}

        {/* Row 2: Labels, Pending Terms (Centered) */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full sm:w-auto">
            {/* Labels Card - New Card */}
            <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-6 shadow-lg">
              <div className="flex items-center mb-3">
                <div className="bg-yellow-900/20 p-2 rounded-lg mr-3"> {/* Different color for distinction */}
                  <BookmarkSquareIcon className="h-6 w-6 text-yellow-400" /> {/* Using BookmarkSquareIcon for labels */}
                </div>
                <h2 className="text-white font-medium">{t('admin.stats.labels')}</h2> {/* Ensure this key exists */}
              </div>
              <p className="text-3xl font-bold text-white mb-2">{totalLabels}</p>
              <p className="text-gray-400 text-sm">{t('admin.stats.total_labels')}</p> {/* Ensure this key exists */}
              <div className="mt-4">
                <LocaleLink
                  href="/admin/manage-labels"
                  className="text-[#58a6ff] hover:text-[#4393e6] text-sm transition-colors inline-flex items-center"
                >
                  {t('admin.action.manage_labels')} {/* Ensure this key exists */}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </LocaleLink>
              </div>
            </div>

            {/* Pending Terms Card */}
            <div className={`bg-[#1a2239] rounded-xl border ${pendingTerms > 0 ? 'border-amber-500/30 shadow-lg shadow-amber-900/20 animate-pulse' : 'border-[#30364a]'} p-6 shadow-lg ${pendingTerms > 0 ? 'relative overflow-hidden' : ''}`}>
              {pendingTerms > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-900/5 to-transparent"></div>
              )}
              <div className="relative z-10">
                <div className="flex items-center mb-3">
                  <div className={`${pendingTerms > 0 ? 'bg-amber-900/20' : 'bg-amber-900/20'} p-2 rounded-lg mr-3`}>
                    <ClockIcon className={`h-6 w-6 ${pendingTerms > 0 ? 'text-amber-400' : 'text-amber-400'}`} />
                  </div>
                  <h2 className="text-white font-medium">{t('admin.stats.pending_approval')}</h2>
                </div>
                <p className={`text-3xl font-bold ${pendingTerms > 0 ? 'text-amber-400' : 'text-white'} mb-2`}>{pendingTerms}</p>
                <p className="text-gray-400 text-sm">{t('admin.stats.terms_awaiting_review')}</p>
                <div className="mt-4">
                  <LocaleLink
                    href="/admin/pending-terms"
                    className={`${pendingTerms > 0 ? 'text-amber-400 hover:text-amber-300' : 'text-amber-400 hover:text-amber-300'} text-sm transition-colors inline-flex items-center`}
                  >
                    {t('admin.action.review_terms')}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </LocaleLink>
                </div>
              </div>
            </div>
          </div> {/* Closes sm:grid-cols-2 grid */}
        </div> {/* Closes flex justify-center div */}
      </section>

      {/* Main content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-8">
        <AdminPanelContent locale={locale} />
      </main>
    </div>
  )
}
