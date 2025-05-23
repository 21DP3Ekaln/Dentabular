'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { searchTerms } from '@/app/actions/termActions';

type Term = {
  id: number;
  lv_name: string;
  lv_description: string;
  eng_name: string;
  eng_description: string;
  category: string;
  CreatedAt?: Date;
};

export default function TermsDisplay({ initialTerms }: { initialTerms: Term[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [terms, setTerms] = useState<Term[]>(initialTerms);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery) {
        setIsSearching(true);
        const results = await searchTerms(searchQuery);
        setTerms(results.terms);
        setIsSearching(false);
      } else {
        setTerms(initialTerms);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, initialTerms]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Header */}
      <header className="flex justify-between items-center bg-[#1a2239] h-16 px-4 shadow-md sticky top-0 z-50">
        <div className="font-bold text-xl text-[#58a6ff] hover:text-[#4393e6] transition-colors">
          Dental Terminology
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/termsdisplay" className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/categories" className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors">
                Categories
              </Link>
            </li>
            <li>
              <Link href="/favorites" className="text-[#eaeaea] hover:text-[#58a6ff] transition-colors">
                Favorites
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex items-center space-x-4">
          <div className="cursor-pointer text-[#eaeaea] hover:text-[#58a6ff] transition-colors">
            LV | EN
          </div>
          <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer text-[#eaeaea] font-bold hover:bg-gray-700 transition-colors">
            U
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative mt-4 p-8 bg-gradient-to-br from-[#0f152d] to-[#1a2239]
                   flex flex-col items-center text-center mx-4 rounded-lg shadow-lg overflow-hidden
                   animate-[heroGradient_15s_ease-in-out_infinite]"
      >
        <h1 className="text-3xl text-[#58a6ff] mb-2 drop-shadow-lg">
          All Dental Terms
        </h1>
        <p className="text-gray-300 max-w-xl mb-4">
          Browse our comprehensive list of dental terms and their definitions.
        </p>
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search terms in English or Latvian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl 
                       shadow-sm focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/50 
                       focus:border-[#58a6ff] transition-all duration-200 text-black"
          />
          {isSearching ? (
            <div className="mt-2 text-sm text-gray-400">Searching...</div>
          ) : (
            searchQuery && (
              <div className="mt-2 text-sm text-gray-400">
                Found {terms.length} term{terms.length !== 1 && 's'}
                {terms.length === 15 && " (showing first 15 results)"}
              </div>
            )
          )}
        </div>
      </section>

      {/* Main Content Area: Term Cards */}
      <main className="flex flex-wrap justify-center mx-4 mt-8 flex-grow">
        {terms.map((term) => (
          <div
            key={term.id}
            className="bg-[#1a2239] rounded-lg shadow-lg m-4 p-6 transition transform hover:-translate-y-1 hover:shadow-xl max-w-xs"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h2 className="font-bold text-xl text-[#58a6ff]">{term.lv_name}</h2>
                <p className="text-gray-300 leading-relaxed">
                  {term.lv_description}
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="font-bold text-xl text-[#58a6ff]">{term.eng_name}</h2>
                <p className="text-gray-300 leading-relaxed">
                  {term.eng_description}
                </p>
              </div>
            </div>
          </div>
        ))}
        {terms.length === 0 && !isSearching && (
          <div className="w-full text-center py-10">
            <p className="text-lg text-gray-400">No terms found</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a2239] p-4 text-center text-gray-500 shadow-md">
        <p>© 2023 Dental Terminology. All Rights Reserved.</p>
      </footer>
    </div>
  );
}


