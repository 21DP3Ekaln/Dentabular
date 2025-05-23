'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * Check if the current user has admin privileges
 * @returns Object containing isAdmin status
 */
export async function checkIsAdmin() {
  try {
    const session = await auth()
    
    // Not authenticated
    if (!session?.user?.email) {
      return { isAdmin: false }
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    // Return admin status
    return { 
      isAdmin: Boolean(user?.isAdmin)
    }
  } catch (error) {
    console.error('Error checking admin status:', error)
    return { isAdmin: false, error: 'Failed to check admin status' }
  }
} 