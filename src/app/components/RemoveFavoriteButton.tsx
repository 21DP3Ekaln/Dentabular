'use client';

import { useState } from 'react';
import { removeFavorite } from '@/app/actions/favoriteActions';
import { useFavorites } from '@/app/components/favorites/FavoritesProvider';
import { HeartIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';

interface RemoveFavoriteButtonProps {
  termId: number;
  onRemove?: () => void;
}

export default function RemoveFavoriteButton({ termId, onRemove }: RemoveFavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { removeFavorite: removeFromContext } = useFavorites();
  const t = useTranslations();

  const handleRemove = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const result = await removeFavorite(termId);
      
      if (result.success) {
        // Update the context state
        removeFromContext(termId);
        
        // Call the optional callback if provided
        if (onRemove) {
          onRemove();
        }
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isLoading}
      className="text-red-500 hover:text-red-400 transition-colors focus:outline-none"
      title={t('term_view.remove_from_favorites')}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <HeartIcon className="h-5 w-5" />
      )}
    </button>
  );
}
