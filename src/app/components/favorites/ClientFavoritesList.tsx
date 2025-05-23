'use client';

import { Link } from '@/i18n/navigation';
import { CalendarIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import RemoveFavoriteButton from '../RemoveFavoriteButton';
import { useFavorites } from './FavoritesProvider';
import { useTranslations } from 'next-intl';

export default function ClientFavoritesList() {
  const { favorites } = useFavorites();
  const t = useTranslations();

  if (favorites.length === 0) {
    return (
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 className="text-xl text-[#58a6ff] mb-2">{t('profile.favorites')}</h3>
          <p className="text-gray-400 max-w-md">
            {t('profile.no_favorites')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="space-y-6">
        {favorites.map((term) => (
          <div
            key={term.id}
            className="bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-500 hover:shadow-xl hover:border-[#58a6ff]/30 group"
          >
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                    {term.activeVersion?.translations.find(t => t.language.code === 'lv')?.name || t('term_view.no_translation')}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">LV</span>
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {term.activeVersion?.translations.find(t => t.language.code === 'lv')?.description || t('term_view.no_description')}
                </p>
                
                <div className="mt-4 pt-4 border-t border-[#30364a]/30">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                      {term.activeVersion?.translations.find(t => t.language.code === 'en')?.name || t('term_view.no_translation')}
                    </h3>
                    <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">EN</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mt-2">
                    {term.activeVersion?.translations.find(t => t.language.code === 'en')?.description || t('term_view.no_description')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions footer */}
            <div className="bg-[#10142a]/40 border-t border-[#30364a] p-4 flex justify-between items-center relative">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded-full">
                    <span className="mr-1">♥</span> {t('term_view.favorited')}
                  </span>
                  {term.createdAt && (
                    <div className="hidden sm:flex items-center text-sm text-gray-400">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(term.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <RemoveFavoriteButton termId={term.id} />
              </div>

              <div className="absolute left-1/2 transform -translate-x-1/2">
                <span className="text-xs bg-[#263354] text-[#64d8cb] px-2 py-1 rounded-full">
                  {term.category.translations.find(t => t.language.code === 'en')?.name || t('category.uncategorized')}
                </span>
              </div>
              
              <Link
                href={`/comments/${term.id}`}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white px-3 py-1.5 rounded-lg hover:shadow-lg transition-all text-sm font-medium"
              >
                <BookOpenIcon className="h-4 w-4" />
                <span>{t('actions.view_details')}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
