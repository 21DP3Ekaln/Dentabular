import { readFileSync } from 'fs';
import { parseStringPromise } from 'xml2js';
import { prisma } from './prisma';
import { Language } from '@prisma/client';

interface XmlTerm {
  category: string[];
  lv_name: string[];
  lv_description: string[];
  eng_name: string[];
  eng_description: string[];
}

interface LanguageResult {
  lv: Language;
  en: Language;
}

// Cache for categories to avoid repeated database lookups
const categoryCache = new Map<string, number>();

async function main() {
  console.log('Starting import process...');
  
  // Setup languages
  const languages = await setupLanguages();
  
  // Read and parse the XML file
  console.log('Reading XML file...');
  const xmlData = readFileSync('./doc/termini.xml', 'utf-8');
  const result = await parseStringPromise(xmlData);

  // Get all terms from XML
  const terms = result.dental_terms.term as XmlTerm[];
  console.log(`Found ${terms.length} terms to import.`);
  
  // First pass: collect all unique categories
  const uniqueCategories = new Set<string>();
  for (const term of terms) {
    if (term.category && term.category[0]) {
      uniqueCategories.add(term.category[0]);
    }
  }
  
  console.log(`Found ${uniqueCategories.size} unique categories`);
  
  // Create all categories first
  for (const categoryName of uniqueCategories) {
    await getOrCreateCategory(categoryName, languages);
  }
  
  // Import terms with proper category assignment
  let successCount = 0;
  for (const [index, xmlTerm] of terms.entries()) {
    try {
      await importTerm(xmlTerm, languages, index);
      successCount++;
      
      if ((index + 1) % 10 === 0) {
        console.log(`Imported ${index + 1}/${terms.length} terms...`);
      }
    } catch (error) {
      console.error(`Error importing term at index ${index}:`, error);
    }
  }
  
  console.log(`Successfully imported ${successCount}/${terms.length} terms`);
}

async function setupLanguages(): Promise<LanguageResult> {
  // Create or find Latvian language
  let lvLanguage = await prisma.language.findFirst({ where: { code: 'lv' } });
  if (!lvLanguage) {
    lvLanguage = await prisma.language.create({
      data: {
        code: 'lv',
        name: 'Latvian',
        isDefault: true,
        isEnabled: true
      }
    });
    console.log('Created Latvian language');
  }
  
  // Create or find English language
  let enLanguage = await prisma.language.findFirst({ where: { code: 'en' } });
  if (!enLanguage) {
    enLanguage = await prisma.language.create({
      data: {
        code: 'en',
        name: 'English',
        isDefault: false,
        isEnabled: true
      }
    });
    console.log('Created English language');
  }
  
  return { lv: lvLanguage, en: enLanguage };
}

async function getOrCreateCategory(categoryName: string, languages: LanguageResult): Promise<number> {
  // Check cache first
  if (categoryCache.has(categoryName)) {
    return categoryCache.get(categoryName)!;
  }
  
  // Look for existing category with this name (in Latvian)
  const existingCategory = await prisma.categoryTranslation.findFirst({
    where: {
      languageId: languages.lv.id,
      name: categoryName
    },
    include: {
      category: true
    }
  });
  
  if (existingCategory) {
    categoryCache.set(categoryName, existingCategory.category.id);
    return existingCategory.category.id;
  }
  
  // Create new category with translations
  const newCategory = await prisma.category.create({
    data: {
      translations: {
        create: [
          {
            languageId: languages.lv.id,
            name: categoryName
          },
          {
            languageId: languages.en.id,
            name: categoryName // Using same name for English - you might want to translate this
          }
        ]
      }
    }
  });
  
  console.log(`Created new category: ${categoryName} with ID ${newCategory.id}`);
  categoryCache.set(categoryName, newCategory.id);
  return newCategory.id;
}

async function importTerm(xmlTerm: XmlTerm, languages: LanguageResult, index: number) {
  // Get category ID (default to a general category if no category specified)
  const categoryName = xmlTerm.category && xmlTerm.category[0] 
    ? xmlTerm.category[0] 
    : 'VISPĀRĪGI';
  
  const categoryId = await getOrCreateCategory(categoryName, languages);
  
  // Create a unique identifier for the term
  const identifier = `term_${index}_${Date.now()}`;
  
  // Use a transaction to ensure all related records are created
  return await prisma.$transaction(async (tx) => {
    // Create the term
    const term = await tx.termini.create({
      data: {
        identifier,
        categoryId,
      }
    });
    
    // Create the version
    const termVersion = await tx.termVersion.create({
      data: {
        termId: term.id,
        status: 'PUBLISHED',
        versionNumber: 1,
        readyToPublish: true,
        publishedAt: new Date(),
        translations: {
          create: [
            {
              languageId: languages.lv.id,
              name: xmlTerm.lv_name[0] || '',
              description: xmlTerm.lv_description[0] || ''
            },
            {
              languageId: languages.en.id,
              name: xmlTerm.eng_name[0] || '',
              description: xmlTerm.eng_description[0] || ''
            }
          ]
        }
      }
    });
    
    // Set the active version
    await tx.termini.update({
      where: { id: term.id },
      data: { activeVersionId: termVersion.id }
    });
    
    return term;
  });
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed');
  });
