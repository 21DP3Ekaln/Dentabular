'use client';

import LocaleLink from '@/app/components/LocaleLink';
import { getAllCategories } from '@/app/actions/termActions';
import { 
  TagIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useMemo } from 'react';
import { Category } from '@/types/i18n';
import { getCategoryNameFromCategory } from '@/lib/i18n-utils';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid'; // Import XMarkIcon

export default function CategoriesPage() {
  const t = useTranslations();
  
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
                {t('categories.title')}
              </h1>
            </div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              {t('categories.description')}
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

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-12">
        <CategoriesContent />
      </main>

    </div>
  );
}

// Helper function to highlight matching text
function HighlightMatch({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <strong key={index} className="bg-[#58a6ff]/20 text-[#64d8cb] font-semibold">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </span>
  );
}


// Client-side component for data fetching and search
function CategoriesContent() {
  const t = useTranslations();
  const locale = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    // Cleanup function to clear the timeout if searchTerm changes
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getAllCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    // Use debouncedSearchTerm for filtering
    if (!debouncedSearchTerm) {
      return categories;
    }
    return categories.filter(category => {
      const categoryName = getCategoryNameFromCategory(category, locale);
      return categoryName.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [categories, debouncedSearchTerm, locale]); // Depend on debouncedSearchTerm

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#58a6ff]"></div>
      </div>
    );
  }
  return (
    <div>
      {/* Search Input */}
      <div className="mb-8 relative">
        <input
          type="text"
          placeholder={t('categories.search_placeholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full px-4 py-3 pl-12 pr-10 rounded-lg bg-[#1a2239] border border-[#30364a]/50 focus:border-[#58a6ff]/70 focus:ring-1 focus:ring-[#58a6ff]/50 outline-none transition-colors text-[#eaeaea] placeholder-gray-500" // Added pr-10 for clear button space
         />
         <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
         {/* Add Clear Button */}
         {searchTerm && (
           <button
             onClick={() => setSearchTerm('')}
             className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
             aria-label={t('search.clear_search')} // Assuming 'search.clear_search' exists in translations
           >
             <XMarkIcon className="h-5 w-5" />
           </button>
         )}
       </div>

      {/* Categories Grid */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => {
            const categoryName = getCategoryNameFromCategory(category, locale);
            return (
              <LocaleLink
                key={category.id}
                href={`/categories/${encodeURIComponent(categoryName)}`}
                className="group"
              >
                <div
                  className="bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-500 hover:shadow-xl hover:border-[#58a6ff]/30 h-full hover:transform hover:scale-[1.01]"
                  style={{
                    transitionDelay: `${Math.min(category.id * 30, 300)}ms`
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-center mb-5">
                      <div className="bg-[#263354] p-3 rounded-lg mr-4 border border-[#30364a]/50 group-hover:border-[#58a6ff]/50 group-hover:bg-[#263354]/80 transition-all">
                        <BookmarkIcon className="h-6 w-6 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                      </div>
                      <h2 className="text-xl font-semibold text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors">
                        <HighlightMatch text={categoryName} highlight={debouncedSearchTerm} />
                      </h2>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#30364a]/30">
                      <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">{t('categories.browse_terms')}</span>
                      <div className="bg-[#10142a]/60 p-2 rounded-full group-hover:bg-[#58a6ff]/20 transition-all group-hover:transform group-hover:translate-x-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#58a6ff]">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </LocaleLink>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">
          {/* Use debouncedSearchTerm in the no results message as well */}
          {t('categories.no_results', { searchTerm: debouncedSearchTerm })}
        </div>
      )}
    </div>
  );
}
