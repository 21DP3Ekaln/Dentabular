'use client';

import { useState, useEffect } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { addFavorite, removeFavorite, isFavorited } from '@/app/actions/favoriteActions';

export default function ClientFavoriteButton({ 
  termId, 
  initialFavorited = false 
}: { 
  termId: number, 
  initialFavorited?: boolean 
}) {
  const { status } = useSession();
  const t = useTranslations();
  const [isFavorite, setIsFavorite] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check if the term is already favorited when the component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (status !== 'authenticated') {
        setIsCheckingStatus(false);
        return;
      }

      try {
        const result = await isFavorited(termId);
        setIsFavorite(result.favorited);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkFavoriteStatus();
  }, [termId, status]);

  const toggleFavorite = async () => {
    if (isLoading || status !== 'authenticated') return;
    
    setIsLoading(true);
    try {
      const action = isFavorite ? removeFavorite : addFavorite;
      const result = await action(termId);

      if (result.success) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not authenticated, do not show the button
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading || isCheckingStatus || status !== 'authenticated'}
      className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
        isLoading || isCheckingStatus ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={isFavorite ? t('term_view.remove_from_favorites') : t('term_view.add_to_favorites')}
    >
      {isCheckingStatus ? (
        <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      ) : isFavorite ? (
        <>
          <HeartSolid className="h-5 w-5 text-red-500" />
          <span className="hidden sm:inline text-gray-300 hover:text-[#58a6ff]">{t('term_view.favorited')}</span>
        </>
      ) : (
        <>
          <HeartOutline className="h-5 w-5 text-gray-400 hover:text-red-500" />
          <span className="hidden sm:inline text-gray-300 hover:text-[#58a6ff]">{t('term_view.add_to_favorites')}</span>
        </>
      )}
    </button>
  );
}
