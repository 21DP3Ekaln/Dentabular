'use client'

import { useState } from 'react'
import { toggleCommentClosed } from '@/app/actions/commentActions'
import { useTranslations } from 'next-intl'

interface ToggleCommentStatusButtonRegularProps {
  commentId: number
  isClosed: boolean
  locale?: string
}

export default function ToggleCommentStatusButtonRegular({
  commentId,
  isClosed,
}: ToggleCommentStatusButtonRegularProps) {
  const t = useTranslations('comments')
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(isClosed)

  const handleToggle = async () => {
    try {
      setIsUpdating(true)
      await toggleCommentClosed(commentId)
      setCurrentStatus(!currentStatus)
    } catch (error) {
      console.error('Failed to toggle comment status:', error)
      alert(t('notifications.error'))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
        currentStatus
          ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
          : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/30'
      }`}
    >
      {isUpdating ? (
        <>
          <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('submitting')}</span>
        </>
      ) : currentStatus ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          {t('mark_open')}
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t('mark_resolved')}
        </>
      )}
    </button>
  )
}