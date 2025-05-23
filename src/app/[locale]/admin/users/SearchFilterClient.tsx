'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'; // Use locale-aware hooks
import { useTranslations } from 'next-intl'; // Import useTranslations
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface SearchFilterClientProps {
  initialSearch: string
  initialRole: string
}

export default function SearchFilterClient({
  initialSearch,
  initialRole
}: SearchFilterClientProps) {
  const t = useTranslations('AdminUsersSearchFilter'); // Initialize translations
  const router = useRouter()
  const pathname = usePathname()
  
  const [searchValue, setSearchValue] = useState(initialSearch)
  const [selectedRole, setSelectedRole] = useState(initialRole)
  const [isPending, startTransition] = useTransition()
  
  // Update the URL search params and trigger a navigation
  const updateSearchParams = (newParams: Record<string, string>) => {
    startTransition(() => {
      const url = new URL(window.location.href)
      const params = new URLSearchParams(url.search)
      
      // Update or delete search params
      Object.entries(newParams).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })
      
      // Always reset to page 1 when filters change
      params.set('page', '1')
      
      // This will not cause a full page reload but will update the URL and trigger a dynamic update
      router.push(`${pathname}?${params.toString()}`)
    })
  }
  
  // Handle search
  const handleSearch = () => {
    updateSearchParams({ search: searchValue.trim() })
  }
  
  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }
  
  // Handle role change - immediately update when changed
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value
    setSelectedRole(newRole)
    updateSearchParams({ role: newRole })
  }
  
  // Clear search
  const clearSearch = () => {
    setSearchValue('')
    updateSearchParams({ search: '' })
  }
  
  return (
    <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="block w-full pl-10 pr-10 py-2 border border-[#30364a] rounded-md bg-[#10142a] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] text-white text-sm placeholder-gray-500"
            placeholder={t('searchPlaceholder')} // Translate
          />
          {searchValue && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Role filter */}
        <div className="w-full sm:w-48">
          <select
            value={selectedRole}
            onChange={handleRoleChange}
            className="block w-full py-2 px-3 border border-[#30364a] rounded-md bg-[#10142a] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] text-white text-sm"
          >
            <option value="">{t('roles.all')}</option> {/* Translate */}
            <option value="admin">{t('roles.admin')}</option> {/* Translate */}
            <option value="user">{t('roles.user')}</option> {/* Translate */}
          </select>
        </div>
        
        {/* Search button (visible on larger screens) */}
        <div className="hidden sm:block">
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#58a6ff] hover:bg-[#58a6ff]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58a6ff] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('searchingButton')} {/* Translate */}
              </>
            ) : t('searchButton')} {/* Translate */}
          </button>
        </div>
        
        {/* Search button (visible on small screens) */}
        <div className="sm:hidden">
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#58a6ff] hover:bg-[#58a6ff]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58a6ff] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('searchingButton')} {/* Translate */}
              </>
            ) : t('searchButton')} {/* Translate */}
          </button>
        </div>
      </div>
    </div>
  )
}
