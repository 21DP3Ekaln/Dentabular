'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function getCommentsForTerm(termId: number) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user?.isAdmin) {
    throw new Error('Unauthorized - Admin only')
  }

  const comments = await prisma.comment.findMany({
    where: {
      termId,
      parentCommentId: null, // Only top-level comments
      isDeleted: false
    },
    include: {
      user: true,
      responses: {
        where: { isDeleted: false },
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return comments
}

export async function addComment(termId: number, content: string) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw new Error('User not found')
  }

  await prisma.comment.create({
    data: {
      content,
      userId: user.id,
      termId: termId,
      isClosed: false,
      isDeleted: false
    }
  })

  // Revalidate both the comments page and the pending terms page
  revalidatePath(`/comments/${termId}`)
  revalidatePath('/admin/pending-terms')
}

export async function deleteComment(commentId: number, termId: number) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check if the comment belongs to the user
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { user: true }
  })

  if (!comment || comment.userId !== user.id) {
    throw new Error('Unauthorized')
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { isDeleted: true }
  })

  revalidatePath(`/comments/${termId}`)
}

export async function addAdminResponse(commentId: number, content: string, termId: number) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user?.isAdmin) {
    throw new Error('Unauthorized - Admin only')
  }

  await prisma.comment.create({
    data: {
      content,
      userId: user.id,
      termId: termId,
      parentCommentId: commentId,
      isClosed: false,
      isDeleted: false
    }
  })

  revalidatePath(`/comments/${termId}`)
}

export async function toggleCommentClosed(commentId: number) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user?.isAdmin) {
    throw new Error('Unauthorized - Admin only')
  }

  // Get current comment
  const comment = await prisma.comment.findUnique({
    where: { id: commentId }
  })

  if (!comment) {
    throw new Error('Comment not found')
  }

  // Toggle the isClosed status
  await prisma.comment.update({
    where: { id: commentId },
    data: { isClosed: !comment.isClosed }
  })

  // Determine paths to revalidate
  revalidatePath(`/comments/${comment.termId}`)
  revalidatePath('/admin/comments')
  revalidatePath('/admin') // To update the dashboard
}

export async function getCommentsForAdmin({ status }: { status?: 'all' | 'open' | 'closed' } = {}) {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Not authenticated')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user?.isAdmin) {
    throw new Error('Unauthorized - Admin only')
  }

  // Set up where clause based on status filter
  const whereClause: {
    parentCommentId: null;
    isDeleted: boolean;
    isClosed?: boolean;
  } = {
    parentCommentId: null, // Only top-level comments
    isDeleted: false
  }

  if (status === 'open') {
    whereClause.isClosed = false
  } else if (status === 'closed') {
    whereClause.isClosed = true
  }

  const comments = await prisma.comment.findMany({
    where: whereClause,
    include: {
      user: true,
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
      },
      responses: {
        where: { isDeleted: false },
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return comments
}
