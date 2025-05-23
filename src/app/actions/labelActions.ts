"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getLanguages as getEnabledLanguages } from "@/lib/i18n-utils"; // Renamed for clarity
import type { Language as LanguageType } from "@/types/i18n"; // Renamed for clarity
import { auth } from '@/auth'; // For authentication

// Type for label data returned for management, including translations and language info
export type LabelForManagement = Prisma.LabelGetPayload<{
  include: {
    translations: {
      include: {
        language: true;
      };
    };
    _count: { // To count how many terms use this label
      select: { terms: true };
    };
  };
}>;

export interface CreateLabelFormState {
  success: boolean;
  message: string;
  errors?: {
    translations?: {
      [languageCode: string]: string | undefined; // languageCode maps to an error message for its name
    };
    general?: string[];
  };
}

interface TranslationInput {
  languageCode: string;
  name: string;
}

export async function createLabel(
  prevState: CreateLabelFormState,
  formData: FormData
): Promise<CreateLabelFormState> {
  const languagesResult = await getEnabledLanguages();
  if (!languagesResult.success) {
    return { success: false, message: languagesResult.error || "Failed to load languages." };
  }
  const availableLanguages: Pick<LanguageType, 'id' | 'code' | 'name'>[] = languagesResult.languages;

  const submittedTranslations: TranslationInput[] = [];
  const formErrors: NonNullable<CreateLabelFormState["errors"]> = { translations: {} };
  let hasErrors = false;

  // Admin check (example, adapt as per your auth setup)
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, message: "Authentication required." };
  }
  const adminUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { isAdmin: true } });
  if (!adminUser?.isAdmin) {
    return { success: false, message: "Admin privileges required." };
  }

  availableLanguages.forEach((lang: Pick<LanguageType, 'id' | 'code' | 'name'>) => {
    const name = formData.get(`translations.${lang.code}.name`) as string;
    // Only consider it a submitted translation if a name was provided and is not empty
    if (name !== null && name.trim() !== "") {
      submittedTranslations.push({ languageCode: lang.code, name: name.trim() });
    } else if (name !== null && name.trim() === "" && formData.has(`translations.${lang.code}.name`)) {
      // If the field was present but explicitly empty after trim, it's an error
      formErrors.translations![lang.code] = "Label name cannot be empty.";
      hasErrors = true;
    }
  });

  // General validation: at least one non-empty translation must be provided
  if (submittedTranslations.length === 0) {
    // If specific language fields were submitted but empty, hasErrors would be true.
    // This case handles if no fields were submitted at all or all submitted were whitespace.
    if (!hasErrors) { // Only show this general error if no specific field errors were caught
        formErrors.general = ["At least one language for the label must be provided with a non-empty name."];
        hasErrors = true;
    }
  }

  if (hasErrors) {
    return {
      success: false,
      message: "Validation failed. Please check the fields.",
      errors: formErrors,
    };
  }

  try {
    await prisma.label.create({
      data: {
        translations: {
          create: submittedTranslations.map((t: TranslationInput) => {
            const lang = availableLanguages.find((l: Pick<LanguageType, 'id' | 'code' | 'name'>) => l.code === t.languageCode);
            if (!lang) {
              // This should not happen if availableLanguages is correctly populated
              // and form names are based on these languages.
              throw new Error(`Invalid language code encountered: ${t.languageCode}`);
            }
            return {
              name: t.name,
              languageId: lang.id,
            };
          }),
        },
      },
    });

    // It's good practice to revalidate paths that display this data.
    // Assuming you'll have a page at /admin/labels or similar.
    // The path should be the Next.js route, not the file system path.
    revalidatePath("/[locale]/admin/labels", "layout");
    revalidatePath("/[locale]/admin", "layout"); // Revalidate admin dashboard if it shows labels or counts

    return {
      success: true,
      message: "Label created successfully.",
    };
  } catch (e: unknown) { // Catch unknown error type
    console.error("Failed to create label:", e);
    let errorMessage = "Failed to create label due to a server error.";
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma errors, e.g., unique constraint violation
      // P2002 is for unique constraint failures.
      // This might happen if you have a unique constraint on label name + languageId.
      if (e.code === 'P2002') {
        errorMessage = "A label with this name for one of the languages might already exist.";
      }
    } else if (e instanceof Error) {
      errorMessage = e.message;
    }
    return {
      success: false,
      message: errorMessage,
      errors: { general: [errorMessage] }
    };
  }
}

// Fetch labels with pagination and search
interface GetLabelsParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
}

