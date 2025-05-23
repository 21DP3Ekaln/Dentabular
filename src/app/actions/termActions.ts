'use server'

import { prisma } from '@/lib/prisma'

export async function searchTerms(query: string, skip: number = 0) {
  const take = 15;
  
  if (!query.trim()) {
    const terms = await prisma.termini.findMany({
      where: {
        activeVersion: {
          status: "PUBLISHED",
          publishedAt: {
            not: null
          }
        }
      },
      take,
      skip,
      orderBy: {
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
        },
        labels: { // Added labels include
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
    });
    
    // Get total count for pagination
    const totalCount = await prisma.termini.count({
      where: {
        activeVersion: {
          status: "PUBLISHED",
          publishedAt: {
            not: null
          }
        }
      }
    });
    
    return {
      terms,
      hasMore: skip + take < totalCount
    };
  }
  // Convert query to lowercase to help with case-insensitive search
  const lowerQuery = query.trim().toLowerCase();
  
  // Split into words, filter out empty strings
  const words = lowerQuery.split(/\s+/).filter(Boolean);
  
  // Handle multiple words - each word must be present in at least one translation's name or description
  // This creates an AND condition for all words, where each word matches using LIKE '%word%' logic
  const searchConditions = words.map(word => {
    // For each word, normalize it to improve matching and escape special characters
    const normalizedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Already lowercased
    
    return {
      activeVersion: {
        translations: {
          some: {
            OR: [
              { name: { contains: normalizedWord } }, // Check name contains word (LIKE '%word%')
              { description: { contains: normalizedWord } } // Check description contains word (LIKE '%word%')
            ]
          }
        }
      }
    };
  });

  const whereClause = {
    AND: [
      { // Base condition: Published active version
        activeVersion: {
          status: "PUBLISHED",
          publishedAt: {
            not: null
          }
        }
      },
      // Add conditions for each search word
      ...(searchConditions.length > 0 ? searchConditions : [])
    ]
  };

  // For search, we need to find terms where the active version's translations contain ALL words
  // Fetch all matching terms first to sort them by title priority
  const allMatchingTerms = await prisma.termini.findMany({
    where: whereClause,
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
      },
      labels: { // Added labels include
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
  });
  
  // Sort terms to prioritize matches in the name field
  const sortedTerms = allMatchingTerms.sort((a, b) => {
    const aHasNameMatch = words.some(word =>
      a.activeVersion?.translations.some(t => t.name.toLowerCase().includes(word))
    );
    const bHasNameMatch = words.some(word =>
      b.activeVersion?.translations.some(t => t.name.toLowerCase().includes(word))
    );

    if (aHasNameMatch && !bHasNameMatch) {
      return -1; // a comes first (prioritize name matches)
    }
    if (!aHasNameMatch && bHasNameMatch) {
      return 1; // b comes first
    }
    // Optional: Add secondary sort criteria for ties (e.g., alphabetical by name, or by creation date)
    // For now, maintain original relative order for ties.
    return 0; 
  });

  // Apply pagination after sorting
  const paginatedTerms = sortedTerms.slice(skip, skip + take);

  // Calculate hasMore based on the total number of matched terms before slicing
  const totalCount = sortedTerms.length; 
  const hasMore = skip + take < totalCount;
  
  return {
    terms: paginatedTerms,
    hasMore: hasMore
  };
}

export async function getRecentTerms(skip: number = 0) {
  const take = 15;
  
  const terms = await prisma.termini.findMany({
    where: {
      activeVersion: {
        status: "PUBLISHED",
        publishedAt: {
          not: null
        }
      }
    },
    take,
    skip,
    orderBy: {
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
          translations: {
            include: {
              language: true
            }
          }
        }
      }
      // Note: Labels are not included here yet, but could be if recent terms also need them.
      // For now, focusing on searchTerms as per the immediate task.
    }
  });
  
  // Get total count for pagination
  const totalCount = await prisma.termini.count({
    where: {
      activeVersion: {
        status: "PUBLISHED",
        publishedAt: {
          not: null
        }
      }
    }
  });
  
  return {
    terms,
    hasMore: skip + take < totalCount
  };
}

export async function getTermsByCategory(categoryName: string, skip: number = 0) {
  const take = 15;
  
  // First find the category by its name (checking in any language)
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
    return {
      terms: [],
      hasMore: false
    };
  }
  
  const terms = await prisma.termini.findMany({
    where: {
      categoryId: category.id,
      activeVersion: {
        status: "PUBLISHED",
        publishedAt: {
          not: null
        }
      }
    },
    take,
    skip,
    orderBy: {
      createdAt: 'asc'
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
      // Note: Labels are not included here yet.
    }
  });
  
  // Get total count for pagination
  const totalCount = await prisma.termini.count({
    where: {
      categoryId: category.id,
      activeVersion: {
        status: "PUBLISHED",
        publishedAt: {
          not: null
        }
      }
    }
  });
  
  return {
    terms,
    hasMore: skip + take < totalCount
  };
}

export async function getAllCategories() {
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
  });
  
  return categories;
}
