'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl'; // Added import
import { toggleCommentClosed } from '@/app/actions/commentActions';
import { CheckCircleIcon, LockOpenIcon } from '@heroicons/react/24/outline';

interface ToggleCommentStatusButtonProps {
  commentId: number
  isClosed: boolean
  onToggle?: (commentId: number, newStatus: boolean) => void
}

export default function ToggleCommentStatusButton({ 
  commentId, 
  isClosed,
  onToggle,
}: ToggleCommentStatusButtonProps) {
  const t = useTranslations('admin.comments.toggleButton'); // Added useTranslations
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(isClosed);

  const handleToggle = async () => {
    try {
      setIsUpdating(true)
      await toggleCommentClosed(commentId)
      const newStatus = !currentStatus
      setCurrentStatus(newStatus)
      
      // Call onToggle callback if provided
      if (onToggle) {
        onToggle(commentId, newStatus)
      }
    } catch (error) {
      console.error('Failed to toggle comment status:', error);
      // Consider using a more user-friendly notification system instead of alert
      alert(t('errorAlert')); // Added translation
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
        currentStatus 
          ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
          : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/30'
      }`}
      title={currentStatus ? t('titleReopen') : t('titleResolve')} // Added translation
    >
      {isUpdating ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('updating')}</span> {/* Added translation */}
        </>
      ) : currentStatus ? (
        <>
          <LockOpenIcon className="h-4 w-4" />
          <span>{t('reopen')}</span> {/* Added translation */}
        </>
      ) : (
        <>
          <CheckCircleIcon className="h-4 w-4" />
          <span>{t('resolve')}</span> {/* Added translation */}
        </>
      )}
    </button>
  )
}
