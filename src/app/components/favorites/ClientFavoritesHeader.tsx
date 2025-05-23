'use client';

import { CalendarIcon } from '@heroicons/react/24/outline';
import { useFavorites } from './FavoritesProvider';
import { useTranslations } from 'next-intl';

export default function ClientFavoritesHeader() {
  const { favorites } = useFavorites();
  const t = useTranslations();

  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-4">
      <div className="flex items-center">
        <CalendarIcon className="h-5 w-5 text-[#58a6ff] mr-2" />
        <h2 className="text-xl text-[#58a6ff] font-semibold">{t('profile.your_favorites')}</h2>
      </div>
    </div>
  );
}