export async function getLabels({
  page = 1,
  pageSize = 10,
  searchQuery = "",
}: GetLabelsParams): Promise<{
  labels: LabelForManagement[];
  totalCount: number;
  totalPages: number;
  error?: string;
}> {
  try {
    const skip = (page - 1) * pageSize;
    const whereClause: Prisma.LabelWhereInput = {};

    if (searchQuery.trim()) {
      whereClause.translations = {
        some: {
          name: {
            contains: searchQuery.trim(),
            // mode: 'insensitive', // Removed: Not supported by SQLite StringFilter via Prisma
          },
        },
      };
    }

    const labels = await prisma.label.findMany({
      where: whereClause,
      include: {
        translations: {
          include: {
            language: true,
          },
          orderBy: { // Consistently order translations, e.g., by language ID or code
            language: { code : 'asc'}
          }
        },
        _count: {
          select: { terms: true },
        },
      },
      orderBy: {
        id: 'asc', // Or by name in a default language if preferred
      },
      skip: skip,
      take: pageSize,
    });

    const totalCount = await prisma.label.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / pageSize);

    return { labels, totalCount, totalPages };
  } catch (error) {
    console.error('Error fetching labels:', error);
    return {
      labels: [],
      totalCount: 0,
      totalPages: 0,
      error: 'Failed to fetch labels.',
    };
  }
}

// Update an existing label's translations
export interface UpdateLabelFormState {
  success: boolean;
  message: string;
  errors?: {
    translations?: { [languageCode: string]: string | undefined };
    general?: string[];
  };
}
export async function updateLabel(
  labelId: number,
  prevState: UpdateLabelFormState,
  formData: FormData
): Promise<UpdateLabelFormState> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, message: "Authentication required." };
  const adminUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { isAdmin: true } });
  if (!adminUser?.isAdmin) return { success: false, message: "Admin privileges required." };

  const languagesResult = await getEnabledLanguages();
  if (!languagesResult.success) {
    return { success: false, message: languagesResult.error || "Failed to load languages for update." };
  }
  const availableLanguages: Pick<LanguageType, 'id' | 'code' | 'name'>[] = languagesResult.languages;

  const submittedTranslations: TranslationInput[] = [];
  const formErrors: NonNullable<UpdateLabelFormState["errors"]> = { translations: {} };
  let hasErrors = false;

  availableLanguages.forEach((lang: Pick<LanguageType, 'id' | 'code' | 'name'>) => {
    const name = formData.get(`translations.${lang.code}.name`) as string | null;
    if (name !== null && name.trim() !== "") {
      submittedTranslations.push({ languageCode: lang.code, name: name.trim() });
    } else if (name !== null && name.trim() === "" && formData.has(`translations.${lang.code}.name`)) {
      formErrors.translations![lang.code] = "Label name cannot be empty.";
      hasErrors = true;
    }
  });

  if (submittedTranslations.length === 0) {
     if (!hasErrors) {
        formErrors.general = ["At least one language for the label must be provided with a non-empty name."];
        hasErrors = true;
    }
  }

  if (hasErrors) {
    return { success: false, message: "Validation failed.", errors: formErrors };
  }

  try {
    const existingLabel = await prisma.label.findUnique({
      where: { id: labelId },
      include: { translations: true },
    });
    if (!existingLabel) return { success: false, message: "Label not found." };

    await prisma.$transaction(async (tx) => {
      for (const subTrans of submittedTranslations) {
        const lang = availableLanguages.find((l: Pick<LanguageType, 'id' | 'code' | 'name'>) => l.code === subTrans.languageCode);
        if (!lang) continue; // Should not happen

        const existingDbTrans = existingLabel.translations.find(dbTrans => dbTrans.languageId === lang.id);
        if (existingDbTrans) {
          if (existingDbTrans.name !== subTrans.name) {
            await tx.labelTranslation.update({
              where: { labelId_languageId: { labelId: labelId, languageId: lang.id } },
              data: { name: subTrans.name },
            });
          }
        } else {
          await tx.labelTranslation.create({
            data: { labelId: labelId, languageId: lang.id, name: subTrans.name },
          });
        }
      }
      // Potentially delete translations for languages not submitted, if that's desired behavior
    });

    revalidatePath("/admin/manage-labels", "page"); // Assuming this will be the path
    revalidatePath("/[locale]/admin/manage-labels", "layout");


    return { success: true, message: "Label updated successfully." };
  } catch (e: unknown) {
    console.error("Failed to update label:", e);
    let errorMessage = "Failed to update label due to a server error.";
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      errorMessage = "A label with this name for one of the languages might already exist.";
    } else if (e instanceof Error) {
      errorMessage = e.message;
    }
    return { success: false, message: errorMessage, errors: { general: [errorMessage] } };
  }
}

