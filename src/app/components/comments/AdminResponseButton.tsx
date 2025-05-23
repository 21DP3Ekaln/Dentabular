'use client'

import { useState } from 'react'
import AdminResponseForm from './AdminResponseForm'
import { useTranslations } from 'next-intl'

export default function AdminResponseButton({
  commentId,
  termId,
  locale
}: {
  commentId: number
  termId: number
  locale: string
}) {
  const t = useTranslations('comments')
  const [showForm, setShowForm] = useState(false)

  if (showForm) {
    return (
      <AdminResponseForm
        commentId={commentId}
        termId={termId}
        locale={locale}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="px-4 py-2 bg-[#2a3349] text-[#58a6ff] rounded-lg hover:bg-[#343e5a] transition-all flex items-center gap-2 text-sm font-medium"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
      </svg>
      {t('respond')}
    </button>
  )
}
