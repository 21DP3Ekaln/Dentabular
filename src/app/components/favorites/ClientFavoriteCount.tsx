'use client';

import { useFavorites } from './FavoritesProvider';
import { useTranslations } from 'next-intl';

export default function ClientFavoriteCount() {
  const { favorites } = useFavorites();
  const t = useTranslations('profile');
  
  return (
    <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-2 text-center">
      {favorites.length === 0 
        ? t('no_favorites')
        : t('favorites_count', { count: favorites.length })}
    </p>
  );
}
