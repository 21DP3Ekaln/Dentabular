'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TagIcon,
  BookmarkIcon,
  ClockIcon,
  LanguageIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { approveTermDraft, rejectTermDraft } from '@/app/actions/adminActions'
import DraftTermComments from '@/app/components/comments/DraftTermComments'
import { useTranslations, useLocale } from 'next-intl' // Import useLocale

type TermTranslation = {
  id: number
  name: string
  description: string
  languageId: number
  language: {
    id: number
    code: string
    name: string
  }
}

type TermVersion = {
  id: number
  termId: number
  status: string
  versionNumber: number
  readyToPublish: boolean
  publishedAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt?: Date
  translations: TermTranslation[]
}

type Term = {
  id: number
  identifier: string
  categoryId: number
  activeVersionId: number | null
  createdAt: Date
  updatedAt?: Date
  category: {
    translations: {
      name: string
      languageId: number
    }[]
  }
  labels: {
    label: {
      translations: {
        name: string
        languageId: number
      }[]
    }
  }[]
}

type PendingTermCardProps = {
  termVersion: TermVersion
  term: Term
}

export default function PendingTermCard({ termVersion, term }: PendingTermCardProps) {
  const router = useRouter()
  const t = useTranslations()
  const locale = useLocale(); // Get the current locale
  const [isExpanded, setIsExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null)
  const [showComments, setShowComments] = useState(false)

  // Get Latvian (language ID 1) and English (language ID 2) translations
  const lvTranslation = termVersion.translations.find(t => t.languageId === 1)
  const enTranslation = termVersion.translations.find(t => t.languageId === 2)

  // Find translation for the current locale
  const currentLocaleTranslation = termVersion.translations.find(t => t.language.code === locale);

  // Determine the name to display with fallbacks
  const displayName = currentLocaleTranslation?.name || enTranslation?.name || lvTranslation?.name;

  // Get category name in English
  const categoryNameEn = term.category.translations.find(t => t.languageId === 2)?.name || 'Unknown Category'
  const categoryNameLv = term.category.translations.find(t => t.languageId === 1)?.name || 'Unknown Category'

  // Format date
  const formattedDate = new Date(termVersion.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Get labels
  const labels = term.labels.map(labelItem => ({
    en: labelItem.label.translations.find(t => t.languageId === 2)?.name || 'Unknown',
    lv: labelItem.label.translations.find(t => t.languageId === 1)?.name || 'Unknown'
  }))

  // Handle approval of a term
  const handleApprove = async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setProcessingAction('approve')

    try {
      const result = await approveTermDraft({
        termVersionId: termVersion.id
      })

      if (result.success) {
        // Refresh the page to update the list
        router.refresh()
      } else {
        console.error('Error approving term:', result.error)
        alert(`Failed to approve term: ${result.error}`)
      }
    } catch (error) {
      console.error('Error approving term:', error)
      alert('An unexpected error occurred while approving the term')
    } finally {
      setIsProcessing(false)
      setProcessingAction(null)
    }
  }

  // Handle rejection of a term
  const handleReject = async () => {
    if (isProcessing) return

    if (!confirm(t('admin.pending_terms.messages.confirmation_delete'))) {
      return
    }

    setIsProcessing(true)
    setProcessingAction('reject')

    try {
      const result = await rejectTermDraft({
        termVersionId: termVersion.id
      })

      if (result.success) {
        // Refresh the page to update the list
        router.refresh()
      } else {
        console.error('Error rejecting term:', result.error)
        alert(`${t('admin.pending_terms.messages.term_rejected')}: ${result.error}`)
      }
    } catch (error) {
      console.error('Error rejecting term:', error)
      alert(t('admin.common.error'))
    } finally {
      setIsProcessing(false)
      setProcessingAction(null)
    }
  }

  // Handle view details (expand/collapse)
  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="bg-[#1a2239] rounded-xl border border-[#30364a] overflow-hidden shadow-xl">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-[#1a2239] to-[#263354] p-4 border-b border-[#30364a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-amber-500/10 p-2 rounded-lg mr-3">
              <ClockIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              {/* Display name based on locale */}
              <h3 className="text-white text-lg font-medium">
                {displayName || t('admin.no_translation')}
              </h3>
              <p className="text-gray-400 text-sm">
                ID: {term.identifier} • {t('admin.created')}: {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Approve Button */}
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="bg-green-900/20 hover:bg-green-900/30 border border-green-600/30 text-green-400 px-3 py-1.5 rounded-lg text-sm flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && processingAction === 'approve' ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                  {t('admin.common.loading')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  {t('admin.pending_terms.review.approve')}
                </>
              )}
            </button>

            {/* Reject Button */}
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-red-900/20 hover:bg-red-900/30 border border-red-600/30 text-red-400 px-3 py-1.5 rounded-lg text-sm flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing && processingAction === 'reject' ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
                  {t('admin.common.loading')}
                </>
              ) : (
                <>
                  <XCircleIcon className="h-4 w-4 mr-1" />
                  {t('admin.pending_terms.review.reject')}
                </>
              )}
            </button>

            {/* Comments Button */}
            <button
              onClick={() => setShowComments(!showComments)}
              className={`border px-3 py-1.5 rounded-lg text-sm flex items-center transition-colors ${
                showComments
                  ? "bg-blue-900/30 border-blue-600/50 text-blue-400"
                  : "bg-[#10142a]/60 border-[#30364a] text-[#eaeaea] hover:bg-[#10142a]"
              }`}
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
              {t('admin.comments.title')}
            </button>

            {/* Expand/Collapse Button */}
            <button
              onClick={toggleExpand}
              className="bg-[#10142a]/60 border border-[#30364a] text-[#eaeaea] p-1.5 rounded-lg hover:bg-[#10142a] transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-4 border-t border-[#30364a]">
          <DraftTermComments termId={term.id} />
        </div>
      )}

      {/* Card Content (expanded) */}
      {isExpanded && !showComments && (
        <div className="p-4">
          {/* Metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Category */}
            <div className="bg-[#10142a]/60 p-3 rounded-lg border border-[#30364a] flex items-start">
              <div className="bg-cyan-900/30 p-2 rounded-lg mr-3">
                <TagIcon className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">{t('category.category')}</p>
                <p className="text-white">{categoryNameEn}</p>
                <p className="text-gray-400 text-sm">{categoryNameLv}</p>
              </div>
            </div>

            {/* Labels */}
            <div className="bg-[#10142a]/60 p-3 rounded-lg border border-[#30364a] flex items-start">
              <div className="bg-emerald-900/30 p-2 rounded-lg mr-3">
                <BookmarkIcon className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">{t('labels.labels')}</p>
                {labels.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {labels.map((label, index) => (
                      <span
                        key={index}
                        className="inline-block bg-[#1a2239] text-white text-xs px-2 py-1 rounded-full border border-[#30364a]"
                      >
                        {label.en}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white">{t('labels.no_labels')}</p>
                )}
              </div>
            </div>

            {/* View on Site Link */}
            <div className="bg-[#10142a]/60 p-3 rounded-lg border border-[#30364a] flex items-center">
              <div className="bg-indigo-900/30 p-2 rounded-lg mr-3">
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">{t('admin.term_status')}</p>
                <div className="flex items-center">
                  <span className="inline-block bg-amber-900/30 text-amber-400 text-xs px-2 py-1 rounded-full">
                    {t('admin.pending_terms.status.pending')}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-1.5">
                  {t('admin.pending_terms.status.will_be_published')}
                </p>
              </div>
            </div>
          </div>

          {/* Translation Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latvian Translation */}
            <div className="space-y-4">
              <div className="flex items-center">
                <LanguageIcon className="h-4 w-4 text-[#58a6ff] mr-2" />
                <h4 className="text-white font-medium">{t('language.lv')}</h4>
              </div>

              <div className="bg-[#10142a]/60 p-4 rounded-lg border border-[#30364a]">
                <h5 className="text-white font-medium mb-2">{lvTranslation?.name || t('admin.no_translation')}</h5>
                <div className="bg-[#1a2239] p-3 rounded border border-[#30364a] text-gray-300 whitespace-pre-wrap text-sm">
                  {lvTranslation?.description || t('term_view.no_description')}
                </div>
              </div>
            </div>

            {/* English Translation */}
            <div className="space-y-4">
              <div className="flex items-center">
                <LanguageIcon className="h-4 w-4 text-[#58a6ff] mr-2" />
                <h4 className="text-white font-medium">{t('language.en')}</h4>
              </div>

              <div className="bg-[#10142a]/60 p-4 rounded-lg border border-[#30364a]">
                <h5 className="text-white font-medium mb-2">{enTranslation?.name || t('admin.no_translation')}</h5>
                <div className="bg-[#1a2239] p-3 rounded border border-[#30364a] text-gray-300 whitespace-pre-wrap text-sm">
                  {enTranslation?.description || t('term_view.no_description')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
