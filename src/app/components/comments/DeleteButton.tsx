'use client'

import { useState } from 'react'
import { deleteComment } from '../../actions/commentActions'
import { useTranslations } from 'next-intl'

export default function DeleteButton({
  commentId,
  termId,
}: {
  commentId: number
  termId: number
  locale: string
}) {
  const t = useTranslations('comments')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(t('confirmation.delete'))) return

    try {
      setIsDeleting(true)
      await deleteComment(commentId, termId)
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert(t('notifications.error'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center gap-1 text-gray-400 hover:text-red-400 disabled:opacity-50 text-sm transition-colors group"
      title={t('delete')}
    >
      {isDeleting ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('submitting')}</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">{t('delete')}</span>
        </>
      )}
    </button>
  )
}
