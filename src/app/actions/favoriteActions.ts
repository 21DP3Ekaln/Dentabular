'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

/**
 * Get all favorites for the current user
 */
export async function getFavorites() {
  const session = await auth()
  if (!session || !session.user) {
    return { favorites: [] }
  }

  const userEmail = session.user.email
  if (!userEmail) {
    return { favorites: [] }
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    return { favorites: [] }
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
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
          },
          labels: { 
            include: {
              label: {
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
        }
      }
    }
  })

  return { favorites: favorites.map(f => f.term) }
}

/**
 * Add a term to favorites
 */
export async function addFavorite(termId: number) {
  const session = await auth()
  if (!session || !session.user) {
    return { success: false, message: 'You must be logged in to add favorites' }
  }

  const userEmail = session.user.email
  if (!userEmail) {
    return { success: false, message: 'User email not found' }
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    return { success: false, message: 'User not found' }
  }

  try {
    await prisma.favorite.create({
      data: {
        termId,
        userId: user.id
      }
    })
    return { success: true }
  } catch (error) {
    console.error('Error adding favorite:', error)
    return { success: false, message: 'Failed to add favorite' }
  }
}

/**
 * Remove a term from favorites
 */
export async function removeFavorite(termId: number) {
  const session = await auth()
  if (!session || !session.user) {
    return { success: false, message: 'You must be logged in to remove favorites' }
  }

  const userEmail = session.user.email
  if (!userEmail) {
    return { success: false, message: 'User email not found' }
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    return { success: false, message: 'User not found' }
  }

  try {
    await prisma.favorite.deleteMany({
      where: {
        termId,
        userId: user.id
      }
    })
    return { success: true }
  } catch (error) {
    console.error('Error removing favorite:', error)
    return { success: false, message: 'Failed to remove favorite' }
  }
}

/**
 * Check if a term is favorited by the current user
 */
export async function isFavorited(termId: number) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { favorited: false }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return { favorited: false }
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_termId: {
          userId: user.id,
          termId: termId,
        }
      }
    })

    return { favorited: !!favorite }
  } catch (error) {
    console.error('Error checking favorite status:', error)
    return { favorited: false }
  }
}
