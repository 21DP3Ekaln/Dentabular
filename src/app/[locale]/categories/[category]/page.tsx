'use client';

import { useState, useEffect, use, Fragment } from 'react'; // Added Fragment
import { searchTermsInCategory } from '../../../actions/categoryActions'; // Changed import
import LocaleLink from '@/app/components/LocaleLink';
import { 
  TagIcon,
  BookmarkIcon,
  BookOpenIcon,
  MagnifyingGlassIcon, // Added
  ArrowPathIcon, // Added
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid'; // Added
import ClientFavoriteButton from '../../../components/ClientFavoriteButton';
import { useTranslations, useLocale } from 'next-intl';
import { Term } from '@/types/i18n'; // Assuming Term type is defined correctly elsewhere or here
import { getTermTranslation, getCategoryName } from '@/lib/i18n-utils';

// Helper function to highlight search query (copied from homepage)
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

// Define the type for params
type CategoryParams = {
  category: string;
};

export default function CategoryPage({ params }: { params: Promise<CategoryParams> }) {
  // Get translations
  const t = useTranslations();
  const locale = useLocale();
  
  // Use the `use` hook to unwrap the params
  const unwrappedParams = use(params);
  const decodedCategory = decodeURIComponent(unwrappedParams.category);
  const [terms, setTerms] = useState<Term[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // Added
  const [isSearching, setIsSearching] = useState(false); // Added
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Keep for initial load indication
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeLang, setActiveLang] = useState('both'); // 'lv', 'en', or 'both' - Added

  // Load initial terms or perform search
  useEffect(() => {
    const loadOrSearchTerms = async () => {
      setIsLoading(true); // Indicate loading starts
      setIsSearching(true); // Indicate searching process starts
      setCurrentPage(0); // Reset page on new search/load
      const result = await searchTermsInCategory(decodedCategory, searchQuery, 0);
      setTerms(result.terms);
      setHasMore(result.hasMore);
      setIsLoading(false); // Indicate loading finished
      setIsSearching(false); // Indicate searching finished
    };

    // Debounce search
    const delayDebounce = setTimeout(() => {
      loadOrSearchTerms();
    }, 300); // 300ms delay

    return () => clearTimeout(delayDebounce); // Cleanup timeout on change/unmount
  }, [decodedCategory, searchQuery]); // Rerun when category or query changes

  // Animate terms when they load or search results change
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
      
      // Use search action for loading more as well
      const result = await searchTermsInCategory(decodedCategory, searchQuery, skip); 
      
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
      {/* Hero Section */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 text-center relative overflow-hidden rounded-xl border border-[#30364a]/30">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <TagIcon className="h-8 w-8 text-[#58a6ff] mr-3" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb]">
                {decodedCategory}
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              {t('CategoryPage.description', { category: decodedCategory })}
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

      {/* Search and Filter Controls */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-4">
        <div className="bg-[#1a2239]/50 rounded-lg border border-[#30364a]/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
            <input
              type="text"
              placeholder={t('search.search_placeholder_category', { category: decodedCategory })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 md:w-80 bg-[#10142a]/80 border border-[#30364a] rounded-full pl-10 pr-10 py-2 text-[#eaeaea] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            {searchQuery && !isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={t('search.clear_search')}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
            {isSearching && (
              <ArrowPathIcon className="animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            )}
          </div>

          {/* Term Language Display Controls */}
          <div className="flex-shrink-0"> {/* Added flex-shrink-0 */}
            <div className="inline-flex items-center space-x-2">
              <span className="text-sm text-gray-400 hidden sm:inline">{t('term_display.show_language')}:</span> {/* Added hidden sm:inline */}
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
          
          {/* Showing Terms Info */}
          <div className="flex items-center text-gray-300 text-sm flex-shrink-0 mt-2 sm:mt-0"> {/* Added mt-2 sm:mt-0 */}
            <BookmarkIcon className="h-5 w-5 mr-2 text-[#58a6ff]" />
            <span>
              {searchQuery 
                ? t('CategoryPage.showingResults', { count: terms.length, query: searchQuery, category: decodedCategory })
                : t('CategoryPage.showingTerms', { count: terms.length, category: decodedCategory })
              }
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        {/* Combined Loading/Searching State */}
        {isLoading ? ( // Show initial loading spinner
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#58a6ff] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-400">{t('search.loading_terms')}</p>
            </div>
          </div>
        ) : terms.length === 0 ? ( // Show no results message if not loading and terms are empty
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MagnifyingGlassIcon className="h-16 w-16 text-gray-600 mb-4" /> {/* Changed Icon */}
            <h3 className="text-xl font-medium text-gray-400 mb-2">
              {searchQuery ? t('search.no_results') : t('CategoryPage.noTermsTitle')}
            </h3>
            <p className="text-gray-500 max-w-md">
              {searchQuery 
                ? t('search.no_results_description_category', { query: searchQuery, category: decodedCategory }) 
                : t('CategoryPage.noTermsDescription', { category: decodedCategory })
              }
            </p>
            <LocaleLink 
              href="/categories"
              className="mt-6 inline-flex items-center px-4 py-2 bg-[#263354] text-[#58a6ff] rounded-lg hover:bg-[#1a2239] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
              {t('CategoryPage.backToCategories')}
            </LocaleLink>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {terms.map((term) => {
                const lvTranslation = getTermTranslation(term, 'lv');
                const enTranslation = getTermTranslation(term, 'en');
                return (
                  <div 
                    key={term.id} 
                    className="term-item bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-500 hover:shadow-xl hover:border-[#58a6ff]/30 group"
                  >
                    <div className="p-6">
                      {/* Conditional Rendering based on activeLang */}
                      {activeLang === 'both' ? (
                        // Show both languages side-by-side (or stacked on smaller screens if needed)
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                                <HighlightedText text={lvTranslation.name} query={searchQuery} />
                              </h3>
                              <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">{t('language.lv')}</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                              <HighlightedText text={lvTranslation.description} query={searchQuery} />
                            </p>
                          </div>
                          <div className="space-y-3 md:border-l md:border-[#30364a] md:pl-6">
                            <div className="flex items-start justify-between">
                              <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                                <HighlightedText text={enTranslation.name} query={searchQuery} />
                              </h3>
                              <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">{t('language.en')}</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed">
                              <HighlightedText text={enTranslation.description} query={searchQuery} />
                            </p>
                          </div>
                        </div>
                      ) : (
                        // Show only the selected language
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h3 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                              <HighlightedText text={activeLang === 'lv' ? lvTranslation.name : enTranslation.name} query={searchQuery} />
                            </h3>
                            <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">
                              {t(`language.${activeLang}`)}
                            </span>
                          </div>
                          <p className="text-gray-300 leading-relaxed">
                            <HighlightedText text={activeLang === 'lv' ? lvTranslation.description : enTranslation.description} query={searchQuery} />
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions footer */}
                    <div className="bg-[#10142a]/40 border-t border-[#30364a] p-4 flex justify-between items-center relative">
                      <div className="flex items-center space-x-4">
                        <ClientFavoriteButton termId={term.id} />
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
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={loadMoreTerms}
                  disabled={isLoadingMore}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#1a2239] to-[#263354] text-[#58a6ff] rounded-lg border border-[#30364a] hover:from-[#263354] hover:to-[#1a2239] transition-all shadow-lg disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#58a6ff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('actions.loading')}
                    </span>
                  ) : (
                    t('CategoryPage.loadMore')
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
