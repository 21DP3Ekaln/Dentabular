import { auth, signIn, signOut } from "@/auth";
import { User } from "next-auth";
import LocaleLink from "@/app/components/LocaleLink";
import { prisma } from "@/lib/prisma";
import { 
  CalendarIcon, 
  HeartIcon, 
  ChatBubbleLeftRightIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';

// Define Term type to avoid 'any'
type Translation = {
  name: string;
  language: {
    code: string;
  };
};

type TermVersion = {
  translations: Translation[];
};

type Category = {
  translations: Translation[];
};

type Term = {
  id: number;
  activeVersion?: TermVersion;
  category?: Category;
};

export default async function ProfilePage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Properly await the params to get the locale
  const { locale } = await params;
  const session = await auth();
  const user = session?.user as User | undefined;
  const t = await getTranslations({locale});

  // Sign-in section for unauthenticated users
  if (!session || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
        {/* Hero Section */}
        <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 text-center relative overflow-hidden rounded-xl border border-[#30364a]/30">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <UserCircleIcon className="h-12 w-12 text-[#58a6ff] mr-3" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb]">
                  {t('profile.welcome')}
                </h1>
              </div>
              <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-8">
                {t('profile.sign_in_description')}
              </p>
              <form
                action={async () => {
                  "use server";
                  await signIn("google");
                }}
              >
                <button className="bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
                  {t('profile.sign_in_google')}
                </button>
              </form>
            </div>

            {/* Decorative Wave */}
            <svg
              className="absolute bottom-0 left-0 w-full text-[#0b0f23]"
              viewBox="0 0 1440 120"
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
            </svg>
          </div>
        </section>
      </div>
    );
  }

  // Fetch user stats with proper includes for the updated schema
  const userStats = await prisma.user.findUnique({
    where: { email: user.email! },
    include: {
      _count: {
        select: {
          favorites: true,
          comments: true,
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { 
          term: {
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
          }
        },
      },
      favorites: {
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { 
          term: {
            include: {
              activeVersion: {
                include: {
                  translations: {
                    include: {
                      language: true
                    }
                  }
                }
              },
              category: {
                include: {
                  translations: {
                    include: {
                      language: true
                    }
                  }
                }
              }
            }
          }
        },
      },
    },
  });

  const favoriteCount = userStats?._count.favorites ?? 0;
  const commentCount = userStats?._count.comments ?? 0;
  const recentComments = userStats?.comments ?? [];
  const recentFavorites = userStats?.favorites ?? [];

  // Helper function to get term name in preferred language (English default)
  const getTermName = (term: Term, languageCode = 'en') => {
    if (!term?.activeVersion?.translations?.length) return 'Untitled Term';
    
    // Try to find the translation in the preferred language
    const translation = term.activeVersion.translations.find(
      (t: Translation) => t.language.code === languageCode
    );
    
    // If found, return the name, otherwise return the first available translation name
    return translation?.name || term.activeVersion.translations[0]?.name || 'Untitled Term';
  };

  // Get category name in preferred language (English default)
  const getCategoryName = (term: Term, languageCode = 'en') => {
    if (!term?.category?.translations?.length) return 'Uncategorized';
    
    const translation = term.category.translations.find(
      (t: Translation) => t.language.code === languageCode
    );
    
    return translation?.name || term.category.translations[0]?.name || 'Uncategorized';
  };

  // Profile page for authenticated users
  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Hero Section */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a2239] to-[#263354] p-8 sm:p-12 relative overflow-hidden rounded-xl border border-[#30364a]/30">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-[#58a6ff]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#64d8cb]/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || ""}
                  className="w-32 h-32 rounded-full shadow-lg border-4 border-[#58a6ff]/30"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-[#58a6ff] to-[#64d8cb] rounded-full flex items-center justify-center text-4xl text-white shadow-lg">
                  {user?.name?.[0] || "U"}
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-grow text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#64d8cb] mb-2">
                {user?.name || "User"}
              </h1>
              <p className="text-lg text-gray-300 mb-4">{user?.email}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                <div className="bg-[#10142a]/60 px-4 py-2 rounded-lg border border-[#30364a] flex items-center">
                  <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-gray-300">{favoriteCount} {t('profile.favorites')}</span>
                </div>
                <div className="bg-[#10142a]/60 px-4 py-2 rounded-lg border border-[#30364a] flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#58a6ff] mr-2" />
                  <span className="text-gray-300">{commentCount} {t('profile.comments')}</span>
                </div>
              </div>
            </div>
            
            {/* Sign Out Button */}
            <div className="flex-shrink-0">
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button className="bg-[#10142a]/60 text-[#eaeaea] px-4 py-2 rounded-lg border border-[#30364a] hover:bg-[#10142a] transition-colors">
                  {t('profile.sign_out')}
                </button>
              </form>
            </div>
          </div>

          {/* Decorative Wave */}
          <svg
            className="absolute bottom-0 left-0 w-full text-[#0b0f23]"
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96L1440,120L1380,120C1320,120,1200,120,1080,120C960,120,840,120,720,120C600,120,480,120,360,120C240,120,120,120,60,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Activity Section Title */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-4">
        <div className="flex items-center">
          <CalendarIcon className="h-5 w-5 text-[#58a6ff] mr-2" />
          <h2 className="text-xl text-[#58a6ff] font-semibold">{t('profile.your_activity')}</h2>
        </div>
      </div>

      {/* Activity Cards */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Favorites Card */}
          <div className="bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#58a6ff]/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-[#58a6ff]">{t('profile.your_favorites')}</h3>
                <HeartIcon className="h-6 w-6 text-red-500" />
              </div>
              
              <p className="text-gray-300 mb-4">
                {t('profile.favorites_description', { count: favoriteCount })}
              </p>
   
              {recentFavorites.length > 0 ? (
                <div className="mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {recentFavorites.map((favorite) => (
                      <LocaleLink
                        key={favorite.id}
                        href={`/terms/${favorite.termId}`}
                        className="block bg-[#10142a]/60 hover:bg-[#10142a]/80 p-3 rounded-lg transition-all duration-200 border border-[#30364a]/50 hover:border-[#58a6ff]/30"
                      >
                        <span className="block text-[#eaeaea] font-medium truncate">
                          {getTermName(favorite.term as Term, locale)}
                        </span>
                        <span className="block text-sm text-gray-400 truncate">
                          {getCategoryName(favorite.term as Term, locale)}
                        </span>
                      </LocaleLink>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 mb-4">{t('profile.no_favorites')}</p>
              )}
              
              <LocaleLink 
                href="/favorites" 
                className="inline-flex items-center bg-[#10142a]/40 hover:bg-[#10142a]/80 text-[#58a6ff] px-4 py-2 rounded-lg transition-all duration-200 border border-[#30364a]/50 hover:border-[#58a6ff]/30"
              >
                {t('profile.view_all_favorites')}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </LocaleLink>
            </div>
          </div>
          
          {/* Recent Comments Card */}
          <div className="bg-gradient-to-b from-[#1a2239] to-[#192036] rounded-xl border border-[#30364a]/30 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[#58a6ff]/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-[#58a6ff]">{t('profile.recent_comments')}</h3>
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#58a6ff]" />
              </div>
              
              {recentComments.length > 0 ? (
                <ul className="space-y-3 mb-4">
                  {recentComments.map((comment) => (
                    <li key={comment.id} className="border-b border-[#30364a]/30 pb-3 last:border-0 last:pb-0">
                      <LocaleLink
                        href={`/terms/${comment.termId}`}
                        className="block hover:bg-[#10142a]/40 p-2 rounded-lg transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[#eaeaea] font-medium truncate mr-2">
                            {getTermName(comment.term as Term, locale)}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(comment.createdAt).toLocaleDateString(locale === 'lv' ? 'lv-LV' : 'en-US')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {comment.content}
                        </p>
                        <div className="mt-1 flex items-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            comment.isClosed 
                              ? 'bg-green-900/20 text-green-400' 
                              : 'bg-amber-900/20 text-amber-400'
                          }`}>
                            {comment.isClosed ? t('profile.resolved') : t('profile.open')}
                          </span>
                        </div>
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300 mb-4">{t('profile.no_comments')}</p>
              )}
              
              {commentCount > 0 && (
                <LocaleLink 
                  href="/comments" 
                  className="inline-flex items-center bg-[#10142a]/40 hover:bg-[#10142a]/80 text-[#58a6ff] px-4 py-2 rounded-lg transition-all duration-200 border border-[#30364a]/50 hover:border-[#58a6ff]/30"
                >
                  {t('profile.view_all_comments')}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </LocaleLink>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
