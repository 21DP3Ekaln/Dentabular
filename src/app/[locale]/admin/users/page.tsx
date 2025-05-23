import { auth } from "@/auth"
import { redirect } from "next/navigation"; // Use standard redirect
import { prisma } from '@/lib/prisma'
import LocaleLink from '@/app/components/LocaleLink'; // Import LocaleLink
import { getTranslations } from 'next-intl/server'; // Import for server component
import { 
  UserGroupIcon,
  ArrowLeftIcon,
  UserIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline'
import { getUsers } from '@/app/actions/userActions'
import UserTableClient from './UserTableClient'
import SearchFilterClient from './SearchFilterClient'
import RefreshButton from '@/app/components/admin/RefreshButton'

interface UsersPageProps {
  searchParams: {
    page?: string
    limit?: string
    search?: string
    role?: string
  },
  params: { locale: string } // Add locale param
}

export default async function AdminUsersPage({ 
  searchParams,
  params 
}: UsersPageProps) {
  // Properly await both params and searchParams
  const { locale } = await params;
  const queryParams = await searchParams;
  
  const t = await getTranslations({ locale, namespace: 'AdminUsersPage' }); // Initialize translations
  const session = await auth()
  
  // Redirect if not logged in or no user email
  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/admin/users') // Standard redirect is fine here
    return null; // Stop execution after redirect
  }
  
  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }, // No need for 'as string' if already checked
    select: { id: true, isAdmin: true }
  })
  
  // Redirect if user not found or not admin
  if (!user || !user.isAdmin) {
    redirect('/') // Standard redirect is fine here
    return null; // Stop execution after redirect
  }
  
  // Parse query params from the awaited searchParams
  const page = Number(queryParams.page) || 1
  const limit = Number(queryParams.limit) || 10
  const search = queryParams.search || ''
  const roleParam = queryParams.role || ''
  
  // Validate role parameter
  const role = (roleParam === 'admin' || roleParam === 'user') 
    ? roleParam 
    : 'all'
  
  // Fetch users with pagination and filters
  const { users, pagination } = await getUsers({ page, limit, search, role })
  
  // Get total counts for statistics
  const totalUsers = await prisma.user.count()
  const totalAdmins = await prisma.user.count({
    where: { isAdmin: true }
  })
  const totalDisabled = await prisma.user.count({
    where: { isDisabled: true }
  })
  
  return (
    <div className="min-h-screen bg-[#0b0f23] text-[#eaeaea] flex flex-col">
      {/* Page title */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-6">
        <div className="flex items-center justify-between">
          <LocaleLink 
            href="/admin"
            className="flex items-center text-[#58a6ff] hover:text-[#4393e6] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            <span>{t('backToDashboard')}</span> {/* Translate */}
          </LocaleLink>
          
          <RefreshButton />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-2 flex items-center">
          <UserGroupIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('pageTitle')} {/* Translate */}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t('pageDescription')} {/* Translate */}
        </p>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          {/* Use translation keys */}
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('header.home')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t('header.adminPanel')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">{t('header.userManagement')}</span> {/* Use existing key */}
        </div>
      </section>
      
      {/* User stats */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 flex items-center shadow-lg">
            <div className="rounded-full bg-[#58a6ff]/20 p-3 mr-4">
              <UserGroupIcon className="h-6 w-6 text-[#58a6ff]" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('stats.totalUsers')}</p> {/* Translate */}
              <p className="text-white text-2xl font-semibold">{totalUsers}</p>
            </div>
          </div>
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 flex items-center shadow-lg">
            <div className="rounded-full bg-green-500/20 p-3 mr-4">
              <UserIcon className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('stats.administrators')}</p> {/* Translate */}
              <p className="text-white text-2xl font-semibold">{totalAdmins}</p>
            </div>
          </div>
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 flex items-center shadow-lg">
            <div className="rounded-full bg-red-500/20 p-3 mr-4">
              <UserMinusIcon className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('stats.disabledAccounts')}</p> {/* Translate */}
              <p className="text-white text-2xl font-semibold">{totalDisabled}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search and filter section */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-6">
        <SearchFilterClient 
          initialSearch={search}
          initialRole={roleParam}
        />
      </section>

      {/* Main content */}
      <main className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-12">
        <UserTableClient 
          initialUsers={users}
          pagination={pagination}
          currentAdminId={user.id} // user is guaranteed to be non-null here
        />
      </main>
    </div>
  )
}
