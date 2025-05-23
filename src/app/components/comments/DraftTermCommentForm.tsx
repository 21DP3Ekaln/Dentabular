'use client'

import { useState } from 'react'
import { addComment } from '../../actions/commentActions'
import { useTranslations } from 'next-intl'; // Import useTranslations

export default function DraftTermCommentForm({
  termId,
  onCommentAdded
}: {
  termId: number;
  onCommentAdded?: (content: string) => Promise<void>;
}) {
  // Correct the namespace to match JSON structure
  const t = useTranslations('admin.pending_terms.comments');
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      setIsSubmitting(true)
      if (onCommentAdded) {
        await onCommentAdded(content)
        setContent('')
      } else {
        // Fallback if onCommentAdded is not provided (though it should be in this context)
        await addComment(termId, content)
        setContent('')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      // Optionally: Add user-facing error handling here
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          // Use translation key for placeholder
          placeholder={t('placeholder')}
          className="w-full p-4 rounded-lg bg-[#10142a] border border-[#30364a] text-[#eaeaea] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all min-h-[100px] resize-y"
          rows={3}
          maxLength={2000}
        />
        {content.length > 0 && (
          <div className="text-right mt-1 text-xs text-gray-400">
            {content.length}/2000 characters
          </div>
        )}
      </div>
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium text-sm"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {/* Use translation key */}
              {t('submittingButton')}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              {/* Use translation key */}
              {t('submitButton')}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
