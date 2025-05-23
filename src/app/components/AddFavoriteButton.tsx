'use client';

import { useState, useEffect } from 'react';
import { addFavorite, isFavorited } from '@/app/actions/favoriteActions';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface AddFavoriteButtonProps {
  termId: number;
  onAdd?: () => void;
}

export default function AddFavoriteButton({ termId, onAdd }: AddFavoriteButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check if the term is already favorited when the component mounts
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        setIsCheckingStatus(true);
        const { favorited } = await isFavorited(termId);
        setIsFavorite(favorited);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkFavoriteStatus();
  }, [termId]);

  const handleAddFavorite = async () => {
    if (isLoading || isFavorite) return;
    
    setIsLoading(true);
    try {
      const result = await addFavorite(termId);
      
      if (result.success) {
        setIsFavorite(true);
        if (onAdd) {
          onAdd();
        }
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <button
        disabled
        className="text-gray-400 transition-colors focus:outline-none"
      >
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </button>
    );
  }

  if (isFavorite) {
    return (
      <button
        disabled
        className="text-red-500 focus:outline-none"
        title="Already in favorites"
      >
        <HeartSolid className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleAddFavorite}
      disabled={isLoading}
      className="text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
      title="Add to favorites"
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <HeartOutline className="h-5 w-5" />
      )}
    </button>
  );
} 