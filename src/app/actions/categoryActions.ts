'use server'

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// Type for the returned category data including specific translations with language
export type CategoryForFilter = Prisma.CategoryGetPayload<{
  include: {
    translations: { // Mirror the include structure from the query
      include: {
        language: true;
      }
    };
  };
}>;

// Server action to get all categories with their translations
export async function getAllCategoriesWithTranslations(): Promise<{ categories: CategoryForFilter[]; error?: string }> {
  try {
    const categories = await prisma.category.findMany({
      include: {
        translations: {
          include: {
            language: true, // Include language info if needed, e.g., for display
          },
        },
      },
      orderBy: {
        // Optional: Order categories alphabetically based on a default language?
        // This requires a more complex query or sorting after fetching.
        // For simplicity, ordering by ID for now.
        id: 'asc',
      },
    });
    return { categories };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { categories: [], error: 'Failed to fetch categories.' };
  }
}

export async function searchTermsInCategory(categoryName: string, query: string, skip: number = 0) {
  const take = 15;

  // 1. Find the category by its name
  const category = await prisma.category.findFirst({
    where: {
      translations: {
        some: {
          name: categoryName
        }
      }
    }
  });

  if (!category) {
    console.warn(`Category not found: ${categoryName}`);
    return {
      terms: [],
      hasMore: false
    };
  }

  // 2. Prepare base WHERE clause for the category and published status
  const baseWhereClause = {
    categoryId: category.id,
    activeVersion: {
      status: "PUBLISHED",
      publishedAt: {
        not: null
      }
    }
  };

  // 3. Prepare search conditions if a query exists
  let searchWhereClause = {};
  if (query.trim()) {
    // Convert query to lowercase to help with case-insensitive search
    const lowerQuery = query.trim().toLowerCase();
    // Split into words, filter out empty strings
    const words = lowerQuery.split(/\s+/).filter(Boolean);
    
    // Handle multiple words - each word can be in any language or field
    // This creates an AND condition for all words, but each word can match any field
    const searchConditions = words.map(word => {
      // For each word, normalize it to improve matching and escape special characters
      const normalizedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      return {
        OR: [
          // Check each field with multiple approaches for better matching
          {
            activeVersion: {
              translations: {
                some: {
                  OR: [
                    // Try exact word (with word boundaries on either side)
                    { name: { contains: ` ${normalizedWord} ` } },
                    { description: { contains: ` ${normalizedWord} ` } },
                    // Try word at start of text
                    { name: { startsWith: normalizedWord } },
                    { description: { startsWith: normalizedWord } },
                    // Try word at end of text
                    { name: { endsWith: normalizedWord } },
                    { description: { endsWith: normalizedWord } },
                    // Try word anywhere in text as fallback
                    { name: { contains: normalizedWord } },
                    { description: { contains: normalizedWord } }
                  ]
                }
              }
            }
          }
        ]
      };
    });
    
    // If we have valid search conditions, create an AND clause to find all words
    if (searchConditions.length > 0) {
      searchWhereClause = { AND: searchConditions };
    }
  }
  // 4. Combine base and search conditions
  const finalWhereClause = query.trim() 
    ? {
        AND: [
          baseWhereClause,
          searchWhereClause
        ]
      }
    : baseWhereClause; // If no query, just use the base condition

  // 5. Fetch terms with all their translations
  const terms = await prisma.termini.findMany({
    where: finalWhereClause,
    take,
    skip,
    orderBy: {
      // Default ordering by creation date
      createdAt: 'desc' 
    },
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
          translations: true
        }
      }
    }
  });

  // 6. Get total count for pagination
  const totalCount = await prisma.termini.count({
    where: finalWhereClause
  });

  return {
    terms,
    hasMore: skip + take < totalCount
  };
}

// Action to get all available languages
export async function getLanguages() {
  try {
    const languages = await prisma.language.findMany({
      where: {
        isEnabled: true
      },
      orderBy: [
        { isDefault: 'desc' }, // Default language first
        { id: 'asc' }          // Then by ID
      ]
    });
    
    return {
      success: true,
      languages
    };
  } catch (error) {
    console.error('Error fetching languages:', error);
    return {
      success: false,
      error: 'Failed to fetch languages',
      languages: []
    };
  }
}

