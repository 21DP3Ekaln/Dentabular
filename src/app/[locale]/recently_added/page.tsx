'use client';

import { useState, useEffect } from 'react';
import { getRecentTerms } from '@/app/actions/termActions';
import LocaleLink from '@/app/components/LocaleLink';
import { 
  CalendarIcon, 
  ClockIcon, 
  BookOpenIcon
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import { Term } from '@/types/i18n';
import { getTermTranslation, getCategoryName } from '@/lib/i18n-utils';

// Client-side components 
import ClientFavoriteButton from '@/app/components/ClientFavoriteButton';

export default function RecentlyAddedPage() {
  const t = useTranslations();
  const locale = useLocale();
  
  const [terms, setTerms] = useState<Term[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load initial terms
  useEffect(() => {
    const loadInitialTerms = async () => {
      setIsLoading(true);
      const result = await getRecentTerms();
      setTerms(result.terms);
      setHasMore(result.hasMore);
      setIsLoading(false);
    };
    
    loadInitialTerms();
  }, []);

  // Animate terms when they load
  useEffect(() => {
    if (!isLoading && terms.length > 0) {
      const allItems = document.querySelectorAll('.term-item');
      allItems.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add('term-item-visible');
        }, index * 50);
      });
    }
  }, [isLoading, terms.length]);

  // Load more terms
  const loadMoreTerms = async () => {
    if (isLoadingMore || !hasMore) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const skip = nextPage * 15;
      
      const result = await getRecentTerms(skip);
      
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

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Enhanced Hero Section */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 text-center relative overflow-hidden rounded-xl border border-[#30364a]/30">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <ClockIcon className="h-8 w-8 text-[#58a6ff] mr-3" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb]">
                {t('navigation.recently_added')}
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-2">
              {t('recently_added.description')}
            </p>
            <p className="text-[#64d8cb] text-sm">
              {t('recently_added.last_updated')}: {new Date().toLocaleDateString(locale === 'lv' ? 'lv-LV' : 'en-US')}
            </p>
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

      {/* Filter Controls */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-4">
        <div className="bg-[#1a2239]/50 rounded-lg border border-[#30364a]/40 p-4">
          <div className="flex items-center text-gray-300 text-sm">
            <CalendarIcon className="h-5 w-5 mr-2 text-[#58a6ff]" />
            <span>{t('recently_added.showing_terms', { count: terms.length })}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#58a6ff] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">{t('search.loading_terms')}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {terms.map((term: Term) => {
                const lvTranslation = getTermTranslation(term, 'lv');
                const enTranslation = getTermTranslation(term, 'en');
                return (
                  <div 
                    key={term.id}
                    className="term-item bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-500 hover:shadow-xl hover:border-[#58a6ff]/30 group"
                  >
                    <div className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                            {lvTranslation.name}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">{t('language.lv')}</span>
                          </div>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                          {lvTranslation.description}
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-[#30364a]/30">
                          <div className="flex items-start justify-between">
                            <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                              {enTranslation.name}
                            </h3>
                            <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">{t('language.en')}</span>
                          </div>
                          <p className="text-gray-300 leading-relaxed mt-2">
                            {enTranslation.description}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions footer */}
                    <div className="bg-[#10142a]/40 border-t border-[#30364a] p-4 flex justify-between items-center relative">
                      <div className="flex items-center space-x-4">
                        <span className="inline-flex items-center bg-[#58a6ff]/20 text-[#58a6ff] text-xs px-2 py-0.5 rounded-full">
                          <span className="animate-pulse mr-1">●</span> {t('term_view.new')}
                        </span>
                        <div className="flex items-center text-sm text-gray-400">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(term.createdAt).toLocaleDateString(locale === 'lv' ? 'lv-LV' : 'en-US')}
                        </div>
                        <ClientFavoriteButton termId={term.id} />
                      </div>

                      <div className="absolute left-1/2 transform -translate-x-1/2">
                        <span className="text-xs bg-[#263354] text-[#64d8cb] px-2 py-1 rounded-full">
                          {getCategoryName(term, locale)}
                        </span>
                      </div>
                      
                      <LocaleLink
                        href={`/term/${term.identifier}`}
                        className="flex items-center space-x-2 bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white px-3 py-1.5 rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                      >
                        <BookOpenIcon className="h-4 w-4" />
                        <span>{t('actions.view_details')}</span>
                      </LocaleLink>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {terms.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl text-[#58a6ff] mb-2">{t('recently_added.no_terms_title')}</h3>
                <p className="text-gray-400 max-w-md">
                  {t('recently_added.no_terms_description')}
                </p>
              </div>
            )}
            
            {/* Show More button */}
            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMoreTerms}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-[#1a2239] text-[#58a6ff] rounded-lg border border-[#30364a] hover:bg-[#263354] hover:border-[#58a6ff]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
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
    </div>
  );
}
