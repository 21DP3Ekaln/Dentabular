'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DraftTermCommentForm from './DraftTermCommentForm'
import { getCommentsForTerm, addComment } from '../../actions/commentActions'
import { useTranslations } from 'next-intl'; // Import useTranslations

type User = {
  id: number
  email: string
  fullName: string
  isAdmin: boolean
}

type Comment = {
  id: number
  content: string
  isClosed: boolean
  isDeleted: boolean
  termId: number
  userId: number
  parentCommentId: number | null
  createdAt: Date
  updatedAt: Date
  user: User
  responses?: Comment[]
}

export default function DraftTermComments({ termId }: { termId: number }) {
  const router = useRouter()
  // Correct the namespace to match JSON structure
  const t = useTranslations('admin.pending_terms.comments'); 
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true)
        const data = await getCommentsForTerm(termId)
        setComments(data)
      } catch (err) {
        console.error('Error fetching comments:', err)
        setError('Failed to load comments')
      } finally {
        setLoading(false)
      }
    }
    
    fetchComments()
  }, [termId])
  
  // Add a new comment and update the UI immediately
  const handleAddComment = async (content: string) => {
    try {
      await addComment(termId, content)
      
      // Update local state immediately for a responsive UI
      const session = await fetch('/api/auth/session').then(res => res.json())
      if (session?.user) {
        const newComment = {
          id: Date.now(), // Temporary ID until refresh
          content: content,
          isClosed: false,
          isDeleted: false,
          termId: termId,
          userId: -1, // Placeholder
          parentCommentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: -1, // Placeholder
            email: session.user.email,
            fullName: session.user.name || 'You',
            isAdmin: true
          },
          responses: []
        }
        
        setComments(prevComments => [newComment, ...prevComments])
      }
      
      // Also refresh the router for server-side changes
      router.refresh()
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }


  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#58a6ff] border-r-transparent"></div>
        {/* Use translation key */}
        <p className="mt-2 text-sm text-gray-400">{t('loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4 text-center text-red-400">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        {/* Use translation key */}
        <h3 className="text-white text-lg font-medium mb-3">{t('title')}</h3>
        <DraftTermCommentForm termId={termId} onCommentAdded={handleAddComment} />
      </div>
      
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-[#10142a]/60 p-4 rounded-lg border border-[#30364a]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] font-bold">
                  {comment.user.fullName ? comment.user.fullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="font-semibold text-[#eaeaea] flex items-center gap-2">
                    {comment.user.fullName || 'Anonymous'}
                    {comment.user.isAdmin && (
                      <span className="text-xs bg-[#58a6ff] text-white px-2 py-0.5 rounded-full">Admin</span>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
              <div className="pl-11">
                <p className="text-gray-300 leading-relaxed break-words whitespace-pre-wrap overflow-hidden">{comment.content}</p>
              </div>
              
              {/* Responses to this comment */}
              {comment.responses && comment.responses.length > 0 && (
                <div className="mt-4 pl-11 space-y-3">
                  {comment.responses.map((response) => (
                    <div key={response.id} className="bg-[#1a2239] p-3 rounded-lg border border-[#30364a]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-[#58a6ff] flex items-center justify-center text-white font-bold text-xs">
                          {response.user.fullName ? response.user.fullName.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <div className="font-medium text-[#eaeaea] text-sm flex items-center gap-1">
                            {response.user.fullName || 'Anonymous'}
                            {response.user.isAdmin && (
                              <span className="text-xs bg-[#58a6ff] text-white px-1.5 py-0.5 rounded-full text-[10px]">Admin</span>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(response.createdAt).toLocaleDateString()} • {new Date(response.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden">{response.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#10142a]/60 p-4 rounded-lg border border-[#30364a] text-center">
          {/* Use translation key */}
          <p className="text-gray-400 text-sm">{t('noComments')}</p>
        </div>
      )}
    </div>
  )
}
