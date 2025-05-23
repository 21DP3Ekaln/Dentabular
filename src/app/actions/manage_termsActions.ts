'use server';

import { prisma } from '@/lib/prisma'; // Ensure prisma is imported
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache'; // Import revalidatePath
import { auth } from '@/auth'; // Import auth

// Define the status type based on Prisma schema comment
export type TermStatus = 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';

// Define the structure for the function arguments for fetching
interface GetManagedTermVersionsArgs {
  status: TermStatus;
  query?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
}

// Define the structure of the returned term data for fetching
// Ensure translations include language for identification
// Ensure translations include language for identification
export type ManagedTermVersion = Prisma.TermVersionGetPayload<{
  include: {
    term: {
      include: {
        category: {
          include: {
            translations: true; // Include category translations
          };
        };
        // Include labels associated with the term
        labels: {
          include: {
            label: { // The actual Label model
              include: {
                translations: { // The translations for the Label name
                  include: {
                    language: true; // Include language details for filtering
                  };
                };
              };
            };
          };
        };
      };
    };
    translations: { // Ensure term version translations include language
      include: {
        language: true;
      };
    };
  };
}>;

// Define the return type of the fetch server action
interface GetManagedTermVersionsResult {
  terms: ManagedTermVersion[];
  totalCount: number;
  error?: string;
}

const DEFAULT_PAGE_SIZE = 10; // Or adjust as needed

