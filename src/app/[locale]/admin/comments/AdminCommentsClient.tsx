'use client';

import { useState } from 'react';
import LocaleLink from '@/app/components/LocaleLink'; // Changed Link to LocaleLink
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'; // Added useParams
import { useTranslations } from 'next-intl'; // Added import
import { CommentWithDetails } from './page';
import ToggleCommentStatusButton from '@/app/components/admin/ToggleCommentStatusButton';
import AdminResponseButton from '@/app/components/comments/AdminResponseButton'
import {
  ChatBubbleLeftRightIcon,
  FunnelIcon,
  CheckIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

interface AdminCommentsClientProps {
  initialComments: CommentWithDetails[]
  currentFilter: string
}

export default function AdminCommentsClient({
  initialComments,
  currentFilter
}: AdminCommentsClientProps) {
  const t = useTranslations('admin.comments'); // Added useTranslations hook
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams() ?? new URLSearchParams(); // Handle null case
  const params = useParams(); // Get route params
  // Handle potential null for params and ensure locale is a string
  const locale = typeof params?.locale === 'string' ? params.locale : 'en'; 
  
  // Store all comments for client-side filtering
  const [allComments, setAllComments] = useState<CommentWithDetails[]>(initialComments)
  
  // State for the displayed/filtered comments and filter selection
  const [displayedComments, setDisplayedComments] = useState<CommentWithDetails[]>(initialComments)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>(
    currentFilter === 'open' || currentFilter === 'closed' ? currentFilter : 'all'
  )
  
  // Apply filter to all comments without server request
  const applyFilter = (filterType: 'all' | 'open' | 'closed', comments: CommentWithDetails[]) => {
    if (filterType === 'all') {
      return comments;
    } else if (filterType === 'open') {
      return comments.filter(comment => !comment.isClosed);
    } else { // 'closed'
      return comments.filter(comment => comment.isClosed);
    }
  };

  // Handle filter change - filter client-side for instant response
  const handleFilterChange = (newFilter: 'all' | 'open' | 'closed') => {
    if (newFilter === filter) return;
    
    // Create new search params for URL
    const params = new URLSearchParams(searchParams.toString())
    if (newFilter === 'all') {
      params.delete('status')
    } else {
      params.set('status', newFilter)
    }
    
    // Update URL without reload
    router.push(`${pathname}?${params.toString()}`)
    
    // Update filter state and apply filtering immediately
    setFilter(newFilter)
    setDisplayedComments(applyFilter(newFilter, allComments))
  };

  // Handle comment status toggle
  const handleStatusToggle = (commentId: number, newStatus: boolean) => {
    // Update the comment in the allComments collection
    const updatedAllComments = allComments.map(c => 
      c.id === commentId 
        ? {...c, isClosed: newStatus} 
        : c
    );
    setAllComments(updatedAllComments);
    
    // Update displayed comments based on current filter
    setDisplayedComments(applyFilter(filter, updatedAllComments));
  };

  // Get term name for display
  const getTermName = (comment: CommentWithDetails) => {
    if (!comment.term?.activeVersion?.translations) {
      return t('unknownTerm'); // Added translation
    }
    
    // Try to get English name first, then Latvian, then any available
    const engTranslation = comment.term.activeVersion.translations.find(
      t => t.language?.code === 'en'
    )
    
    const lvTranslation = comment.term.activeVersion.translations.find(
      t => t.language?.code === 'lv',
    );
    
    return engTranslation?.name || lvTranslation?.name || comment.term.activeVersion.translations[0]?.name || t('unnamedTerm'); // Added translation
  };

  return (
    <div>
      {/* Filters */}
      {/* Filters */}
      <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-[#58a6ff]" />
          <h2 className="text-lg font-medium text-white">{t('filters.title')}</h2> {/* Added translation */}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
              filter === 'all'
                ? 'bg-[#58a6ff] text-white'
                : 'bg-[#10142a]/60 text-gray-300 hover:bg-[#10142a] hover:text-white'
            }`}
          >
            <ArrowsRightLeftIcon className="h-4 w-4" />
            {t('filters.all')} {/* Added translation */}
          </button>
          <button
            onClick={() => handleFilterChange('open')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
              filter === 'open'
                ? 'bg-amber-500 text-white'
                : 'bg-[#10142a]/60 text-gray-300 hover:bg-[#10142a] hover:text-white'
            }`}
          >
            <ClockIcon className="h-4 w-4" />
            {t('filters.open')} {/* Added translation */}
          </button>
          <button
            onClick={() => handleFilterChange('closed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
              filter === 'closed'
                ? 'bg-green-500 text-white'
                : 'bg-[#10142a]/60 text-gray-300 hover:bg-[#10142a] hover:text-white'
            }`}
          >
            <CheckIcon className="h-4 w-4" />
            {t('filters.resolved')} {/* Added translation */}
          </button>
        </div>
      </div>
      
      {/* Comments List */}
      {displayedComments?.length > 0 && (
        <div className="space-y-6">
          {displayedComments.map((comment: CommentWithDetails) => (
            <div 
              key={comment.id}
              className={`bg-[#1a2239] rounded-xl border ${
                comment.isClosed
                  ? 'border-green-500/30'
                  : 'border-amber-500/30'
              } shadow-lg overflow-hidden`}
            >
              <div className={`border-b border-[#30364a] px-6 py-4 ${
                comment.isClosed
                  ? 'bg-gradient-to-r from-green-900/10 to-[#1a2239]'
                  : 'bg-gradient-to-r from-amber-900/10 to-[#1a2239]'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#58a6ff]" />
                    <h3 className="font-medium text-white">{getTermName(comment)}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      comment.isClosed
                        ? 'bg-green-900/20 text-green-400'
                        : 'bg-amber-900/20 text-amber-400'
                    }`}>
                      {comment.isClosed ? t('status.resolved') : t('status.open')} {/* Added translation */}
                    </span>
                  </div>
                  <LocaleLink // Changed Link to LocaleLink
                    href={`/comments/${comment.termId}`} 
                    className="text-[#58a6ff] hover:text-[#4393e6] text-sm underline"
                    target="_blank"
                  >
                    {t('viewTermLink')} {/* Added translation */}
                  </LocaleLink>
                </div>
              </div>
              
              <div className="p-6">
                {/* Original Comment */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] font-bold flex-shrink-0">
                    {comment.user.fullName ? comment.user.fullName.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="font-medium text-[#eaeaea]">
                          {comment.user.fullName}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-gray-300 whitespace-pre-wrap">{comment.content}</div>
                  </div>
                </div>
                
                {/* Admin Responses */}
                {comment.responses && comment.responses.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#30364a]">
                    <div className="text-sm text-gray-400 mb-4">{t('adminResponsesTitle')}</div> {/* Added translation */}
                    {comment.responses.map((response) => (
                      <div key={response.id} className="mt-4 ml-8 p-5 bg-[#2a3349] rounded-xl border-l-3 border-[#58a6ff]">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#58a6ff] flex items-center justify-center text-white font-bold flex-shrink-0">
                            {response.user.fullName ? response.user.fullName.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center">
                              <div className="font-semibold text-[#eaeaea] flex items-center gap-2">
                                {response.user.fullName || t('adminFallbackName')} {/* Added translation */}
                                <span className="text-xs bg-[#58a6ff] text-white px-2 py-0.5 rounded-full">{t('adminRoleBadge')}</span> {/* Added translation */}
                              </div>
                              <div className="text-gray-500 text-xs ml-2">
                                {new Date(response.createdAt).toLocaleDateString()} • {new Date(response.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="mt-2 text-gray-200 whitespace-pre-wrap">{response.content}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                  <ToggleCommentStatusButton
                    commentId={comment.id}
                    isClosed={comment.isClosed}
                    onToggle={handleStatusToggle}
                  />
                  
                  {!comment.isClosed && comment.responses.length === 0 && (
                    <AdminResponseButton 
                      commentId={comment.id} 
                      termId={comment.termId}
                      locale={locale} // Pass locale prop
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {(!displayedComments || displayedComments.length === 0) && (
        <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a3349] flex items-center justify-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">{t('emptyState.title')}</h2> {/* Added translation */}
          <p className="text-gray-400 mb-6">
            {filter === 'all' 
              ? t('emptyState.all') 
              : filter === 'open' 
                ? t('emptyState.open')
                : t('emptyState.resolved')} {/* Added translation */}
          </p>
          
          {filter !== 'all' && (
            <button
              onClick={() => handleFilterChange('all')}
              className="px-4 py-2 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] transition-all"
            >
              {t('emptyState.viewAllButton')} {/* Added translation */}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
