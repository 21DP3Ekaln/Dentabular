import Link from 'next/link';
import { CalendarIcon, TagIcon } from '@heroicons/react/24/outline';
import ClientFavoriteButton from './ClientFavoriteButton';
import { Popover, Transition } from '@headlessui/react';
import { Fragment } from 'react';

type DisplayLabel = {
  id: number;
  name: string;
};

type Term = {
  id: number;
  lv_name: string;
  lv_description: string;
  eng_name: string;
  eng_description: string;
  CreatedAt?: string;
  category?: {
    name: string;
  };
  labels?: DisplayLabel[];
};

interface TermCardProps {
  term: Term;
  showCategory?: boolean;
}

export default function TermCard({ term, showCategory = false }: TermCardProps) {
  return (
    <div className="bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#58a6ff]/30 h-full">
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <Link href={`/comments/${term.id}`}>
                <h3 className="text-xl font-semibold text-[#58a6ff] hover:text-[#64d8cb] transition-colors">
                  {term.lv_name}
                </h3>
              </Link>
              <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">LV</span>
            </div>
            <p className="text-gray-300 line-clamp-3">{term.lv_description}</p>
          </div>
          
          <div className="space-y-3 md:border-l md:border-[#30364a] md:pl-6">
            <div className="flex items-start justify-between">
              <Link href={`/comments/${term.id}`}>
                <h3 className="text-xl font-semibold text-[#58a6ff] hover:text-[#64d8cb] transition-colors">
                  {term.eng_name}
                </h3>
              </Link>
              <span className="bg-[#263354] text-xs text-[#64d8cb] px-2 py-0.5 rounded-full">EN</span>
            </div>
            <p className="text-gray-300 line-clamp-3">{term.eng_description}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-[#10142a]/40 border-t border-[#30364a] p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {showCategory && term.category && (
            <span className="inline-flex items-center bg-[#263354] text-[#64d8cb] text-xs px-2 py-0.5 rounded-full">
              {term.category.name}
            </span>
          )}
          {term.CreatedAt && (
            <div className="flex items-center text-sm text-gray-400">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {new Date(term.CreatedAt).toLocaleDateString()}
            </div>
          )}
          {/* Interactive Label Display */}
          {term.labels && term.labels.length > 0 && (
            <Popover className="relative ml-2">
              {({ open }) => (
                <>
                  <Popover.Button
                    className={`inline-flex items-center text-xs px-2 py-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 ${
                      open ? 'bg-[#3b4c7c] text-[#a2c3f7]' : 'bg-[#2c3a5f] text-[#7aa2f7] hover:bg-[#3b4c7c]'
                    }`}
                  >
                    <span className="mr-1">Labels</span>
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
                    <Popover.Panel className="absolute z-10 bottom-full mb-2 w-max max-w-xs bg-[#1f2740] border border-[#30364a] rounded-md shadow-lg p-3 space-y-1">
                      {term.labels?.map((label) => (
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
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <ClientFavoriteButton termId={term.id} />
          <Link
            href={`/comments/${term.id}`}
            className="bg-[#58a6ff] text-white px-3 py-1 rounded-lg hover:bg-[#4393e6] transform hover:scale-105 transition-all"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
