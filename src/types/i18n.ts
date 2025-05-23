// Define standardized types for the application

export type Language = {
  id: number;
  code: string;
  name: string;
  isDefault?: boolean; // Optional as not always needed by all functions using this type
  isEnabled?: boolean; // Optional
};

export type TermTranslation = {
  languageId: number;
  name: string;
  description: string;
  language: {
    id: number;
    code: string;
    name: string;
    isDefault: boolean;
    isEnabled: boolean;
  };
};

export type TermVersion = {
  id: number;
  status: string;
  versionNumber: number;
  createdAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  termId: number;
  readyToPublish: boolean;
  translations: TermTranslation[];
};

export type CategoryTranslation = {
  name: string;
  languageId: number;
  categoryId: number;
  language?: {
    code: string;
    name: string;
  };
};

export type Category = {
  id: number;
  createdAt: Date;
  translations: CategoryTranslation[];
};

export type Term = {
  id: number;
  identifier: string;
  activeVersionId: number | null;
  categoryId: number;
  createdAt: Date;
  activeVersion: TermVersion | null;
  category: Category;
  isFavorited?: boolean;
};

export type FavoriteRecord = {
  id: number;
  termId: number;
  userId: number;
  createdAt: Date;
  term: Term;
};

// Additional type for the actual structure returned by getFavorites
export type FavoriteItem = {
  id: number;
  termId: number;
  userId: number;
  createdAt: Date;
  term: {
    id: number;
    identifier: string;
    activeVersionId: number;
    categoryId: number;
    createdAt: Date;
    activeVersion: {
      id: number;
      status: string;
      versionNumber: number;
      createdAt: Date;
      publishedAt: Date | null;
      archivedAt: Date | null;
      termId: number;
      readyToPublish: boolean;
      translations: TermTranslation[];
    } | null;
    category: {
      id: number;
      createdAt: Date;
      translations: CategoryTranslation[];
    };
  };
};

export type Comment = {
  id: number;
  content: string;
  createdAt: Date;
  isClosed: boolean;
  termId: number;
  userId: number;
  term: Term;
};

export type DashboardStats = {
  totalUsers: number;
  totalTerms: number;
  totalCategories: number;
  pendingComments: number;
  termsPendingApproval: number;
};
