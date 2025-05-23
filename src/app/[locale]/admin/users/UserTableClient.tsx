'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'; // Use locale-aware hooks
import { useSearchParams } from 'next/navigation'; // Use standard useSearchParams
import { useTranslations } from 'next-intl'; // Import useTranslations
import { updateUserRole, updateUserStatus, deleteUser, getUsers } from '@/app/actions/userActions'
import {
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import DeleteUserModal from './DeleteUserModal'

type User = {
  id: number
  email: string
  fullName: string
  isAdmin: boolean
  isDisabled: boolean
  createdAt: string | Date
}

type Pagination = {
  total: number
  pages: number
  page: number
  limit: number
}

interface UserTableClientProps {
  initialUsers: User[]
  pagination: Pagination
  currentAdminId: number
}

export default function UserTableClient({
  initialUsers,
  pagination: initialPagination,
  currentAdminId
}: UserTableClientProps) {
  const t = useTranslations('AdminUsersTable'); // Initialize translations
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isRefetching, setIsRefetching] = useState(false)
  
  // Effect to update URL when page changes without a full refresh
  useEffect(() => {
    // Get current search params safely
    const currentSearchParams = searchParams ?? new URLSearchParams(); // Use empty params if null
    const currentSearch = currentSearchParams.toString();
    const currentRole = currentSearchParams.get('role') || '';
    const currentSearchTerm = currentSearchParams.get('search') || '';
    const currentPage = currentSearchParams.get('page') || '1';
    
    const fetchUsers = async () => {
      try {
        setIsRefetching(true)
        const page = parseInt(currentPage)
        const { users: newUsers, pagination: newPagination } = await getUsers({
          page,
          limit: pagination.limit,
          search: currentSearchTerm,
          role: currentRole
        })
        setUsers(newUsers)
        setPagination(newPagination)
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setIsRefetching(false)
      }
    }
    
    // Only refetch if we have search params and not on initial render
    if (currentSearch) {
      fetchUsers()
    }
  }, [searchParams, pagination.limit])
  
  // Toggle admin status
  const handleRoleChange = async (user: User) => {
    if (user.id === currentAdminId && !user.isAdmin) {
      alert(t('alerts.cannotRemoveOwnAdmin')); // Translate alert
      return
    }
    
    try {
      const loadingKey = `role-${user.id}`
      setIsLoading(prev => ({ ...prev, [loadingKey]: true }))
      
      await updateUserRole(user.id, !user.isAdmin)
      
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u
      ))
    } catch (error) {
      console.error('Failed to update user role:', error)
      alert(t('alerts.roleUpdateFailed')); // Translate alert
    } finally {
      const loadingKey = `role-${user.id}`
      setIsLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }
  
  // Toggle disabled status
  const handleStatusChange = async (user: User) => {
    if (user.id === currentAdminId) {
      alert(t('alerts.cannotDisableOwnAccount')); // Translate alert
      return
    }
    
    try {
      const loadingKey = `status-${user.id}`
      setIsLoading(prev => ({ ...prev, [loadingKey]: true }))
      
      await updateUserStatus(user.id, !user.isDisabled)
      
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isDisabled: !u.isDisabled } : u
      ))
    } catch (error) {
      console.error('Failed to update user status:', error)
      alert(t('alerts.statusUpdateFailed')); // Translate alert
    } finally {
      const loadingKey = `status-${user.id}`
      setIsLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }
  
  // Handle user deletion
  const handleDelete = async (userId: number) => {
    if (userId === currentAdminId) {
      alert(t('alerts.cannotDeleteOwnAccount')); // Translate alert
      return
    }
    
    try {
      setIsLoading(prev => ({ ...prev, delete: true }))
      
      await deleteUser(userId)
      
      // Remove the deleted user from the list
      setUsers(users.filter(u => u.id !== userId))
      setUserToDelete(null)
      
      // Update pagination if needed
      if (users.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1)
      } else if (pagination.total > 0) {
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1,
          pages: Math.ceil((prev.total - 1) / prev.limit)
        }))
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert(t('alerts.deleteFailed')); // Translate alert
    } finally {
      setIsLoading(prev => ({ ...prev, delete: false }))
    }
  }
  
  // Pagination controls
  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }
  
  return (
    <>
      <div className="bg-[#1a2239] rounded-xl border border-[#30364a] overflow-hidden shadow-lg">
        {isRefetching && (
          <div className="py-2 px-6 bg-[#58a6ff]/10 text-[#58a6ff] text-sm flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#58a6ff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('updatingResults')} {/* Translate */}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#30364a]">
            <thead className="bg-[#10142a]">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('tableHeaders.user')} {/* Translate */}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('tableHeaders.email')} {/* Translate */}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('tableHeaders.role')} {/* Translate */}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('tableHeaders.status')} {/* Translate */}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t('tableHeaders.actions')} {/* Translate */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30364a]">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-[#232c45] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff]">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {user.fullName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {t('userIdPrefix')}: {user.id} {/* Translate */}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => handleRoleChange(user)}
                      disabled={isLoading[`role-${user.id}`] || user.id === currentAdminId && user.isAdmin}
                      className={`inline-flex items-center px-2.5 py-1.5 border rounded-md text-xs font-medium 
                        ${user.isAdmin 
                          ? 'border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/10' 
                          : 'border-gray-500 text-gray-400 hover:bg-gray-700'}
                        focus:outline-none transition-colors
                        ${user.id === currentAdminId && user.isAdmin ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {isLoading[`role-${user.id}`] ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        user.isAdmin ? t('roles.admin') : t('roles.user') // Translate
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleStatusChange(user)}
                      disabled={isLoading[`status-${user.id}`] || user.id === currentAdminId}
                      className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium
                        ${user.isDisabled
                          ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
                          : 'bg-green-900/20 text-green-400 hover:bg-green-900/30'}
                        focus:outline-none transition-colors
                        ${user.id === currentAdminId ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      {isLoading[`status-${user.id}`] ? (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : user.isDisabled ? (
                        <>
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          {t('status.disabled')} {/* Translate */}
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {t('status.active')} {/* Translate */}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setUserToDelete(user)}
                        disabled={isLoading.delete || user.id === currentAdminId}
                        className={`text-red-400 hover:text-red-300 transition-colors ${user.id === currentAdminId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 bg-[#10142a] border-t border-[#30364a] flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-[#30364a] text-sm font-medium rounded-md text-gray-300 bg-[#1a2239] hover:bg-[#232c45] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pagination.previous')} {/* Translate */}
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-[#30364a] text-sm font-medium rounded-md text-gray-300 bg-[#1a2239] hover:bg-[#232c45] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pagination.next')} {/* Translate */}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  {t('pagination.showingInfo', { page: pagination.page, pages: pagination.pages, total: pagination.total })} {/* Translate */}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-300 hover:bg-[#232c45] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('pagination.first')}</span> {/* Translate */}
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-300 hover:bg-[#232c45] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('pagination.previous')}</span> {/* Translate */}
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.pages) }).map((_, idx) => {
                    let pageNumber: number
                    
                    // Display pages centered around current page
                    if (pagination.pages <= 5) {
                      pageNumber = idx + 1
                    } else if (pagination.page <= 3) {
                      pageNumber = idx + 1
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNumber = pagination.pages - 4 + idx
                    } else {
                      pageNumber = pagination.page - 2 + idx
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => goToPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                          ${pagination.page === pageNumber
                            ? 'z-10 bg-[#58a6ff]/20 border-[#58a6ff] text-[#58a6ff]'
                            : 'bg-[#1a2239] border-[#30364a] text-gray-300 hover:bg-[#232c45]'
                          }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-300 hover:bg-[#232c45] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('pagination.next')}</span> {/* Translate */}
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => goToPage(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-300 hover:bg-[#232c45] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">{t('pagination.last')}</span> {/* Translate */}
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete User Modal */}
      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          isLoading={isLoading.delete}
          onDelete={() => handleDelete(userToDelete.id)}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </>
  )
}