// Create a new category with translations
export async function createCategory(translations: Record<string, string>) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: "You must be logged in to perform this action" 
      };
    }
    
    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true }
    });
    
    if (!user?.isAdmin) {
      return { 
        success: false, 
        error: "You don't have permission to perform this action" 
      };
    }

    // Fetch language IDs for validation
    const languages = await prisma.language.findMany({
      where: { code: { in: ['lv', 'en'] } },
      select: { id: true, code: true, name: true } // Select name for error messages
    });
    const lvLang = languages.find(l => l.code === 'lv');
    const enLang = languages.find(l => l.code === 'en');

    if (!lvLang || !enLang) {
      // This should ideally not happen if languages are seeded correctly
      console.error("Could not find Latvian or English language IDs in the database.");
      return {
        success: false,
        error: "Required language configuration is missing. Please contact support."
      };
    }

    // Validate input - Both Latvian and English names must be provided and non-empty
    const lvName = translations[lvLang.id.toString()]?.trim();
    const enName = translations[enLang.id.toString()]?.trim();

    if (!lvName) {
      return {
        success: false,
        error: `Category name in Latvian is required.` // Consider using i18n for error messages
      };
    }
    if (!enName) {
      return {
        success: false,
        error: `Category name in English is required.` // Consider using i18n for error messages
      };
    }
    
    // Create category with translations in a transaction
    const category = await prisma.$transaction(async (tx) => {
      // 1. Create the category
      const newCategory = await tx.category.create({
        data: {}  // Just create the category, translations added in next step
      });
      
      // 2. Create translations for each language
      const translationPromises = Object.entries(translations).map(([langId, name]) => {
        return tx.categoryTranslation.create({
          data: {
            categoryId: newCategory.id,
            languageId: parseInt(langId),
            name: name.trim()
          }
        });
      });
      
      await Promise.all(translationPromises);
      
      // 3. Return the complete category with its translations
      return tx.category.findUnique({
        where: { id: newCategory.id },
        include: {
          translations: {
            include: {
              language: true
            }
          }
        }
      });
    });
    
    // Revalidate paths where categories are displayed
    revalidatePath('/admin/categories');
    revalidatePath('/categories');
    
    return {
      success: true,
      category
    };
  } catch (error) {
    console.error('Error creating category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

// Update an existing category
export async function updateCategory(categoryId: number, translations: Record<string, string>) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: "You must be logged in to perform this action" 
      };
    }
    
    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true }
    });
    
    if (!user?.isAdmin) {
      return { 
        success: false, 
        error: "You don't have permission to perform this action" 
      };
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { translations: true }
    });

    if (!existingCategory) {
      return {
        success: false,
        error: `Category with ID ${categoryId} not found`
      };
    }

    // Validate required translations for Latvian and English
    const languages = await prisma.language.findMany({
      where: { code: { in: ['lv', 'en'] } },
      select: { id: true, code: true, name: true }
    });
    
    const lvLang = languages.find(l => l.code === 'lv');
    const enLang = languages.find(l => l.code === 'en');

    if (!lvLang || !enLang) {
      console.error("Could not find Latvian or English language IDs in the database.");
      return {
        success: false,
        error: "Required language configuration is missing."
      };
    }

    const lvName = translations[lvLang.id.toString()]?.trim();
    const enName = translations[enLang.id.toString()]?.trim();

    if (!lvName) {
      return {
        success: false,
        error: `Category name in Latvian is required.`
      };
    }
    if (!enName) {
      return {
        success: false,
        error: `Category name in English is required.`
      };
    }

    // Update translations in a transaction
    await prisma.$transaction(async (tx) => {
      // Update each translation
      for (const [langId, name] of Object.entries(translations)) {
        // Skip empty translations (except for required languages which were already checked)
        if (!name.trim()) continue;
        
        const languageId = parseInt(langId);
        const existingTranslation = existingCategory.translations.find(
          t => t.languageId === languageId
        );

        if (existingTranslation) {
          // Update existing translation
          await tx.categoryTranslation.update({
            where: {
              categoryId_languageId: {
                categoryId: categoryId,
                languageId: languageId
              }
            },
            data: { name: name.trim() }
          });
        } else {
          // Create new translation if it doesn't exist
          await tx.categoryTranslation.create({
            data: {
              categoryId: categoryId,
              languageId: languageId,
              name: name.trim()
            }
          });
        }
      }
    });

    // Revalidate paths
    revalidatePath('/admin/categories');
    revalidatePath('/categories');

    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

// Delete a category
export async function deleteCategory(categoryId: number) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return { 
        success: false, 
        error: "You must be logged in to perform this action" 
      };
    }
    
    // Check admin permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true }
    });
    
    if (!user?.isAdmin) {
      return { 
        success: false, 
        error: "You don't have permission to perform this action" 
      };
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { terms: true }
    });

    if (!category) {
      return {
        success: false,
        error: `Category with ID ${categoryId} not found`
      };
    }

    // Check if category has terms
    if (category.terms.length > 0) {
      return {
        success: false,
        error: `Cannot delete category: it contains ${category.terms.length} terms. Please reassign or delete these terms first.`
      };
    }

    // Delete category and its translations
    await prisma.$transaction(async (tx) => {
      // Delete all translations first
      await tx.categoryTranslation.deleteMany({
        where: { categoryId: categoryId }
      });

      // Then delete the category
      await tx.category.delete({
        where: { id: categoryId }
      });
    });

    // Revalidate paths
    revalidatePath('/admin/categories');
    revalidatePath('/categories');

    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
