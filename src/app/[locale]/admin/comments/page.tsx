import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from '@/lib/prisma';
import LocaleLink from '@/app/components/LocaleLink'; // Changed import
import { getTranslations } from 'next-intl/server'; // Added import
import { 
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { getCommentsForAdmin } from '@/app/actions/commentActions'
import AdminCommentsClient from './AdminCommentsClient';
import RefreshButton from '@/app/components/admin/RefreshButton';

// Type for comments with term info
export type CommentWithDetails = Awaited<ReturnType<typeof getCommentsForAdmin>>[0];

export default async function AdminCommentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  // Properly await both params and searchParams
  const { locale } = await params;
  const queryParams = await searchParams;
  
  const t = await getTranslations({ locale, namespace: 'admin.comments' }); // Fetch translations
  const tNav = await getTranslations({ locale, namespace: 'navigation' }); // Fetch navigation translations

  const session = await auth();
  
  // Check if the user is authenticated and is an admin
  if (!session || !session.user) {
    redirect('/login')
  }
  
  // Fetch the user to check if they're an admin
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email as string,
    },
  })
  
  if (!user || !user.isAdmin) {
    redirect('/')
  }

  // Get status from query parameters (default to 'all')
  const status = queryParams.status === 'open' || queryParams.status === 'closed' 
    ? queryParams.status 
    : 'all'
  
  // Fetch comments with the selected filter
  const comments = await getCommentsForAdmin({ status });
  
  // Stats
  const totalOpen = await prisma.comment.count({
    where: { 
      parentCommentId: null,
      isDeleted: false,
      isClosed: false
    }
  })
  
  const totalClosed = await prisma.comment.count({
    where: { 
      parentCommentId: null,
      isDeleted: false,
      isClosed: true
    }
  })
  
  // Send both server data and client-side state to the client component
  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Page title */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-6">
        <div className="flex items-center justify-between">
          <LocaleLink
            href="/admin"
            className="flex items-center text-[#58a6ff] hover:text-[#4393e6] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            <span>{t('backToDashboard')}</span>
          </LocaleLink>
          
          <RefreshButton />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-2 flex items-center">
          <ChatBubbleLeftRightIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('title')}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t('description')}
        </p>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{tNav('home')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{tNav('admin_panel')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">{t('title')}</span> {/* Current page */}
        </div>
      </section>
      
      {/* Comment stats */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 shadow-lg">
            <h3 className="text-gray-400 text-sm mb-1">{t('stats.total')}</h3>
            <p className="text-2xl font-bold text-white">{totalOpen + totalClosed}</p>
          </div>
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 shadow-lg">
            <h3 className="text-amber-400 text-sm mb-1">{t('stats.open')}</h3>
            <p className="text-2xl font-bold text-white">{totalOpen}</p>
          </div>
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 shadow-lg">
            <h3 className="text-green-400 text-sm mb-1">{t('stats.resolved')}</h3>
            <p className="text-2xl font-bold text-white">{totalClosed}</p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="flex-grow mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-12">
        <AdminCommentsClient
          initialComments={comments}
          currentFilter={status}
        />
      </main>

    </div>
  )
}
