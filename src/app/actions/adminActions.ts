'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
// Removed unused TermVersion import

type CreateTermInput = {
  lvName: string
  lvDescription: string
  enName: string
  enDescription: string
  categoryId: number
  labels: string[]
}

/**
 * Create a new term draft version
 */
export async function createTermDraft(data: CreateTermInput) {
  try {
    console.log("Data received by createTermDraft:", JSON.stringify(data, null, 2))
    
    // Validate input
    if (!data) {
      console.error("No data provided to createTermDraft")
      return { 
        success: false, 
        error: "No data provided" 
      }
    }
    
    if (!data.lvName || !data.enName || !data.categoryId) {
      console.error("Missing required fields:", {
        lvName: Boolean(data.lvName),
        enName: Boolean(data.enName),
        categoryId: Boolean(data.categoryId)
      })
      return { 
        success: false, 
        error: "Missing required fields" 
      }
    }
    
    console.log("Checking authentication...")
    let session;
    try {
      session = await auth();
      console.log("Auth result:", session ? "Session exists" : "No session");
      
      if (session) {
        console.log("Session user:", session.user ? JSON.stringify(session.user) : "No user in session");
      }
    } catch (authError) {
      console.error("Authentication error:", authError);
      return {
        success: false,
        error: `Authentication error: ${authError instanceof Error ? authError.message : 'Unknown auth error'}`
      };
    }
    
    if (!session || !session.user) {
      console.error("No authenticated user found")
      return { 
        success: false, 
        error: "You must be logged in to perform this action" 
      }
    }
    
    console.log("Authenticated as:", session.user.email)
    
    console.log("Checking if user is admin...")
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    })
    
    if (!user) {
      console.error("User not found in database")
      return {
        success: false,
        error: "User not found"
      }
    }
    
    if (!user.isAdmin) {
      console.error("User is not an admin")
      return { 
        success: false, 
        error: "You don't have permission to perform this action" 
      }
    }
    
    console.log("User is admin, proceeding with term creation")
    
    const identifier = `term_${randomBytes(4).toString('hex')}`
    console.log("Generated term identifier:", identifier)
    
    // Ensure labels is an array
    const labels = Array.isArray(data.labels) ? data.labels : []
    console.log("Parsed labels:", labels)
    
    // Verify category exists
    console.log("Verifying category exists:", data.categoryId)
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    })
    
    if (!category) {
      console.error("Category not found:", data.categoryId)
      return {
        success: false,
        error: `Category with ID ${data.categoryId} not found`
      }
    }
    
    console.log("Starting database transaction...")
    try {
      const result = await prisma.$transaction(async (tx) => {
        console.log("Creating term with identifier:", identifier)
        const term = await tx.termini.create({
          data: {
            identifier,
            categoryId: data.categoryId,
          },
        })
        console.log("Created term:", term)
        
        console.log("Creating term version...")
        const termVersion = await tx.termVersion.create({
          data: {
            termId: term.id,
            status: "DRAFT",
            versionNumber: 1,
            readyToPublish: true,
            translations: {
              create: [
                {
                  name: data.lvName,
                  description: data.lvDescription,
                  languageId: 1,
                },
                {
                  name: data.enName,
                  description: data.enDescription,
                  languageId: 2,
                },
              ],
            },
          },
        })
        console.log("Created term version:", termVersion)
        
        console.log("Updating term with active version...")
        const updatedTerm = await tx.termini.update({
          where: { id: term.id },
          data: { activeVersionId: termVersion.id },
        })
        console.log("Updated term:", updatedTerm)
        
        if (labels.length > 0) {
          console.log("Creating label connections...")
          const labelConnections = labels.map(labelId => ({
            labelId: parseInt(labelId),
            termId: term.id
          }))
          
          await tx.terminiLabel.createMany({
            data: labelConnections
          })
          console.log("Created label connections")
        }
        
        return { term: updatedTerm, termVersion }
      })
      
      console.log("Transaction completed successfully:", result)
      
      revalidatePath('/admin')
      revalidatePath('/admin/pending-terms')
      
      return { 
        success: true, 
        termId: result.term.id,
        termVersionId: result.termVersion.id
      }
    } catch (txError) {
      console.error("Transaction error in createTermDraft:", txError)
      return { 
        success: false, 
        error: `Transaction failed: ${txError instanceof Error ? txError.message : 'Unknown error'}` 
      }
    }
  } catch (error) {
    console.error("Error creating term draft:", error)
    return { 
      success: false, 
      error: `Failed to create term draft: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Approve a term draft
 */
export async function approveTermDraft({ termVersionId }: { termVersionId: number }) {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return { 
        success: false, 
        error: "You must be logged in to perform this action" 
      }
    }
    
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    })
    
    if (!user || !user.isAdmin) {
      return { 
        success: false, 
        error: "You don't have permission to perform this action" 
      }
    }
    
    const termVersion = await prisma.termVersion.findUnique({
      where: { id: termVersionId }
    })
    
    if (!termVersion) {
      return { 
        success: false, 
        error: "Term version not found" 
      }
    }
    
    const term = await prisma.termini.findUnique({
      where: { id: termVersion.termId }
    })
    
    if (!term) {
      return {
        success: false,
        error: "Term not found"
      }
    }

    let finalTermVersionId: number | null = null; // Variable to hold the ID after transaction

    await prisma.$transaction(async (tx) => {
      // Set readyToPublish to false for all other versions of this term
      await tx.termVersion.updateMany({
        where: {
          termId: term.id,
           id: { not: termVersionId }
         },
         data: { 
           status: "ARCHIVED", // Set status to ARCHIVED
           readyToPublish: false, // Keep this false as well
           archivedAt: new Date() // Add archive timestamp
         } 
       });
 
       // Approve the current version and ensure it's ready to publish
      const approvedVersion = await tx.termVersion.update({ // Use a local variable inside transaction
        where: { id: termVersionId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          readyToPublish: true // Ensure this is true for the approved version
        }
      });

      // Update the parent term to point to the newly approved version
      await tx.termini.update({
        where: { id: term.id },
        data: { activeVersionId: termVersionId }
      });

      finalTermVersionId = approvedVersion.id; // Assign the ID inside the transaction
    });

    if (finalTermVersionId === null) {
      // If the ID wasn't assigned, the transaction likely failed or didn't update as expected.
      throw new Error("Term version update failed, ID not assigned after transaction.");
    }
    
    revalidatePath('/admin')
    revalidatePath('/admin/pending-terms')
    revalidatePath('/')
    revalidatePath(`/comments/${term.id}`) // Revalidate comments page for this term
    
    return { 
      success: true, 
      termVersionId: finalTermVersionId // Use the ID captured from within the transaction
    }
  } catch (error) {
    console.error("Error approving term:", error)
    return { 
      success: false, 
      error: "Failed to approve term" 
    }
  }
}

/**
 * Reject a term draft
 */
export async function rejectTermDraft({ termVersionId }: { termVersionId: number }) {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return { 
        success: false, 
        error: "You must be logged in to perform this action" 
      }
    }
    
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    })
    
    if (!user || !user.isAdmin) {
      return { 
        success: false, 
        error: "You don't have permission to perform this action" 
      }
    }
    
    const termVersion = await prisma.termVersion.findUnique({
      where: { id: termVersionId },
      include: { 
        translations: true
      }
    })
    
    if (!termVersion) {
      return { 
        success: false, 
        error: "Term version not found" 
      }
    }
    
    const term = await prisma.termini.findUnique({
      where: { id: termVersion.termId }
    })
    
    if (!term) {
      return {
        success: false,
        error: "Term not found"
      }
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.termVersionTranslation.deleteMany({
        where: { termVersionId }
      })
      
      await tx.termVersion.delete({
        where: { id: termVersionId }
      })
      
      const otherVersions = await tx.termVersion.findMany({
        where: { 
          termId: term.id,
          id: { not: termVersionId }
        }
      })
      
      if (otherVersions.length === 0) {
        // Delete comments associated with this term first
        await tx.comment.deleteMany({
          where: { termId: term.id }
        })
        
        // Then delete labels and the term itself
        await tx.terminiLabel.deleteMany({
          where: { termId: term.id }
        })
        
        await tx.termini.delete({
          where: { id: term.id }
        })
      }
      else if (term.activeVersionId === termVersionId && otherVersions.length > 0) {
        const publishedVersion = otherVersions.find(v => v.status === "PUBLISHED")
        const newActiveVersion = publishedVersion || otherVersions[0]
        
        await tx.termini.update({
          where: { id: term.id },
          data: { activeVersionId: newActiveVersion.id }
        })
      }
    })
    
    revalidatePath('/admin')
    revalidatePath('/admin/pending-terms')
    
    return { success: true }
  } catch (error) {
    console.error("Error rejecting term:", error)
    return { 
      success: false, 
      error: "Failed to reject term" 
    }
  }
}

/**
 * Get all categories for the form select
 */
export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        translations: {
          include: {
            language: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    })
    
    return { 
      success: true, 
      categories 
    }
  } catch (error) {
    console.error("Error fetching categories:", error)
    return { 
      success: false, 
      error: "Failed to fetch categories",
      categories: []
    }
  }
}

/**
 * Get all labels for the form multi-select
 */
export async function getLabels() {
  try {
    const labels = await prisma.label.findMany({
      include: {
        translations: {
          include: {
            language: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    })
    
    return { 
      success: true, 
      labels 
    }
  } catch (error) {
    console.error("Error fetching labels:", error)
    return { 
      success: false, 
      error: "Failed to fetch labels",
      labels: []
    }
  }
}

/**
 * Get pending terms count for the admin dashboard
 */
export async function getPendingTermsCount() {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return { 
        success: false, 
        error: "You must be logged in to perform this action",
        count: 0
      }
    }
    
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    })
    
    if (!user || !user.isAdmin) {
      return { 
        success: false, 
        error: "You don't have permission to perform this action",
        count: 0
      }
    }
    
    const count = await prisma.termVersion.count({
      where: {
        status: "DRAFT"
      }
    })
    
    return { success: true, count }
  } catch (error) {
    console.error("Error counting pending terms:", error)
    return { 
      success: false, 
      error: "Failed to count pending terms",
      count: 0
    }
  }
}