// Action to fetch term versions for the management table
export async function getManagedTermVersions({
  status,
  query,
  categoryId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: GetManagedTermVersionsArgs): Promise<GetManagedTermVersionsResult> {
  try {
    // Updated whereClause to search in either LV (id: 1) or EN (id: 2) translations
    const whereClause: Prisma.TermVersionWhereInput = {
      status: status,
      ...(categoryId && { term: { categoryId: categoryId } }),
      ...(query && {
        translations: {
          some: {
            // Search in either LV (1) or EN (2)
             languageId: { in: [1, 2] }, // Search in LV or EN
             OR: [
               { name: { contains: query } }, // Removed mode: 'insensitive'
               { description: { contains: query } }, // Removed mode: 'insensitive'
             ],
           },
         },
      }),
    };

    const [terms, totalCount] = await prisma.$transaction([
      prisma.termVersion.findMany({
        where: whereClause,
        include: {
          term: { // Include term to access category
            include: {
              category: { // Include category to access its translations
                include: {
                  // Fetch both LV and EN category translations
                  translations: {
                    where: { languageId: { in: [1, 2] } },
                    include: { language: true } // Include language code for category too
                  }
                }
              },
              // Include labels associated with the term
              labels: {
                include: {
                  label: { // The actual Label model
                    include: {
                      translations: { // The translations for the Label name
                        include: {
                          language: true // Include language details for filtering
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          // Fetch ALL translations (LV and EN) and include language details
          translations: {
            include: { language: true }, // Ensure language details are included
            orderBy: { languageId: 'asc' } // Ensure consistent order
          }
        }, // End of top-level include
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }), // End of findMany call
      prisma.termVersion.count({ where: whereClause })
    ]); // End of transaction array

    return { terms, totalCount };
  } catch (error) {
    console.error('Error fetching managed term versions:', error);
    return {
      terms: [],
      totalCount: 0,
      error: 'Failed to fetch terms. Please try again.',
    };
  }
}


// Action to restore an archived term version
export async function restoreTermVersion(
  termVersionId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized: Not logged in' };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find the version to restore and ensure it's ARCHIVED
      const versionToRestore = await tx.termVersion.findUnique({
        where: { id: termVersionId },
        select: { status: true, termId: true },
      });

      if (!versionToRestore) {
        throw new Error('Term version to restore not found.');
      }
      if (versionToRestore.status !== 'ARCHIVED') {
        throw new Error('Only ARCHIVED versions can be restored.');
      }

      const termId = versionToRestore.termId;

      // 2. Find the currently PUBLISHED version (if any) for this term
      const currentPublishedVersion = await tx.termVersion.findFirst({
        where: {
          termId: termId,
          status: 'PUBLISHED',
        },
        select: { id: true },
      });

      // 3. Archive the currently published version (if it exists)
      if (currentPublishedVersion) {
        await tx.termVersion.update({
          where: { id: currentPublishedVersion.id },
          data: {
            status: 'ARCHIVED',
            readyToPublish: false,
            publishedAt: null, // Clear published date
            archivedAt: new Date(),
          },
        });
      }

      // 4. Restore the selected archived version
      await tx.termVersion.update({
        where: { id: termVersionId },
        data: {
          status: 'PUBLISHED',
          readyToPublish: true,
          publishedAt: new Date(), // Set new published date
          archivedAt: null, // Clear archived date
        },
      });

      // 5. Update the parent term's activeVersionId
      await tx.termini.update({
        where: { id: termId },
        data: { activeVersionId: termVersionId },
      });
    });

    // Revalidate relevant paths
    revalidatePath('/admin/manage-terms');
    revalidatePath(`/admin/manage-versions/${termVersionId}`); // Revalidate the specific term's version page (need identifier ideally)
    // Consider revalidating public term pages as well

    return { success: true };

  } catch (error) {
    console.error('Error restoring term version:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while restoring the term version.' };
  }
}

// Type definition for fetching all versions of a single term
export type TermVersionHistory = Prisma.TermVersionGetPayload<{
  include: {
    translations: { include: { language: true } }; // Include translations with language info
    // Add other relations if needed on the history page, e.g., user who created/published?
  };
}>;

// Action to fetch all versions of a term by its identifier
export async function getAllTermVersionsByIdentifier(
  identifier: string
): Promise<{ versions: TermVersionHistory[]; error?: string; termName?: string }> {
   const session = await auth();
   if (!session?.user?.email) {
     return { versions: [], error: 'Unauthorized: Not logged in' };
   }

   try {
     const dbUser = await prisma.user.findUnique({
       where: { email: session.user.email },
       select: { isAdmin: true },
     });

     if (!dbUser?.isAdmin) {
       return { versions: [], error: 'Unauthorized: Admin privileges required' };
     }

     const term = await prisma.termini.findUnique({
       where: { identifier },
       include: {
         versions: {
           include: {
             translations: { include: { language: true } },
           },
           orderBy: { versionNumber: 'desc' }, // Show latest first
         },
       },
     });

     if (!term) {
       return { versions: [], error: 'Term not found.' };
     }

     // Attempt to get a primary name for the term (e.g., LV) for display purposes
     const primaryTranslation = term.versions[0]?.translations.find(t => t.languageId === 1);
     const termName = primaryTranslation?.name || identifier; // Fallback to identifier

     return { versions: term.versions, termName };

   } catch (error) {
     console.error('Error fetching term versions by identifier:', error);
     if (error instanceof Error) {
       return { versions: [], error: error.message };
     }
     return { versions: [], error: 'An unexpected error occurred while fetching term versions.' };
   }
}

// Define the structure of the returned term data for editing
export type TermVersionForEdit = Prisma.TermVersionGetPayload<{
  include: {
    translations: {
      include: {
        language: true; // Include language code (e.g., 'en', 'lv')
      };
    };
    // Include other relations if needed for editing (e.g., term.categoryId, term.labels)
    term: {
      select: {
        categoryId: true;
        // Include labels if they are editable per version or term
        // labels: { include: { label: true } }
      };
    };
  };
}>;

// Action to fetch a specific term version for editing
export async function getTermVersionForEditing(
  termVersionId: number
): Promise<{ termVersion: TermVersionForEdit | null; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { termVersion: null, error: 'Unauthorized: Not logged in' };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return { termVersion: null, error: 'Unauthorized: Admin privileges required' };
    }

    const termVersion = await prisma.termVersion.findUnique({
      where: { id: termVersionId },
      include: {
        translations: {
          include: {
            language: true, // Get language info (like code)
          },
          orderBy: { languageId: 'asc' }, // Ensure consistent order (e.g., LV then EN)
        },
        term: {
          select: {
            categoryId: true,
            // Include labels here if needed
          },
        },
      },
    });

    if (!termVersion) {
      return { termVersion: null, error: 'Term version not found.' };
    }

    // Optional: Check if it's a DRAFT, although maybe allow viewing others?
    // if (termVersion.status !== 'DRAFT') {
    //   return { termVersion: null, error: 'Only DRAFT versions can be edited.' };
    // }

    return { termVersion };

  } catch (error) {
    console.error('Error fetching term version for editing:', error);
    if (error instanceof Error) {
      return { termVersion: null, error: error.message };
    }
    return { termVersion: null, error: 'An unexpected error occurred while fetching the term version.' };
  }
}
// Action to create a new draft version based on an existing published version
export async function createNewTermVersionDraft(
  termId: number,
  currentVersionId: number
): Promise<{ success: boolean; error?: string; newVersionId?: number }> {
  const session = await auth();
  // Check for user email in session
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized: Not logged in' };
  }

  try {
    // Fetch user from DB to check admin status
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    // Proceed with action logic if user is admin
    // Use transaction to ensure atomicity
    const newVersion = await prisma.$transaction(async (tx: Prisma.TransactionClient) => { // Add type for tx
      // 1. Find the latest version number for this term
      const latestVersion = await tx.termVersion.findFirst({
        where: { termId: termId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      // 2. Fetch translations from the current version to copy
      const currentTranslations = await tx.termVersionTranslation.findMany({
        where: { termVersionId: currentVersionId },
        select: { languageId: true, name: true, description: true },
      });

      if (currentTranslations.length === 0) {
        throw new Error('Cannot create new version: No translations found for the current version.');
      }

      // 3. Create the new TermVersion record
      const createdVersion = await tx.termVersion.create({
        data: {
          termId: termId,
          status: 'DRAFT',
          versionNumber: nextVersionNumber,
          readyToPublish: false,
          translations: {
            createMany: {
              data: currentTranslations.map(translation => ({ // Removed erroneous 't' parameter
                languageId: translation.languageId,
                name: translation.name,
                description: translation.description,
              })),
            },
          },
        },
      });

      return createdVersion;
    });

    revalidatePath('/admin/manage-terms');
    revalidatePath('/admin/pending-terms');

    return { success: true, newVersionId: newVersion.id };

  } catch (error) {
    console.error('Error creating new term version draft:', error);
    if (error instanceof Error) {
       return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while creating the draft.' };
  }
}


// Action to delete a term version (DRAFT, ARCHIVED, or PUBLISHED)
export async function deleteTermVersion(
  termVersionId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
   // Check for user email in session
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized: Not logged in' };
  }

  try {
     // Fetch user from DB to check admin status
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    // Proceed with action logic if user is admin
    // Use transaction for safety, although simple delete might not strictly need it
    await prisma.$transaction(async (tx) => {
      // 1. Find the version to delete and its parent term
      const versionToDelete = await tx.termVersion.findUnique({
        where: { id: termVersionId },
        include: {
          term: true, // Include the parent term
        },
      });

      if (!versionToDelete) {
        throw new Error('Term version not found.');
      }

      const termId = versionToDelete.termId;
      const parentTerm = versionToDelete.term;

      // 2. Check if this is the last version for the term
      const otherVersionsCount = await tx.termVersion.count({
        where: {
          termId: termId,
          id: { not: termVersionId },
        },
      });

      // 3. Handle deletion logic
      if (otherVersionsCount === 0) {
        // This is the last version, delete the parent term as well
        // Delete associated comments first (if applicable)
        await tx.comment.deleteMany({ where: { termId: termId } });
        // Delete associated labels
        await tx.terminiLabel.deleteMany({ where: { termId: termId } });
        // Delete the term version translations (should cascade, but explicit is safer)
        await tx.termVersionTranslation.deleteMany({ where: { termVersionId: termVersionId } });
        // Delete the term version itself
        await tx.termVersion.delete({ where: { id: termVersionId } });
        // Finally, delete the parent term
        await tx.termini.delete({ where: { id: termId } });

      } else {
        // Not the last version
        // Check if it's the active version
        if (parentTerm.activeVersionId === termVersionId) {
          // Find the next best version to set as active
          const nextActiveVersion = await tx.termVersion.findFirst({
            where: {
              termId: termId,
              id: { not: termVersionId },
              // Prioritize PUBLISHED, then ARCHIVED, then DRAFT
              status: { in: ['PUBLISHED', 'ARCHIVED', 'DRAFT'] }
            },
            orderBy: [
              // Custom order: PUBLISHED first, then by creation date descending
              { status: 'desc' }, // Assuming PUBLISHED > DRAFT > ARCHIVED alphabetically works, adjust if needed
              { createdAt: 'desc' },
            ],
          });

          if (nextActiveVersion) {
            await tx.termini.update({
              where: { id: termId },
              data: { activeVersionId: nextActiveVersion.id },
            });
          } else {
            // Should not happen if otherVersionsCount > 0, but handle defensively
            // Maybe set activeVersionId to null or throw error? Setting to null for now.
             await tx.termini.update({
              where: { id: termId },
              data: { activeVersionId: null },
            });
          }
        }
        // Delete the term version translations (should cascade, but explicit is safer)
        await tx.termVersionTranslation.deleteMany({ where: { termVersionId: termVersionId } });
        // Delete the term version itself
        await tx.termVersion.delete({ where: { id: termVersionId } });
      }
    });

    revalidatePath('/admin/manage-terms'); // Revalidate the page

    return { success: true };

  } catch (error) {
    console.error('Error deleting term version:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while deleting the term version.' };
  }
}

// Define the structure for the update function arguments
interface UpdateTermVersionDraftInput {
  termVersionId: number;
  translations: {
    lv: { name: string; description: string };
    en: { name: string; description: string };
  };
  // Add other fields like categoryId, labels if they should be editable here
}

// Action to update a draft term version
export async function updateTermVersionDraft(
  data: UpdateTermVersionDraftInput
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized: Not logged in' };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    const { termVersionId, translations } = data;

    // Validate input data
    if (!translations.lv.name || !translations.en.name) {
       return { success: false, error: 'Validation failed: Term name is required for both languages.' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Verify the term version exists and is a DRAFT
      const termVersion = await tx.termVersion.findUnique({
        where: { id: termVersionId },
        select: { status: true },
      });

      if (!termVersion) {
        throw new Error('Term version not found.');
      }
      if (termVersion.status !== 'DRAFT') {
        throw new Error('Cannot update: Only DRAFT versions can be edited.');
      }

      // 2. Update LV translation (assuming languageId 1 is LV)
      await tx.termVersionTranslation.update({
        where: {
          termVersionId_languageId: {
            termVersionId: termVersionId,
            languageId: 1, // Assuming 1 is LV
          },
        },
        data: {
          name: translations.lv.name,
          description: translations.lv.description,
        },
      });

      // 3. Update EN translation (assuming languageId 2 is EN)
      await tx.termVersionTranslation.update({
        where: {
          termVersionId_languageId: {
            termVersionId: termVersionId,
            languageId: 2, // Assuming 2 is EN
          },
        },
        data: {
          name: translations.en.name,
          description: translations.en.description,
        },
      });

      // TODO: Add logic here to update category or labels if needed
    });

    // Revalidate paths where this term might appear
    revalidatePath('/admin/manage-terms');
    revalidatePath('/admin/pending-terms');
    // Potentially revalidate specific term pages if they exist

    return { success: true };

  } catch (error) {
    console.error('Error updating term version draft:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while updating the draft.' };
  }
}

// --- New Action to Create and Save a Draft from Source Data ---

interface CreateAndSaveNewTermVersionInput {
  sourceTermId: number; // The ID of the original Termini record
  translations: {
    lv: { name: string; description: string };
    en: { name: string; description: string };
  };
  // Add categoryId here if it can be changed during creation
  // categoryId?: number; 
}

export async function createAndSaveNewTermVersion(
  data: CreateAndSaveNewTermVersionInput
): Promise<{ success: boolean; error?: string; newVersionId?: number }> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized: Not logged in' };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return { success: false, error: 'Unauthorized: Admin privileges required' };
    }

    const { sourceTermId, translations } = data;

    // Validate input data
    if (!translations.lv.name || !translations.en.name) {
       return { success: false, error: 'Validation failed: Term name is required for both languages.' };
    }

    // Use transaction to ensure atomicity
    const newVersion = await prisma.$transaction(async (tx) => {
      // 1. Find the latest version number for this term
      const latestVersion = await tx.termVersion.findFirst({
        where: { termId: sourceTermId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      // 2. Create the new TermVersion record with the provided translations
      const createdVersion = await tx.termVersion.create({
        data: {
          termId: sourceTermId,
          status: 'DRAFT', // Always create as DRAFT
          versionNumber: nextVersionNumber,
          readyToPublish: false,
          translations: {
            createMany: {
              data: [
                { 
                  languageId: 1, // Assuming 1 is LV
                  name: translations.lv.name, 
                  description: translations.lv.description 
                },
                { 
                  languageId: 2, // Assuming 2 is EN
                  name: translations.en.name, 
                  description: translations.en.description 
                },
              ],
            },
          },
          // Add category update logic here if categoryId is passed in data
        },
      });

      return createdVersion;
    });

    // Revalidate paths where this term might appear
    revalidatePath('/admin/manage-terms');
    revalidatePath('/admin/pending-terms'); 

    return { success: true, newVersionId: newVersion.id };

  } catch (error) {
    console.error('Error creating new term version draft:', error);
    if (error instanceof Error) {
       return { success: false, error: error.message };
    }
    return { success: false, error: 'An unexpected error occurred while creating the draft.' };
  }
}
