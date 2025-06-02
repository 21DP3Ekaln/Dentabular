'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { searchTerms } from '@/app/actions/termActions';
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { useTranslations, useLocale } from 'next-intl';
import { 
  HeartIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid} from '@heroicons/react/24/solid';
import { getFavorites } from '@/app/actions/favoriteActions';
import { removeFavorite, addFavorite } from '@/app/actions/favoriteActions';
import LocaleLink from '@/app/components/LocaleLink';
import { getTermTranslation, getCategoryName } from '@/lib/i18n-utils';
import { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { TagIcon } from '@heroicons/react/24/outline';

type TermTranslation = {
  languageId: number;
  name: string;
  description: string;
  language: {
    id: number;
    code: string;
    name: string;
    isDefault: boolean;
    isEnabled: boolean;
  };
};

type TermVersion = {
  id: number;
  status: string;
  versionNumber: number;
  createdAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  termId: number;
  readyToPublish: boolean;
  translations: TermTranslation[];
};

type CategoryTranslation = {
  name: string;
  languageId: number;
  categoryId: number;
};

type Term = {
  id: number;
  identifier: string;
  activeVersionId: number | null;
  categoryId: number;
  createdAt: Date;
  activeVersion: TermVersion | null;
  category: {
    id: number;
    createdAt: Date;
    translations: CategoryTranslation[];
  };
  labels?: { // This matches the structure from Prisma include
    label: {
      id: number;
      translations: {
        name: string;
        language: { code: string };
      }[];
    };
  }[];
  isFavorited?: boolean;
};

// This is the type TermCard expects for its labels prop
type DisplayLabel = {
  id: number;
  name: string;
};

// Helper function to highlight search query
const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query || !text) {
    return <>{text}</>;
  }
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-300 text-black px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
};

// Type for favorite records returned from the API
type FavoriteRecord = {
  id: number;
  termId: number;
  userId: number;
};

