import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  ArrowLeftIcon,
  ClockIcon,
} from "@heroicons/react/24/outline"
import PendingTermCard from "@/app/components/admin/PendingTermCard"
import LocaleLink from '@/app/components/LocaleLink'
import { getTranslations } from 'next-intl/server'

// Helper function to get pending terms
async function getPendingTerms() {
  try {
    // Find all term versions with DRAFT status that have an associated term
    const pendingVersions = await prisma.termVersion.findMany({
      where: {
        status: "DRAFT"
      },
      include: {
        translations: {
          include: {
            language: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Fetch the associated terms
    const results = []

    for (const version of pendingVersions) {
      const term = await prisma.termini.findUnique({
        where: {
          id: version.termId
        },
        include: {
          category: {
            include: {
              translations: true
            }
          },
          labels: {
            include: {
              label: {
                include: {
                  translations: true
                }
              }
            }
          }
        }
      })

      if (term) {
        // Map to the structure expected by PendingTermCard
        const mappedVersion = {
          ...version,
          translations: version.translations.map(t => ({
            id: t.termVersionId * 100 + t.languageId, // Generate a unique ID for the translation
            name: t.name,
            description: t.description,
            languageId: t.languageId,
            language: {
              id: t.language.id,
              code: t.language.code,
              name: t.language.name
            }
          }))
        }

        results.push({
          version: mappedVersion,
          term
        })
      }
    }

    return results
  } catch (error) {
    console.error("Error fetching pending terms:", error)
    return []
  }
}

export default async function PendingTermsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Properly await the params to get the locale
  const { locale } = await params;
  const t = await getTranslations({ locale })
  const session = await auth()

  // Check if the user is authenticated and is an admin
  if (!session || !session.user) {
    redirect("/login")
  }

  // Fetch the user to check if they're an admin
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email as string,
    },
  })

  if (!user || !user.isAdmin) {
    redirect("/")
  }

  // Fetch pending terms
  const pendingItems = await getPendingTerms()

  return (
    <div className="bg-[#0b0f23] min-h-screen text-[#eaeaea]">
      {/* Page title */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-6">
        <div className="flex items-center justify-between">
          <LocaleLink
            href="/admin"
            className="flex items-center text-[#58a6ff] hover:text-[#4393e6] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            <span>{t('admin.dashboard.backToDashboard')}</span>
          </LocaleLink>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-2 flex items-center">
          <ClockIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('admin.pending_terms.title')}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t('admin.pending_terms.description')}
        </p>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('navigation.home')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t('navigation.admin_panel')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">{t('admin.pending_terms.title')}</span> {/* Current page */}
        </div>
      </section>

      {/* Main content */}
      <main className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-12">
        {pendingItems.length > 0 ? (
          <div className="space-y-6">
            {pendingItems.map((item) => (
              <PendingTermCard
                key={item.version.id}
                termVersion={item.version}
                term={item.term}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-[#10142a] rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-white mb-2">{t('admin.pending_terms.noTermsTitle')}</h2>
            <p className="text-gray-400 mb-6">{t('admin.pending_terms.noTermsDescription')}</p>
            <LocaleLink
              href="/admin/new-term"
              className="inline-flex items-center px-4 py-2 bg-[#58a6ff] hover:bg-[#4393e6] text-white rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('admin.action.add_new_term')}
            </LocaleLink>
          </div>
        )}
      </main>

    </div>
  )
}