// Delete a label
export async function deleteLabel(labelId: number): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, message: "Authentication required." };
  const adminUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { isAdmin: true } });
  if (!adminUser?.isAdmin) return { success: false, message: "Admin privileges required." };

  try {
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { _count: { select: { terms: true } } },
    });

    if (!label) return { success: false, message: "Label not found." };
    if (label._count.terms > 0) {
      return { success: false, message: `Cannot delete label: it is used by ${label._count.terms} term(s).` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.labelTranslation.deleteMany({ where: { labelId: labelId } });
      await tx.label.delete({ where: { id: labelId } });
    });

    revalidatePath("/admin/manage-labels", "page");
    revalidatePath("/[locale]/admin/manage-labels", "layout");

    return { success: true, message: "Label deleted successfully." };
  } catch (e: unknown) {
    console.error("Failed to delete label:", e);
    let errorMessage = "Failed to delete label due to a server error.";
    if (e instanceof Error) errorMessage = e.message;
    return { success: false, message: errorMessage };
  }
}

export async function getLabelsCount(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const count = await prisma.label.count();
    return { success: true, count };
  } catch (error) {
    console.error('Error fetching labels count:', error);
    return { success: false, error: 'Failed to fetch labels count.' };
  }
}

// --- New Actions for Term-Label Management ---

// Type for labels returned for selection (ID and translated name)
export type LabelForSelect = {
  id: number;
  name: string;
};

// Fetch all labels with translation for a specific locale
export async function getAllLabelsForSelect(locale: string): Promise<{ labels: LabelForSelect[]; error?: string }> {
  try {
    const languagesResult = await getEnabledLanguages();
    if (!languagesResult.success) {
      return { labels: [], error: languagesResult.error || "Failed to load languages." };
    }
    const targetLanguage = languagesResult.languages.find(l => l.code === locale);
    if (!targetLanguage) {
      return { labels: [], error: `Language '${locale}' not found or not enabled.` };
    }

    const labels = await prisma.label.findMany({
      include: {
        translations: {
          where: { languageId: targetLanguage.id },
        },
      },
      orderBy: {
        // Order by name in the target locale if possible, otherwise by ID
        translations: { _count: 'desc' } // Placeholder, actual ordering needs refinement if sorting by name
      }
    });

    // Map to the desired format, prioritizing the target locale's translation
    const formattedLabels = labels.map(label => {
      const translation = label.translations.find(t => t.languageId === targetLanguage.id);
      // Fallback logic if translation for the target locale is missing (should ideally not happen if required)
      const fallbackTranslation = label.translations[0];
      return {
        id: label.id,
        name: translation?.name || fallbackTranslation?.name || `Label ${label.id}` // Provide a fallback name
      };
    }).sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

    return { labels: formattedLabels };

  } catch (error) {
    console.error('Error fetching labels for select:', error);
    return { labels: [], error: 'Failed to fetch labels.' };
  }
}

// Add a label to a term
export async function addLabelToTerm(termId: number, labelId: number): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Authentication required." };
  const adminUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { isAdmin: true } });
  if (!adminUser?.isAdmin) return { success: false, error: "Admin privileges required." };

  try {
    // Check if the association already exists
    const existing = await prisma.terminiLabel.findUnique({
      where: { termId_labelId: { termId, labelId } },
    });

    if (existing) {
      // Optionally return success if it already exists, or a specific message
      return { success: true }; // Idempotent: already added
    }

    await prisma.terminiLabel.create({
      data: {
        termId: termId,
        labelId: labelId,
      },
    });

    revalidatePath('/admin/manage-terms'); // Revalidate the terms list
    // Potentially revalidate other paths where term labels are shown

    return { success: true };
  } catch (error) {
    console.error(`Error adding label ${labelId} to term ${termId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific errors like foreign key constraint failures (P2003)
      if (error.code === 'P2003') {
        return { success: false, error: 'Invalid term or label ID provided.' };
      }
    }
    return { success: false, error: 'Failed to add label to term.' };
  }
}

// Remove a label from a term
export async function removeLabelFromTerm(termId: number, labelId: number): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Authentication required." };
  const adminUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { isAdmin: true } });
  if (!adminUser?.isAdmin) return { success: false, error: "Admin privileges required." };

  try {
    await prisma.terminiLabel.delete({
      where: {
        termId_labelId: {
          termId: termId,
          labelId: labelId,
        },
      },
    });

    revalidatePath('/admin/manage-terms'); // Revalidate the terms list
    // Potentially revalidate other paths

    return { success: true };
  } catch (error) {
    console.error(`Error removing label ${labelId} from term ${termId}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record to delete not found - consider this success (idempotent)
      if (error.code === 'P2025') {
        return { success: true }; // Already removed or never existed
      }
    }
    return { success: false, error: 'Failed to remove label from term.' };
  }
}