export default function HomePage() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params
  const [terms, setTerms] = useState<Term[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || ''); // Initialize from URL
  const [isSearching, setIsSearching] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [activeLang, setActiveLang] = useState('both');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


  // Effect to update internal searchQuery state from URL changes
  useEffect(() => {
    setSearchQuery(searchParams?.get('q') || '');
  }, [searchParams]);

  // Effect to fetch terms based on searchQuery (from state, updated by URL)
  useEffect(() => {
    const fetchTerms = async () => {
      setIsSearching(true);
      // Explicitly type the result
      const result: { terms: Term[], hasMore: boolean } = await searchTerms(searchQuery, 0);
      setTerms(result.terms);
      setHasMore(result.hasMore);
      setCurrentPage(0);
      setIsSearching(false);

      // Animate new search results
      setTimeout(() => {
        const allItems = document.querySelectorAll('.term-item');
        allItems.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add('term-item-visible');
          }, index * 50);
        });
      }, 50);
    };

    fetchTerms();
  }, [searchQuery]); // Depend on internal searchQuery state

  // Animate terms after they're loaded (applies to initial load and subsequent searches)
  useEffect(() => {
    if (terms.length > 0) {
      const allItems = document.querySelectorAll('.term-item');
      allItems.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('term-item-visible');
        }, index * 50);
      });
    }
  }, [terms]); // Depend on terms state

  // Fetch user's favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (session?.user) {
        try {
          const { favorites } = await getFavorites();
          // Use the proper type for favorites
          setFavoriteIds(new Set(favorites.map((f: FavoriteRecord | { id: number }) => f.id)));
        } catch (error) {
          console.error('Error fetching favorites:', error);
        }
      }
    };
    fetchFavorites();
  }, [session]);

  const toggleFavorite = async (termId: number) => {
    if (!session?.user) {
      router.push(`/${locale}/profile`);
      return;
    }

    try {
      const isFavorited = favoriteIds.has(termId);
      let result;
      
      if (isFavorited) {
        result = await removeFavorite(termId);
      } else {
        result = await addFavorite(termId);
      }

      if (result.success) {
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          if (isFavorited) {
            newSet.delete(termId);
          } else {
            newSet.add(termId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Memoized recent terms (4 items for display)
  const recentTerms = useMemo(() => {
    return [...terms].slice(0, 4);
  }, [terms]);

  // Load more terms (now uses the searchQuery state)
  const loadMoreTerms = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const skip = nextPage * 15;

      // Explicitly type the result
      const result: { terms: Term[], hasMore: boolean } = await searchTerms(searchQuery, skip);

      // Store the current length to know which items are new
      const currentLength = terms.length;

      setTerms(prevTerms => [...prevTerms, ...result.terms]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);

      // Add a small delay to allow the DOM to update before animating
      setTimeout(() => {
        const newItems = document.querySelectorAll(`.term-item:nth-child(n+${currentLength + 1})`);
        newItems.forEach((item, index) => {
          // Stagger the animations slightly
          setTimeout(() => {
            item.classList.add('term-item-visible');
          }, index * 50);
        });
      }, 50);

    } catch (error) {
      console.error('Error loading more terms:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Removed the unused setSearchQuery function as the state is now updated by the URL effect
  // const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <style jsx global>{`
        .term-item {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }
        
        .term-item-visible {
          opacity: 1 !important;
          transform: translateY(0) scale(1) !important;
        }
      `}</style>

      {/* Hero section */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 text-center relative overflow-hidden rounded-xl border border-[#30364a]/30">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb] mb-4 pb-1">
              {t('hero.title')}
            </h1>
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-6">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {!session?.user && (
                <LocaleLink 
                  href="/profile" 
                  className="bg-[#10142a]/60 text-[#eaeaea] px-6 py-3 rounded-lg font-medium border border-[#58a6ff]/40 hover:border-[#58a6ff]/70 hover:bg-[#10142a]/80 transition-all"
                >
                  {t('actions.sign_in')}
                </LocaleLink>
              )}
            </div>
          </div>

          {/* Decorative Wave */}
          <svg
            className="absolute bottom-0 left-0 w-full text-[#0b0f23]"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* View controls (above the terms) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 text-center">
        <div className="text-xl text-[#58a6ff] font-semibold mb-4">
          {searchQuery ? t('search.search_results') : t('search.featured_terms')}
          {isSearching && <span className="text-sm text-gray-400 ml-2">{t('search.searching')}</span>}
        </div>
        {/* Term Language Display Controls */}
        <div>
          <div className="inline-flex items-center space-x-2">
            <span className="text-sm text-gray-400">{t('term_display.show_language')}:</span>
            <div className="inline-flex rounded-md shadow-sm bg-[#10142a]/60 border border-[#30364a]" role="group">
              <button
                type="button"
                onClick={() => setActiveLang('lv')}
                className={`px-3 py-1 text-sm font-medium rounded-l-md transition-colors ${
                  activeLang === 'lv'
                    ? 'bg-[#58a6ff] text-white z-10 ring-1 ring-[#58a6ff]'
                    : 'text-gray-300 hover:bg-[#1a2239]'
                }`}
              >
                {t('language.lv')}
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`px-3 py-1 text-sm font-medium border-x border-[#30364a] transition-colors ${
                  activeLang === 'en'
                    ? 'bg-[#58a6ff] text-white z-10 ring-1 ring-[#58a6ff]'
                    : 'text-gray-300 hover:bg-[#1a2239]'
                }`}
              >
                {t('language.en')}
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('both')}
                className={`px-3 py-1 text-sm font-medium rounded-r-md transition-colors ${
                  activeLang === 'both'
                    ? 'bg-[#58a6ff] text-white z-10 ring-1 ring-[#58a6ff]'
                    : 'text-gray-300 hover:bg-[#1a2239]'
                }`}
              >
                {t('language.both')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-12">
        {isSearching && terms.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#58a6ff] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">{t('search.loading_terms')}</p>
            </div>
          </div>
        ) : terms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.5 2.25m0 0v.75M18 10.5l-4.757-4.757a1.5 1.5 0 00-2.225.031l-.591.59" />
            </svg>
            <h3 className="text-xl text-[#58a6ff] mb-2">{t('search.no_results')}</h3>
            <p className="text-gray-400 max-w-md">
              {t('search.no_results_description')}
            </p>
          </div>
        ) : (
          <>
            {/* Grid/List layout for terms */}
            <div className="space-y-6">
              {terms.map((term, index) => (
                <div
                  key={term.id}
                  className={`term-item bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-500 hover:shadow-xl hover:border-[#58a6ff]/30 group`}
                  style={{ 
                    transitionDelay: `${Math.min(index * 50, 500)}ms`
                  }}
                >
                  <div className="p-6">
                    {/* Simplified rendering based on activeLang */}
                    {activeLang === 'both' ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {(activeLang === 'both' || activeLang === 'lv') && (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                                <HighlightedText text={getTermTranslation(term, 'lv').name} query={searchQuery} />
                              </h3>
                              <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">{t('language.lv')}</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                              <HighlightedText text={getTermTranslation(term, 'lv').description} query={searchQuery} />
                            </p>
                          </div>
                        )}

                        {(activeLang === 'both' || activeLang === 'en') && (
                          <div className={`space-y-3 ${activeLang === 'both' ? 'md:border-l md:border-[#30364a] md:pl-6' : ''}`}>
                            <div className="flex items-start justify-between">
                              <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                                <HighlightedText text={getTermTranslation(term, 'en').name} query={searchQuery} />
                              </h3>
                              <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">{t('language.en')}</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                              <HighlightedText text={getTermTranslation(term, 'en').description} query={searchQuery} />
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Single language view
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                            <HighlightedText text={getTermTranslation(term, activeLang === 'lv' ? 'lv' : 'en').name} query={searchQuery} />
                          </h3>
                          <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">
                            {t(`language.${activeLang === 'lv' ? 'lv' : 'en'}`)}
                          </span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                          <HighlightedText text={getTermTranslation(term, activeLang === 'lv' ? 'lv' : 'en').description} query={searchQuery} />
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions footer */}
                  <div className="bg-[#10142a]/40 border-t border-[#30364a] p-4 flex justify-between items-center relative">
                    <div className="flex items-center space-x-4">
                      {session?.user ? (
                        <button
                          onClick={() => toggleFavorite(term.id)}
                          className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-[#58a6ff] transition-colors"
                        >
                          {favoriteIds.has(term.id) ? (
                            <>
                              <HeartIconSolid className="h-5 w-5 text-red-500" />
                              <span className="hidden sm:inline">{t('term_view.favorited')}</span>
                            </>
                          ) : (
                            <>
                              <HeartIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
                              <span className="hidden sm:inline">{t('term_view.add_to_favorites')}</span>
                            </>
                          )}
                        </button>
                      ) : null}
                      
                      {/* Interactive Label Display from TermCard, adapted for HomePage */}
                      {(term.labels && term.labels.length > 0) && (() => {
                        const displayLabels: DisplayLabel[] = term.labels!.map(terminiLabel => {
                          const translation = terminiLabel.label.translations.find(t => t.language.code === locale);
                          return {
                            id: terminiLabel.label.id,
                            name: translation ? translation.name : terminiLabel.label.translations[0]?.name || 'Unnamed Label'
                          };
                        }).filter(Boolean) as DisplayLabel[];

                        if (displayLabels.length === 0) return null;

                        return (
                          <Popover className="relative">
                            {({ open }) => (
                              <>
                                <Popover.Button
                                  className={`inline-flex items-center text-xs px-2 py-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                                    open ? 'bg-[#3b4c7c] text-[#a2c3f7]' : 'bg-[#2c3a5f] text-[#7aa2f7] hover:bg-[#3b4c7c]'
                                  }`}
                                >
                                  <span className="mr-1">{t('term_display.labels')}</span>
                                  <TagIcon className="h-3 w-3" />
                                </Popover.Button>
                                <Transition
                                  as={Fragment}
                                  enter="transition ease-out duration-200"
                                  enterFrom="opacity-0 translate-y-1"
                                  enterTo="opacity-100 translate-y-0"
                                  leave="transition ease-in duration-150"
                                  leaveFrom="opacity-100 translate-y-0"
                                  leaveTo="opacity-0 translate-y-1"
                                >
                                  <Popover.Panel className="absolute z-20 bottom-full mb-2 w-max max-w-xs bg-[#1f2740] border border-[#30364a] rounded-md shadow-lg p-3 space-y-1">
                                    {displayLabels.map((label) => (
                                      <span
                                        key={label.id}
                                        className="block text-xs text-gray-200 bg-[#263354] px-2 py-1 rounded"
                                      >
                                        {label.name}
                                      </span>
                                    ))}
                                  </Popover.Panel>
                                </Transition>
                              </>
                            )}
                          </Popover>
                        );
                      })()}
                    </div>

                    <div className="absolute left-1/2 transform -translate-x-1/2">
                      <span className="text-xs bg-[#263354] text-[#64d8cb] px-2 py-1 rounded-full">
                        {getCategoryName(term, locale)}
                      </span>
                    </div>
                    
                    <LocaleLink
                      href={`/comments/${term.id}`}
                      className="flex items-center space-x-2 bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white px-3 py-1.5 rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                    >
                      <BookOpenIcon className="h-4 w-4" />
                      <span>{t('actions.view_details')}</span>
                    </LocaleLink>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show More button */}
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMoreTerms}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-[#1a2239] text-[#58a6ff] rounded-lg border border-[#30364a] hover:bg-[#263354] hover:border-[#58a6ff]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-[#58a6ff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('actions.loading')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      {t('actions.show_more')}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Recently added section (only on initial view, not search) */}
      {!searchQuery && !isSearching && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="bg-gradient-to-br from-[#1a2239] to-[#192036] rounded-xl overflow-hidden border border-[#30364a]/30 shadow-lg">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-[#58a6ff]">{t('navigation.recently_added')}</h2>
                <LocaleLink href="/recently_added" className="text-[#64d8cb] hover:text-[#4bd3c5] transition-colors text-sm">
                  {t('actions.view_all')}
                </LocaleLink>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {recentTerms.map((term) => (
                  <LocaleLink key={term.id} href={`/comments/${term.id}`}>
                    <div className="bg-[#10142a]/40 border border-[#30364a]/50 hover:border-[#58a6ff]/30 hover:bg-[#10142a]/60 rounded-lg p-4 transition-all">
                      <h3 className="font-medium text-[#eaeaea] mb-1 truncate">
                        {getTermTranslation(term, 'en').name}
                      </h3>
                      <p className="text-gray-400 text-sm truncate">
                        {getTermTranslation(term, 'lv').name}
                      </p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#30364a]/50">
                        <span className="text-xs bg-[#263354] text-[#64d8cb] px-2 py-0.5 rounded-full">{t('term_view.new')}</span>
                        {session?.user ? (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleFavorite(term.id);
                            }}
                            className="text-gray-400"
                          >
                            {favoriteIds.has(term.id) ? (
                              <HeartIconSolid className="h-4 w-4 text-red-500" />
                            ) : (
                              <HeartIcon className="h-4 w-4 hover:text-red-500" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </LocaleLink>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features/Stats section (only on initial view, not search) */}
      {!searchQuery && !isSearching && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1a2239] p-5 rounded-lg border border-[#30364a]/30 text-center">
              <div className="text-3xl font-bold text-[#58a6ff] mb-1">{t('stats.terms_count')}</div>
              <div className="text-gray-400 text-sm">{t('stats.terms_label')}</div>
            </div>
            <div className="bg-[#1a2239] p-5 rounded-lg border border-[#30364a]/30 text-center">
              <div className="text-3xl font-bold text-[#64d8cb] mb-1">{t('stats.languages_count')}</div>
              <div className="text-gray-400 text-sm">{t('stats.languages_label')}</div>
            </div>
            <div className="bg-[#1a2239] p-5 rounded-lg border border-[#30364a]/30 text-center">
              <div className="text-3xl font-bold text-[#58a6ff] mb-1">{t('stats.price')}</div>
              <div className="text-gray-400 text-sm">{t('stats.price_label')}</div>
            </div>
            <div className="bg-[#1a2239] p-5 rounded-lg border border-[#30364a]/30 text-center">
              <div className="text-3xl font-bold text-[#64d8cb] mb-1">{t('stats.updates')}</div>
              <div className="text-gray-400 text-sm">{t('stats.updates_label')}</div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
