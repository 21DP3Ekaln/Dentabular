# Terminology System Migration Diagram

## High-Level Migration Flow

```mermaid
graph TD
    A[Start Migration] --> B[Database Schema Implementation]
    B --> C[Backend Services Implementation]
    C --> D[UI Implementation]
    D --> E[Migration Complete]
    
    subgraph "1. Database Schema"
        B1[Create New Models] --> B2[Update Existing Models]
        B2 --> B3[Remove Deprecated Models]
    end
    
    subgraph "2. Backend Services"
        C1[Core Services] --> C2[Action Functions]
        C2 --> C3[Auth & User Management]
    end
    
    subgraph "3. UI Implementation"
        D1[Core Components] --> D2[Admin Interface]
        D2 --> D3[User Features]
        D3 --> D4[Main Pages]
    end
    
    B --> C1
    C --> D1
```

## Detailed Schema Changes

```mermaid
erDiagram
    Language ||--o{ TermVersionTranslation : "used in"
    Language ||--o{ CategoryTranslation : "used in"
    Language ||--o{ LabelTranslation : "used in"
    
    Category ||--o{ Term : "categorizes"
    Category ||--o{ CategoryTranslation : "has translations"
    CategoryTranslation }o--|| Language : "in language"
    
    Label ||--o{ LabelTranslation : "has translations"
    LabelTranslation }o--|| Language : "in language"
    
    Term ||--o{ TermVersion : "has versions"
    Term ||--o| TermVersion : "has active version"
    Term ||--o{ Comment : "has comments"
    Term ||--o{ Favorite : "favorited by"
    Term }|--o{ TermLabel : "has"
    
    TermVersion ||--o{ TermVersionTranslation : "has translations"
    TermVersionTranslation }o--|| Language : "in language"
    
    Label }|--o{ TermLabel : "applied to"
    Comment ||--o{ Comment : "has replies"
    
    User ||--o{ Comment : "creates"
    User ||--o{ Favorite : "adds"
```

## Component Dependencies

```mermaid
flowchart TD
    subgraph "Data Models"
        Language
        Category
        CategoryTranslation
        Label
        LabelTranslation
        Term
        TermVersion
        TermVersionTranslation
        TermLabel
        User
        Comment
        Favorite
    end

    subgraph "Services"
        LanguageService --> Language
        CategoryService --> Category
        CategoryService --> CategoryTranslation
        LabelService --> Label
        LabelService --> LabelTranslation
        TermService --> Term
        TermService --> TermVersion
        TermService --> TermVersionTranslation
        TermService --> TermLabel
    end

    subgraph "Actions"
        TermActions --> TermService
        CommentActions --> Comment
        FavoriteActions --> Favorite
        UserPreferenceActions --> User
    end

    subgraph "UI Components"
        LanguageSelector --> LanguageService
        CategoryNavigator --> CategoryService
        LabelNavigator --> LabelService
        TermCard --> TermService
        TermCard --> LanguageService
        TermsDisplay --> TermCard
    end

    subgraph "Pages"
        HomePage --> TermsDisplay
        CategoryPage --> CategoryNavigator
        CategoryPage --> TermsDisplay
        AdminTermsPage --> TermActions
        AdminCategoriesPage --> CategoryService
        AdminLabelsPage --> LabelService
        ProfilePage --> UserPreferenceActions
    end