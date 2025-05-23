"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import LocaleLink from '@/app/components/LocaleLink';
import { useSession } from 'next-auth/react'; // Import useSession

export default function Footer() {
  const t = useTranslations();
  // We need useSession to conditionally show the sign-in link
  // This makes the Footer a Client Component by default.
  // If session wasn't needed, it could be a Server Component.
  const { data: session } = useSession();

  return (
    <footer className="bg-gradient-to-r from-[#1a2239] to-[#263354] mt-auto border-t border-[#30364a]/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div>
            <h3 className="text-[#58a6ff] font-medium mb-4">{t('hero.title')}</h3>
            <p className="text-gray-400 text-sm">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h3 className="text-[#58a6ff] font-medium mb-4">{t('footer.quick_links')}</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li><LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('navigation.home')}</LocaleLink></li>
              <li><LocaleLink href="/categories" className="hover:text-[#58a6ff] transition-colors">{t('navigation.categories')}</LocaleLink></li>
              <li><LocaleLink href="/recently_added" className="hover:text-[#58a6ff] transition-colors">{t('navigation.recently_added')}</LocaleLink></li>
            </ul>
          </div>
          <div>
            <h3 className="text-[#58a6ff] font-medium mb-4">{t('footer.account')}</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li><LocaleLink href="/profile" className="hover:text-[#58a6ff] transition-colors">{t('footer.my_profile')}</LocaleLink></li>
              <li><LocaleLink href="/favorites" className="hover:text-[#58a6ff] transition-colors">{t('footer.my_favorites')}</LocaleLink></li>
              {!session?.user && (
                <li><LocaleLink href="/profile" className="hover:text-[#58a6ff] transition-colors">{t('navigation.sign_in')}</LocaleLink></li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-[#30364a]/50 text-center text-gray-500 text-sm">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
