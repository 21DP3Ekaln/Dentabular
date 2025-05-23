import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CommentForm from '../../../components/comments/CommentForm'
import DeleteButton from '../../../components/comments/DeleteButton'
import AdminResponseButton from '../../../components/comments/AdminResponseButton'
import ToggleCommentStatusButtonRegular from '@/app/components/admin/ToggleCommentStatusButtonRegular'
import { getTranslations } from 'next-intl/server'



export default async function CommentPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  // Properly await the params to get the locale and id
  const { id, locale } = await params
  const termId = parseInt(id)
  const t = await getTranslations({ locale, namespace: 'comments' })

  const session = await auth()

  if (!session?.user) {
    redirect("/profile")
  }

  const userEmail = session.user.email ?? undefined

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! }
  })

  const isAdmin = user?.isAdmin ?? false

  // Get term with translations and comments
  const [term, commentsWithResponses] = await Promise.all([
    prisma.termini.findUnique({
      where: { id: termId },
      include: {
        activeVersion: {
          include: {
            translations: {
              include: {
                language: true
              }
            }
          }
        }
      }
    }),
    prisma.comment.findMany({
      where: {
        termId,
        parentCommentId: null, // Only fetch top-level comments
        isDeleted: false,
        // If user is not admin, only show comments by this user
        ...(isAdmin ? {} : { userId: user?.id })
      },
      include: {
        user: true,
        responses: {
          where: { isDeleted: false },
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ])

  if (!term) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f23] text-[#eaeaea]">
        <div className="bg-[#1a2239] p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl text-[#58a6ff] mb-4">{t('term_not_found', { defaultValue: 'Term Not Found' })}</h2>
          <p className="mb-6">{t('term_not_found_description', { defaultValue: 'The term you are looking for doesn\'t exist or has been removed.' })}</p>
          <Link
            href="/"
            className="px-6 py-2 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] transition-all"
          >
            {t('back_to_homepage')}
          </Link>
        </div>
      </div>
    )
  }

  // Get translations for the term
  const lvTranslation = term.activeVersion?.translations.find(t => t.language.code === 'lv')
  const engTranslation = term.activeVersion?.translations.find(t => t.language.code === 'en')

  return (
    <div className="min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      <div className="max-w-5xl mx-auto p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-8 text-[#58a6ff] hover:text-[#4393e6] transition-colors group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t('back_to_homepage')}</span>
        </Link>

        {/* Term details section */}
        <div className="bg-[#1a2239] rounded-xl shadow-xl p-8 mb-10 border border-[#2a3349] hover:border-[#58a6ff]/30 transition-colors">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 bg-[#58a6ff]/10 text-[#58a6ff] text-sm rounded-full mb-2">
                Latvian
              </div>
              <h2 className="text-[#58a6ff] text-3xl font-bold mb-3">{lvTranslation?.name || 'No translation'}</h2>
              <p className="text-gray-300 leading-relaxed">{lvTranslation?.description || 'No description available'}</p>
            </div>
            <div className="space-y-4 md:border-l md:border-[#2a3349] md:pl-8">
              <div className="inline-block px-3 py-1 bg-[#58a6ff]/10 text-[#58a6ff] text-sm rounded-full mb-2">
                English
              </div>
              <h2 className="text-[#58a6ff] text-3xl font-bold mb-3">{engTranslation?.name || 'No translation'}</h2>
              <p className="text-gray-300 leading-relaxed">{engTranslation?.description || 'No description available'}</p>
            </div>
          </div>
        </div>

        {/* Comments section */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-[#58a6ff]">
              {t('title')}
              {commentsWithResponses.length > 0 && (
                <span className="ml-3 text-sm bg-[#58a6ff]/20 text-[#58a6ff] px-3 py-1 rounded-full">
                  {commentsWithResponses.length}
                </span>
              )}
            </h3>
          </div>

          {!isAdmin && (
            <div className="bg-[#2a3349] p-4 rounded-lg mb-6 text-gray-300 text-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#58a6ff] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>{t('info_box.title')}</p>
              </div>

              <div className="mt-2 ml-7 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-900/20 text-amber-400 whitespace-nowrap">{t('info_box.open_status')}</span>
                  <span>{t('info_box.open_description')}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 whitespace-nowrap">{t('info_box.resolved_status')}</span>
                  <span>{t('info_box.resolved_description')}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#1a2239] rounded-xl p-6 border border-[#2a3349] mb-8">
            <h4 className="text-lg font-medium text-[#58a6ff] mb-4">{t('add_comment')}</h4>
            <CommentForm termId={termId} locale={locale} />
          </div>

          <div className="space-y-6">
            {commentsWithResponses.map((comment) => (
              <div key={comment.id} className="bg-[#1a2239] p-6 rounded-xl border border-[#2a3349] hover:border-[#58a6ff]/20 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#58a6ff]/20 flex items-center justify-center text-[#58a6ff] font-bold">
                      {comment.user.fullName ? comment.user.fullName.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="font-semibold text-[#eaeaea]">
                        {comment.user.fullName || 'Anonymous'}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-gray-500 text-xs">
                          {new Date(comment.createdAt).toLocaleDateString()} • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          comment.isClosed
                            ? 'bg-green-900/20 text-green-400'
                            : 'bg-amber-900/20 text-amber-400'
                        }`}>
                          {comment.isClosed ? t('status.resolved') : t('status.open')}
                        </span>
                      </div>
                    </div>
                  </div>
                  {comment.user.email === userEmail && (
                    <DeleteButton commentId={comment.id} termId={termId} locale={locale} />
                  )}
                </div>
                <div>
                  <p className="text-gray-300 leading-relaxed break-words whitespace-pre-wrap overflow-hidden">{comment.content}</p>
                </div>

                {/* Admin responses section */}
                {comment.responses && comment.responses.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#2a3349]">
                    <div className="text-sm text-gray-400 mb-4">{t('admin_response')}</div>
                    {comment.responses.map((response) => (
                      <div key={response.id} className="mt-4 ml-8 p-5 bg-[#2a3349] rounded-xl border-l-3 border-[#58a6ff]">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-[#58a6ff] flex items-center justify-center text-white font-bold">
                            {response.user.fullName ? response.user.fullName.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="font-semibold text-[#eaeaea] flex items-center gap-2">
                              {response.user.fullName || 'Admin'}
                              <span className="text-xs bg-[#58a6ff] text-white px-2 py-0.5 rounded-full">Admin</span>
                            </div>
                            <div className="text-gray-500 text-xs">
                              {new Date(response.createdAt).toLocaleDateString()} • {new Date(response.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                        <div className="pl-11">
                          <p className="text-gray-200 leading-relaxed break-words whitespace-pre-wrap overflow-hidden">{response.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Admin actions section */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-[#2a3349] flex justify-between items-center">
                    <ToggleCommentStatusButtonRegular
                      commentId={comment.id}
                      isClosed={comment.isClosed}
                      locale={locale}
                    />

                    <AdminResponseButton
                      commentId={comment.id}
                      termId={termId}
                      locale={locale}
                    />
                  </div>
                )}
              </div>
            ))}

            {commentsWithResponses.length === 0 && (
              <div className="bg-[#1a2239] p-8 rounded-xl border border-[#2a3349] text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2a3349] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <p className="text-gray-400 mb-4">{t('no_comments')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
