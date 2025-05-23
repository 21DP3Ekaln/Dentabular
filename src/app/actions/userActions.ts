'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'

export type UserRole = 'all' | 'admin' | 'user'

export interface GetUsersParams {
  page: number
  limit: number
  search?: string
  role?: string
}

export type User = {
  id: number
  email: string
  fullName: string
  isAdmin: boolean
  isDisabled: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export type UserPagination = {
  total: number
  pages: number
  page: number
  limit: number
}

export type GetUsersResult = {
  users: User[]
  pagination: UserPagination
}

// Get users with pagination and filters
export async function getUsers({ 
  page = 1, 
  limit = 10, 
  search = '', 
  role = 'all' 
}: GetUsersParams): Promise<GetUsersResult> {
  // Authenticate user
  const session = await auth()
  
  if (!session?.user?.email) {
    throw new Error('You must be logged in to access this resource')
  }
  
  // Verify admin access
  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true }
  })
  
  if (!admin?.isAdmin) {
    throw new Error('You do not have permission to access this resource')
  }
  
  // Calculate pagination values
  const skip = (page - 1) * limit
  
  // Construct the where clause based on filters
  const whereClause: Prisma.UserWhereInput = {}
  
  if (search) {
    // Search by name or email
    whereClause.OR = [
      { email: { contains: search } },
      { fullName: { contains: search } }
    ]
  }
  
  if (role === 'admin') {
    whereClause.isAdmin = true
  } else if (role === 'user') {
    whereClause.isAdmin = false
  }
  
  // Get total count for pagination
  const totalUsers = await prisma.user.count({ where: whereClause })
  
  // Fetch users
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      fullName: true,
      isAdmin: true,
      isDisabled: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [
      { isAdmin: 'desc' },
      { fullName: 'asc' }
    ],
    skip,
    take: limit
  })
  
  // Calculate pagination data
  const totalPages = Math.max(1, Math.ceil(totalUsers / limit))
  
  return {
    users,
    pagination: {
      total: totalUsers,
      pages: totalPages,
      page,
      limit
    }
  }
}

// Update user role (admin/user)
export async function updateUserRole(userId: number, makeAdmin: boolean) {
  // Authenticate user
  const session = await auth()
  
  if (!session?.user?.email) {
    throw new Error('You must be logged in to access this resource')
  }
  
  // Verify admin access
  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isAdmin: true }
  })
  
  if (!admin?.isAdmin) {
    throw new Error('You do not have permission to access this resource')
  }
  
  // Prevent admin from removing their own admin privileges
  if (admin.id === userId && !makeAdmin) {
    throw new Error('You cannot remove your own admin privileges')
  }
  
  // Update user role
  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: makeAdmin }
  })
  
  revalidatePath('/admin/users')
  
  return { success: true }
}

// Update user status (disable/enable)
export async function updateUserStatus(userId: number, disable: boolean) {
  // Authenticate user
  const session = await auth()
  
  if (!session?.user?.email) {
    throw new Error('You must be logged in to access this resource')
  }
  
  // Verify admin access
  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isAdmin: true }
  })
  
  if (!admin?.isAdmin) {
    throw new Error('You do not have permission to access this resource')
  }
  
  // Prevent admin from disabling their own account
  if (admin.id === userId) {
    throw new Error('You cannot disable your own account')
  }
  
  // Update user status
  await prisma.user.update({
    where: { id: userId },
    data: { isDisabled: disable }
  })
  
  revalidatePath('/admin/users')
  
  return { success: true }
}

// Delete user
export async function deleteUser(userId: number) {
  // Authenticate user
  const session = await auth()
  
  if (!session?.user?.email) {
    throw new Error('You must be logged in to access this resource')
  }
  
  // Verify admin access
  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isAdmin: true }
  })
  
  if (!admin?.isAdmin) {
    throw new Error('You do not have permission to access this resource')
  }
  
  // Prevent admin from deleting their own account
  if (admin.id === userId) {
    throw new Error('You cannot delete your own account')
  }
  
  // Use a transaction to handle user deletion and related data
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Soft delete comments by this user
    await tx.comment.updateMany({
      where: { userId },
      data: { isDeleted: true }
    })
    
    // Delete favorites
    await tx.favorite.deleteMany({
      where: { userId }
    })
    
    // Delete the user
    await tx.user.delete({
      where: { id: userId }
    })
  })
  
  revalidatePath('/admin/users')
  
  return { success: true }
}

// Define the user preferences interface for type safety
interface UserPreferences {
  ui_language?: string;
  content_languages?: string[];
  display_settings?: {
    theme?: string;
    items_per_page?: number;
  };
}

// Update user language preference
export async function updateUserLanguagePreference(locale: string) {
  // Authenticate user
  const session = await auth()
  
  if (!session?.user?.email) {
    // Not logged in, just return success (no preferences to update)
    return { success: true }
  }
  
  // Find current user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, preferences: true }
  })
  
  if (!user) {
    throw new Error('User not found')
  }
  
  // Parse existing preferences or create new ones
  let preferences: UserPreferences = {}
  try {
    if (user.preferences) {
      preferences = JSON.parse(user.preferences) as UserPreferences
    }
  } catch (error) {
    console.error('Error parsing user preferences:', error)
    // If preferences can't be parsed, we'll just create new ones
  }
  
  // Update the UI language preference
  preferences.ui_language = locale
  
  // Save updated preferences
  await prisma.user.update({
    where: { id: user.id },
    data: { preferences: JSON.stringify(preferences) }
  })
  
  // No need to revalidate the current page since we'll be navigating
  
  return { success: true }
}

// New function to get the user's preferred language
export async function getUserPreferredLanguage(): Promise<string> {
  // Get current session
  const session = await auth()
  
  // Default to 'en' if not logged in
  if (!session?.user?.email) {
    return 'en'
  }
  
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { preferences: true }
    })
    
    // If user not found or doesn't have preferences, return default
    if (!user?.preferences) {
      return 'en'
    }
    
    // Parse preferences
    const preferences = JSON.parse(user.preferences)
    
    // Return ui_language if it exists, otherwise return 'en'
    return preferences.ui_language || 'en'
  } catch (error) {
    console.error('Error getting user language preference:', error)
    return 'en'
  }
}