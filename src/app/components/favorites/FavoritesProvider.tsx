'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Term } from '@/types/i18n';

// Define the context type
type FavoritesContextType = {
  favorites: Term[];
  removeFavorite: (termId: number) => void;
};

// Create the context with default values
const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  removeFavorite: () => {},
});

// Hook to use the favorites context
export const useFavorites = () => useContext(FavoritesContext);

// Provider component
export function FavoritesProvider({
  children,
  initialFavorites,
}: {
  children: ReactNode;
  initialFavorites: Term[];
}) {
  const [favorites, setFavorites] = useState<Term[]>(initialFavorites);

  // Function to remove a favorite using useCallback to prevent unnecessary rerenders
  const removeFavorite = useCallback((termId: number) => {
    setFavorites((prev) => prev.filter((term) => term.id !== termId));
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, removeFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
} 