'use client'

import { useState } from 'react'
import { addComment } from '../../actions/commentActions'
import { useTranslations } from 'next-intl'

export default function CommentForm({ termId}: { termId: number, locale: string }) {
  const t = useTranslations('comments')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setErrorMessage(null) // Clear previous errors

    try {
      setIsSubmitting(true)
      await addComment(termId, content)
      setContent('')
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'User account is disabled. Cannot add comment.') {
        setErrorMessage(t('disabled_account_error'))
      } else {
        setErrorMessage(t('generic_error'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-700 text-red-400 rounded-md">
          {errorMessage}
        </div>
      )}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('share_thoughts')}
          className="w-full p-4 rounded-lg bg-[#10142a] border border-[#30364a] text-[#eaeaea] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all min-h-[120px] resize-y"
          rows={4}
          maxLength={2000}
        />
        {content.length > 0 && (
          <div className="text-right mt-1 text-xs text-gray-400">
            {t('character_count', { count: content.length, max: 2000 })}
          </div>
        )}
      </div>
      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-5 py-2.5 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('submitting')}
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              {t('submit')}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
