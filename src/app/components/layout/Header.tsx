'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation'; // Import usePathname, useRouter, useSearchParams
import { useTranslations, useLocale } from 'next-intl';
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import LocaleLink from '@/app/components/LocaleLink';
import { checkIsAdmin } from '@/app/actions/authActions'; // Assuming this action can be called client-side if needed, or adjust logic

export default function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname(); // Get current path
  const { data: session } = useSession();

  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // State specifically for the search input in the header, initialized from URL
  const [headerSearchQuery, setHeaderSearchQuery] = useState(searchParams?.get('q') || ''); // Added optional chaining
  // Removed isHeaderSearching state as it's no longer used for the spinner

  // Check if user is admin
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (session?.user?.email) {
        try {
          const { isAdmin: adminStatus } = await checkIsAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Error checking admin status in Header:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    fetchAdminStatus();
  }, [session]);

  // Determine if the current page is the homepage
  const isHomePage = pathname === `/${locale}` || pathname === '/';

  // Check if user is admin
  useEffect(() => {
    const fetchAdminStatus = async () => {
      if (session?.user?.email) {
        try {
          const { isAdmin: adminStatus } = await checkIsAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Error checking admin status in Header:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    fetchAdminStatus();
  }, [session]);

  // Effect to update URL search parameter when headerSearchQuery changes
  useEffect(() => {
    if (!isHomePage || !searchParams) return; // Added check for searchParams

    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (headerSearchQuery) {
        params.set('q', headerSearchQuery);
      } else {
        params.delete('q');
      }
      // Use router.replace to change URL without full page reload
      router.replace(`${pathname}?${params.toString()}`);
    }, 300); // Debounce time

    return () => clearTimeout(delayDebounce);
  }, [headerSearchQuery, router, pathname, searchParams, isHomePage]);

  // Effect to sync header search input with URL changes (e.g., back/forward button)
  useEffect(() => {
    if (isHomePage && searchParams) { // Added check for searchParams
      setHeaderSearchQuery(searchParams.get('q') || '');
    } else if (!isHomePage) {
      // Clear header search when navigating away from homepage
      setHeaderSearchQuery('');
    }
  }, [searchParams, isHomePage]);


  return (
    <header className="bg-gradient-to-r from-[#1a2239] to-[#263354] shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <LocaleLink href="/" className="flex items-center">
              <span className="font-bold text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb]">
                {t('app.name')}
              </span>
            </LocaleLink>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:flex-grow justify-center space-x-4 xl:space-x-6">
            {session?.user && (
              <LocaleLink
                href="/profile"
                className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors relative px-2 whitespace-nowrap text-sm md:text-base after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#58a6ff] after:transition-all hover:after:w-full"
              >
                {t('navigation.profile')}
              </LocaleLink>
            )}
            {session?.user && isAdmin && (
              <LocaleLink
                href="/admin"
                className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors relative flex items-center gap-1 px-2 whitespace-nowrap text-sm md:text-base after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#58a6ff] after:transition-all hover:after:w-full"
              >
                <ShieldCheckIcon className="h-4 w-4 shrink-0" />
                {t('navigation.admin_panel')}
              </LocaleLink>
            )}
            <LocaleLink
              href="/categories"
              className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors relative px-2 whitespace-nowrap text-sm md:text-base after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#58a6ff] after:transition-all hover:after:w-full"
            >
              {t('navigation.categories')}
            </LocaleLink>
            <LocaleLink
              href="/favorites"
              className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors relative px-2 whitespace-nowrap text-sm md:text-base after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#58a6ff] after:transition-all hover:after:w-full"
            >
              {t('navigation.favorites')}
            </LocaleLink>
            <LocaleLink
              href="/recently_added"
              className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors relative px-2 whitespace-nowrap text-sm md:text-base after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-[#58a6ff] after:transition-all hover:after:w-full"
            >
              {t('navigation.recently_added')}
            </LocaleLink>
          </nav>

          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Search Input (conditionally rendered) */}
            {isHomePage && (
              <div className="relative hidden sm:block flex-grow max-w-sm mx-4"> {/* Added flex-grow and max-w-sm */}
                <input
                  type="text"
                  placeholder={t('search.search_placeholder')}
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  className="w-full bg-[#10142a]/80 border border-[#30364a] rounded-full pl-9 pr-10 py-1.5 text-[#eaeaea] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {headerSearchQuery && ( // Removed !isHeaderSearching condition
                  <button
                    onClick={() => setHeaderSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={t('search.clear_search')}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
                {/* Removed isHeaderSearching spinner from header */}
              </div>
            )}

            {/* Language Switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* User Profile */}
            {session?.user ? (
              <LocaleLink href="/profile">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || ''}
                    className="w-9 h-9 rounded-full cursor-pointer hover:ring-2 hover:ring-[#58a6ff] transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 bg-gradient-to-br from-[#58a6ff] to-[#64d8cb] rounded-full flex items-center justify-center text-white cursor-pointer hover:ring-2 hover:ring-white/40 transition-all">
                    {session.user.name?.[0] || 'U'}
                  </div>
                )}
              </LocaleLink>
            ) : (
              <LocaleLink href="/profile" className="w-9 h-9 bg-[#1a2239] rounded-full flex items-center justify-center cursor-pointer text-[#eaeaea] font-bold hover:bg-[#263354] transition-colors border border-[#30364a]">
                U
              </LocaleLink>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden bg-[#10142a]/60 text-[#eaeaea] p-1.5 rounded-lg border border-[#30364a]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-[#1a2239] shadow-lg border-t border-[#30364a]">
          <div className="px-4 py-3 space-y-3">
            {/* Mobile search input (conditionally rendered) */}
            {isHomePage && (
                <div className="relative mb-3">
                <input
                    type="text"
                    placeholder={t('search.search_placeholder')}
                    value={headerSearchQuery}
                    onChange={(e) => setHeaderSearchQuery(e.target.value)}
                    className="w-full bg-[#10142a]/80 border border-[#30364a] rounded-full pl-9 pr-10 py-1.5 text-[#eaeaea] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {headerSearchQuery && (
                    <button
                    onClick={() => setHeaderSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={t('search.clear_search')}
                    >
                    <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
                </div>
            )}

            {session?.user && (
              <LocaleLink
                href="/profile"
                className="block text-[#eaeaea] hover:text-[#58a6ff] py-2 transition-colors"
              >
                {t('navigation.profile')}
              </LocaleLink>
            )}
            {session?.user && isAdmin && (
              <LocaleLink
                href="/admin"
                className="block text-[#eaeaea] hover:text-[#58a6ff] py-2 transition-colors flex items-center gap-2"
              >
                <ShieldCheckIcon className="h-4 w-4 shrink-0" />
                <span className="break-normal">{t('navigation.admin_panel')}</span>
              </LocaleLink>
            )}
            <LocaleLink
              href="/categories"
              className="block text-[#eaeaea] hover:text-[#58a6ff] py-2 transition-colors"
            >
              {t('navigation.categories')}
            </LocaleLink>
            <LocaleLink
              href="/favorites"
              className="block text-[#eaeaea] hover:text-[#58a6ff] py-2 transition-colors"
            >
              {t('navigation.favorites')}
            </LocaleLink>
            <LocaleLink
              href="/recently_added"
              className="block text-[#eaeaea] hover:text-[#58a6ff] py-2 transition-colors"
            >
              {t('navigation.recently_added')}
            </LocaleLink>
            {/* Mobile Language Switcher could go here if needed */}
            {/* <div className="pt-2 border-t border-[#30364a]">
                 <LanguageSwitcher />
               </div> */}
          </div>
        </nav>
      )}
    </header>
  );
}
