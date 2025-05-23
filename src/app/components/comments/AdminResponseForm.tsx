'use client'

import { useState } from 'react'
import { addAdminResponse } from '../../actions/commentActions'
import { useTranslations } from 'next-intl'

export default function AdminResponseForm({
  commentId,
  termId,
  // locale, // Removed unused prop
  onCancel,
}: {
  commentId: number;
  termId: number;
  // locale: string; // Removed unused prop type
  onCancel: () => void;
}) {
  const t = useTranslations('comments');
  const tAdmin = useTranslations('admin.comments'); // Added admin comments translations
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    try {
      setIsSubmitting(true)
      await addAdminResponse(commentId, content, termId)
      setContent('')
      onCancel()
    } catch (error) {
      console.error('Failed to add admin response:', error)
      alert(t('notifications.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 pl-8 border-l-3 border-[#58a6ff] py-2">
      <div className="bg-[#2a3349] p-5 rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#58a6ff] flex items-center justify-center text-white font-bold">
            A {/* Placeholder initial, could be dynamic if admin user info was available */}
          </div>
          <div className="font-semibold text-[#eaeaea] flex items-center gap-2">
            {tAdmin('adminFallbackName')} {/* Use translation */}
            <span className="text-xs bg-[#58a6ff] text-white px-2 py-0.5 rounded-full">{tAdmin('adminRoleBadge')}</span> {/* Use translation */}
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('your_response')}
          className="w-full p-4 rounded-lg bg-[#10142a] border border-[#58a6ff] text-[#eaeaea] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 transition-all resize-y"
          rows={3}
          maxLength={2000}
        />
        {content.length > 0 && (
          <div className="text-right mt-1 text-xs text-gray-400">
            {t('character_count', { count: content.length, max: 2000 })}
          </div>
        )}
        <div className="flex gap-2 mt-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#1a2239] text-gray-300 rounded-lg hover:bg-[#232c45] transition-all"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="px-4 py-2 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('submitting')}
              </>
            ) : (
              t('submit')
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
