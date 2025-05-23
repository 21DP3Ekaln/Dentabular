'use client';

import { useState, useEffect, useTransition, useCallback, Fragment } from 'react'; // Added Fragment
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getManagedTermVersions,
  ManagedTermVersion,
  TermStatus,
  deleteTermVersion,
} from '@/app/actions/manage_termsActions';
import {
  getAllCategoriesWithTranslations,
  CategoryForFilter,
} from '@/app/actions/categoryActions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  TagIcon, // Added for labels button
} from '@heroicons/react/24/outline';
import LocaleLink from '@/app/components/LocaleLink';
import ManageTermLabelsModal from './ManageTermLabelsModal'; // Import the new modal

// Define props if needed, e.g., initial data or locale
interface ManageTermsClientProps {
  locale: string;
}

export default function ManageTermsClient({ locale }: ManageTermsClientProps) {
  const t = useTranslations('AdminManageTerms');
  const tCommon = useTranslations('common'); // Corrected to lowercase 'common'
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isTransitionPending, startTransition] = useTransition(); // Renamed to avoid conflict

  // State for fetched terms and total count
  const [terms, setTerms] = useState<ManagedTermVersion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // Use isLoading state
  const [termsError, setTermsError] = useState<string | null>(null);

  // State for categories
  const [categories, setCategories] = useState<CategoryForFilter[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // State for filters and pagination based on URL search params
  const [currentStatus, setCurrentStatus] = useState<TermStatus>(
    (searchParams?.get('status') as TermStatus) ?? 'PUBLISHED'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('query') ?? '');
  const [categoryId, setCategoryId] = useState<number | undefined>(
    searchParams?.get('category') ? Number(searchParams.get('category')) : undefined
  );
  const [currentPage, setCurrentPage] = useState(
    searchParams?.get('page') ? Number(searchParams.get('page')) : 1
  );
  const pageSize = 10; // Or make this configurable

  // State for notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for deletion modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTermVersionId, setDeletingTermVersionId] = useState<number | null>(null);
  const [deletingTermName, setDeletingTermName] = useState<string>('');

  // State for the label management modal
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ManagedTermVersion | null>(null);


  // Function to fetch terms data
  const fetchTerms = useCallback(() => {
    setIsLoading(true);
    setTermsError(null);
    startTransition(async () => {
      try {
        const result = await getManagedTermVersions({
          status: currentStatus,
          query: searchQuery || undefined,
          categoryId: categoryId,
          page: currentPage,
          pageSize: pageSize,
        });

        if (result.error) {
          setTermsError(result.error);
          setTerms([]);
          setTotalCount(0);
        } else {
          setTerms(result.terms);
          setTotalCount(result.totalCount);
        }
      } catch (err) {
        console.error('Client-side fetch error:', err);
        setTermsError(t('fetchError') || 'An unexpected error occurred.');
        setTerms([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    });
  }, [currentStatus, searchQuery, categoryId, currentPage, pageSize, t]);

  // Effect to fetch data when filters or page change
  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]); // Depends on the memoized fetchTerms

  // Effect to fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      setCategoriesError(null);
      try {
        const result = await getAllCategoriesWithTranslations();
        if (result.error) {
          setCategoriesError(result.error);
        } else {
          setCategories(result.categories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setCategoriesError(t('fetchCategoriesError') || 'Failed to load categories.');
      }
    }
    fetchCategories();
  }, [t]); // Run once on mount

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Function to update URL search params based on current state
  const updateURLSearchParams = useCallback((newParams: Partial<{ status: TermStatus, query: string, categoryId: number | undefined, page: number }>) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    let needsPageReset = false;

    // Update status
    if (newParams.status !== undefined && newParams.status !== currentStatus) {
        params.set('status', newParams.status);
        // Reset other filters and page when status changes
        params.delete('query');
        params.delete('category');
        needsPageReset = true;
    } else {
        params.set('status', currentStatus);
    }

    // Update query
    if (newParams.query !== undefined) {
        if (newParams.query) params.set('query', newParams.query); else params.delete('query');
        if (newParams.query !== searchQuery) needsPageReset = true;
    } else {
        if (searchQuery) params.set('query', searchQuery); else params.delete('query');
    }

    // Update categoryId
    if (newParams.categoryId !== undefined) {
        if (newParams.categoryId) params.set('category', newParams.categoryId.toString()); else params.delete('category');
        if (newParams.categoryId !== categoryId) needsPageReset = true;
    } else {
        if (categoryId) params.set('category', categoryId.toString()); else params.delete('category');
    }

    // Update page
    const targetPage = needsPageReset ? 1 : (newParams.page ?? currentPage);
    params.set('page', targetPage.toString());

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, currentStatus, searchQuery, categoryId, currentPage, router, pathname]); // Added useCallback wrapper and dependencies


  // Handlers for filter changes
  const handleStatusChange = (newStatus: TermStatus) => {
    setCurrentStatus(newStatus);
    setSearchQuery(''); // Clear search on status change
    setCategoryId(undefined); // Clear category on status change
    setCurrentPage(1); // Reset page
    updateURLSearchParams({ status: newStatus, query: '', categoryId: undefined, page: 1 });
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    // Trigger search immediately or on submit? Let's keep the submit button for now.
  };

  const handleSearchSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    setCurrentPage(1); // Reset page on new search
    updateURLSearchParams({ query: searchQuery, page: 1 });
  };

   const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    updateURLSearchParams({ query: '', page: 1 });
  };

  const handleCategoryChange = (newCategoryId: number | undefined) => {
    setCategoryId(newCategoryId);
    setCurrentPage(1); // Reset page on category change
    updateURLSearchParams({ categoryId: newCategoryId, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalCount / pageSize)) {
        setCurrentPage(newPage);
        updateURLSearchParams({ page: newPage });
    }
  };

  // Function to trigger data refetch (used after delete/create)
  const refetchTerms = useCallback(() => {
    setIsLoading(true);
    setTermsError(null);
    startTransition(async () => {
      try {
        const result = await getManagedTermVersions({
          status: currentStatus,
          query: searchQuery || undefined,
          categoryId: categoryId,
          page: currentPage, // Refetch current page
          pageSize: pageSize,
        });
        if (result.error) {
          setTermsError(result.error);
          setTerms([]);
          setTotalCount(0);
        } else {
          // Check if the current page becomes empty after deletion
          if (result.terms.length === 0 && currentPage > 1 && result.totalCount > 0) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            updateURLSearchParams({ page: prevPage }); // This will trigger the main useEffect again
          } else {
            setTerms(result.terms);
            setTotalCount(result.totalCount);
          }
        }
      } catch (err) {
        console.error('Client-side refetch error:', err);
        setTermsError(t('fetchError') || 'An unexpected error occurred.');
        setTerms([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    });
  }, [currentStatus, searchQuery, categoryId, currentPage, pageSize, t, updateURLSearchParams]);


  // Handler for initiating the creation of a new version draft
  const handleCreateNewVersion = (sourceVersionId: number) => {
    router.push(`/${locale}/admin/edit-term/${sourceVersionId}?mode=createFromSource`);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (termVersionId: number, termName: string) => {
    setDeletingTermVersionId(termVersionId);
    setDeletingTermName(termName || t('unnamedTerm'));
    setIsDeleteModalOpen(true);
  };

  // Confirm term version deletion
  const handleDeleteConfirm = async () => {
    if (deletingTermVersionId === null) return;

    const idToDelete = deletingTermVersionId; // Store ID before closing modal
    setIsDeleteModalOpen(false); // Close modal immediately

    startTransition(async () => {
      try {
        const result = await deleteTermVersion(idToDelete);
        if (result.error) {
          console.error("Failed to delete version:", result.error);
          setNotification({ type: 'error', message: t('deleteError', { error: result.error }) || `Error: ${result.error}` });
        } else {
          setNotification({ type: 'success', message: t('deleteSuccess') || 'Term version deleted successfully!' });
          refetchTerms(); // Refresh the list
        }
      } catch (err) {
        console.error("Error calling deleteTermVersion:", err);
        setNotification({ type: 'error', message: t('deleteUnexpectedError') || 'An unexpected error occurred while deleting.' });
      } finally {
        setDeletingTermVersionId(null);
        setDeletingTermName('');
      }
    });
  };

  // Handler to open the label management modal
  const handleManageLabelsClick = (termVersion: ManagedTermVersion) => {
    setEditingTerm(termVersion);
    setIsLabelModalOpen(true);
  };

  // Callback for when labels are updated in the modal
  const handleLabelsUpdated = () => {
    setIsLabelModalOpen(false); // Close the modal
    refetchTerms(); // Refresh the terms list
    // Optionally show a success notification here as well
    setNotification({ type: 'success', message: t('labelUpdateSuccess') || 'Labels updated successfully.' }); // TODO: Add translation key
  };

  const getStatusIcon = (status: TermStatus, className = "h-5 w-5") => {
    switch(status) {
      case 'PUBLISHED':
        return <CheckCircleIcon className={`${className} text-emerald-400`} />;
      case 'DRAFT':
        return <ClockIcon className={`${className} text-amber-400`} />;
      case 'ARCHIVED':
        return <ArchiveBoxIcon className={`${className} text-gray-400`} />;
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const indexOfFirstItem = (currentPage - 1) * pageSize;
  const indexOfLastItem = indexOfFirstItem + pageSize;
  // Note: We use the `terms` state directly as it's already the data for the current page

  return (
    <div className="w-full">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`mb-6 p-4 rounded-lg flex items-start justify-between shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-start">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={tCommon('closeNotification')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center">
           <h2 className="text-xl font-medium text-white flex items-center">
             <DocumentTextIcon className="h-5 w-5 mr-2 text-[#58a6ff]" /> {/* Changed Icon */}
             {t('manage_terms')}
           </h2>
           <button
             onClick={refetchTerms}
             className="ml-3 p-2 text-gray-400 hover:text-white bg-[#10142a]/40 rounded-full"
             disabled={isLoading || isTransitionPending}
             title={t('refresh')}
           >
             <ArrowPathIcon className={`h-5 w-5 ${(isLoading || isTransitionPending) ? 'animate-spin' : ''}`} />
           </button>
         </div>

        <div className="flex w-full sm:w-auto space-x-2">
          {/* Add New Term button */}
          <LocaleLink
            href="/admin/new-term"
            className="bg-[#58a6ff] hover:bg-[#4393e6] text-white px-4 py-2.5 rounded-lg flex items-center transition-colors"
          >
            <PlusCircleIcon className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">{t('add_new_term')}</span>
          </LocaleLink>
        </div>
      </div>


      {/* Filters Section - Styled like categories */}
      <div className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-lg border border-[#30364a] p-5 shadow-md mb-6">
        <div className="flex flex-col lg:flex-row gap-5 items-start lg:items-center">
          {/* Status Filter (Tabs) */}
          <div className="flex bg-[#10142a]/60 rounded-lg p-1 shadow-inner border border-[#30364a]">
            {(['PUBLISHED', 'DRAFT', 'ARCHIVED'] as TermStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`py-2 px-4 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${
                  currentStatus === status
                    ? 'bg-[#263354] text-[#58a6ff] shadow-md' // Active style
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#263354]/30' // Inactive style
                }`}
                disabled={isLoading || isTransitionPending}
              >
                {getStatusIcon(status, "h-4 w-4")} {/* Slightly smaller icon */}
                {t(status.toLowerCase()) || status}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full lg:w-auto flex-grow justify-end">
            {/* Category Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="category-filter"
                value={categoryId ?? ''}
                onChange={(e) => handleCategoryChange(e.target.value ? Number(e.target.value) : undefined)}
                className="bg-[#10142a]/60 border border-[#30364a] text-white text-sm rounded-lg focus:ring-[#58a6ff] focus:border-[#58a6ff] block w-full pl-10 p-2.5 pr-8 appearance-none"
                disabled={categories.length === 0 || !!categoriesError || isLoading || isTransitionPending}
              >
                <option value="">{t('allCategories') || 'All Categories'}</option>
                {categories.map((cat) => {
                  const translation = cat.translations.find(tr => tr.language.code === locale);
                  return (
                    <option key={cat.id} value={cat.id}>
                      {translation?.name || t('unnamedCategory') || `Category ${cat.id}`}
                    </option>
                  );
                })}
              </select>
              {categoriesError && <p className="text-xs text-red-500 mt-1">{categoriesError}</p>}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-grow w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="search"
                placeholder={t('searchPlaceholder') || 'Search terms...'}
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="bg-[#10142a]/60 border border-[#30364a] text-white text-sm rounded-lg focus:ring-[#58a6ff] focus:border-[#58a6ff] block w-full pl-10 p-2.5"
                disabled={isLoading || isTransitionPending}
              />
              {searchQuery && (
                <button
                  type="button" // Important: type="button" to prevent form submission
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  aria-label={tCommon('clearSearch')}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
               {/* Explicit submit button removed to match category style, search triggers on submit/enter */}
            </form>
          </div>
        </div>
      </div>

      {/* Error State */}
      {!isLoading && termsError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center mb-6 shadow-lg"
        >
          <ExclamationCircleIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 text-lg mb-2 font-medium">{tCommon('errorTitle')}</p>
          <p className="text-red-400/80 mb-6">{termsError}</p>
          <button
            onClick={refetchTerms}
            className="bg-[#1a2239] hover:bg-[#263354] border border-[#30364a] text-white px-4 py-2 rounded-lg transition-colors shadow-md"
          >
            {tCommon('tryAgain')}
          </button>
        </motion.div>
      )}

      {/* Loading state */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center py-20"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#58a6ff]/20 border-t-[#58a6ff] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-medium">{tCommon('loading')}</p>
          </div>
        </motion.div>
      )}

      {/* No Terms Message */}
      {!isLoading && !termsError && terms.length === 0 && (
         <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-xl border border-[#30364a] p-10 text-center shadow-lg"
         >
           <div className="bg-[#10142a]/40 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-[#30364a]">
             <DocumentTextIcon className="h-10 w-10 text-[#58a6ff]/50" />
           </div>
           <h3 className="text-xl font-medium text-white mb-3">{t('noResults')}</h3>
           <p className="text-gray-400 mb-6 max-w-lg mx-auto">
             {searchQuery || categoryId ? t('noResultsMatching') : t('noResultsDescription')}
           </p>
           {(searchQuery || categoryId) && (
             <button
               onClick={() => {
                 setSearchQuery('');
                 setCategoryId(undefined);
                 setCurrentPage(1);
                 updateURLSearchParams({ query: '', categoryId: undefined, page: 1 });
               }}
               className="px-4 py-2 bg-[#263354] text-white rounded-lg hover:bg-[#1f2942] transition-all flex items-center mx-auto"
             >
               <XMarkIcon className="h-5 w-5 mr-1.5" />
               {t('clearFilters')}
             </button>
           )}
         </motion.div>
       )}
 
 
       {/* Term List Table/Grid */}
       <AnimatePresence> {/* Restored AnimatePresence */}
         {!isLoading && !termsError && terms.length > 0 && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}> {/* Restored motion.div */}
             <div className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-lg border border-[#30364a] shadow-lg overflow-hidden mb-6">
               <div className="overflow-x-auto">
                 <table className="w-full min-w-[800px] table-fixed"><thead className="bg-[#10142a]/80 text-left">{/* Removed comment and whitespace */}
                    <tr>
                      {/* Adjusted padding and widths */}
                      <th scope="col" className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider w-[25%]">
                        {t('tableHeaderName') || 'Name'}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider w-[15%]">
                        {t('tableHeaderCategory') || 'Category'}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider w-[12%]">
                        {t('tableHeaderStatus') || 'Status'}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider w-[8%]">
                        {t('tableHeaderVersion') || 'Version'}
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider w-[10%]">
                        {t('tableHeaderCreated') || 'Created'}
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider text-right w-[45%]"> {/* Expanded width again */}
                        {t('tableHeaderActions') || 'Actions'}
                      </th>
                    </tr>
                  </thead><tbody>{/* Ensure no space */}
                    {terms.map((termVersion, idx) => {
                      const lvTranslation = termVersion.translations.find(tr => tr.languageId === 1);
                      const enTranslation = termVersion.translations.find(tr => tr.languageId === 2);
                      const targetLanguageId = locale === 'lv' ? 1 : 2;
                      const categoryTranslation = termVersion.term.category?.translations.find(tr => tr.languageId === targetLanguageId);

                      return (
                        <tr // Use standard tr
                          key={termVersion.id}
                          // Remove animation props from tr
                          className={`${
                            idx % 2 === 0 ? 'bg-[#1a2239]/40' : 'bg-[#10142a]/20'
                          } hover:bg-[#263354]/30 transition-colors`}
                        >
                          <td className="px-4 py-4 border-b border-[#30364a]/30">
                            {/* Apply motion to cell content */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                              <div className="text-sm font-medium text-white truncate">
                                <span className="font-semibold text-[#58a6ff]">LV:</span> {lvTranslation?.name || t('noTranslation')}
                              </div>
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                <span className="font-semibold text-[#64d8cb]">EN:</span> {enTranslation?.name || t('noTranslation')}
                              </div>
                            </motion.div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-300 truncate border-b border-[#30364a]/30">
                            {/* Apply motion to cell content */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                              {categoryTranslation?.name ||
                              termVersion.term.category?.translations?.find(ct => ct.languageId === 1)?.name ||
                              termVersion.term.category?.translations?.find(ct => ct.languageId === 2)?.name ||
                              <span className="text-gray-500 italic">{t('uncategorized')}</span>}
                            </motion.div>
                          </td>
                          <td className="px-3 py-4 border-b border-[#30364a]/30">
                            {/* Apply motion to cell content */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full w-fit ${
                                termVersion.status === 'PUBLISHED' ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/30' :
                              termVersion.status === 'DRAFT' ? 'bg-amber-900/30 text-amber-300 border border-amber-500/30' :
                              termVersion.status === 'ARCHIVED' ? 'bg-gray-800/30 text-gray-400 border border-gray-600/30' : ''
                            }`}>
                              {getStatusIcon(termVersion.status as TermStatus, "h-3 w-3")}
                                {t((termVersion.status as TermStatus).toLowerCase()) || termVersion.status}
                              </span>
                            </motion.div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-300 border-b border-[#30364a]/30">
                            {/* Apply motion to cell content */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                              <span className="bg-[#10142a]/60 px-2 py-1 rounded-md text-xs text-[#58a6ff]">
                                v{termVersion.versionNumber}
                              </span>
                            </motion.div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-400 border-b border-[#30364a]/30">
                            {/* Apply motion to cell content */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                              {new Date(termVersion.createdAt).toLocaleDateString(locale)}
                            </motion.div>
                          </td>
                          <td className="px-4 py-4 text-right border-b border-[#30364a]/30 w-[45%]">
                            {/* Apply motion to cell content */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="flex justify-end flex-wrap gap-4"> {/* Removed flex-nowrap, added flex-wrap */}
                              {/* Updated button styles */}
                              {termVersion.status === 'PUBLISHED' && (
                                <>
                                  <button
                                    onClick={() => router.push(`/${locale}/admin/manage-versions/${termVersion.term.identifier}`)}
                                    disabled={isTransitionPending}
                                    title={t('manageVersions') || 'Manage Versions'}
                                    className="group inline-flex items-center text-[#eaeaea] bg-[#263354]/60 hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/50 transition-all"
                                  >
                                    <DocumentDuplicateIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                                    <span className="hidden sm:inline">{t('manageVersions') || 'Manage Versions'}</span>
                                    <span className="sm:hidden">Versions</span>
                                  </button>
                                  <button
                                    onClick={() => handleCreateNewVersion(termVersion.id)}
                                    disabled={isTransitionPending}
                                    title={t('createVersion') || 'New Version'}
                                    className="group inline-flex items-center text-[#eaeaea] bg-[#263354]/60 hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/50 transition-all"
                                  >
                                    <PencilIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                                    <span className="hidden sm:inline">{t('createVersion') || 'New Version'}</span>
                                    <span className="sm:hidden">New</span>
                                  </button>
                                </>
                              )}
                              {termVersion.status === 'DRAFT' && (
                                <button
                                  onClick={() => router.push(`/${locale}/admin/edit-term/${termVersion.id}`)}
                                  disabled={isTransitionPending}
                                  title={t('edit') || 'Edit'}
                                  className="group inline-flex items-center text-[#eaeaea] bg-[#263354]/60 hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/50 transition-all"
                                >
                                  <PencilIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                                  {t('edit') || 'Edit'}
                                </button>
                              )}
                              {/* Manage Labels Button */}
                              <button
                                onClick={() => handleManageLabelsClick(termVersion)}
                                disabled={isTransitionPending}
                                title={t('manageLabels') || 'Manage Labels'} // TODO: Add translation key
                                className="group inline-flex items-center text-[#eaeaea] bg-[#263354]/60 hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/50 transition-all"
                              >
                                <TagIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                                <span className="hidden sm:inline">{t('manageLabels') || 'Labels'}</span>
                                <span className="sm:hidden">Labels</span>
                              </button>
                              {/* Delete button - Opens modal */}
                              <button
                                onClick={() => handleDeleteClick(termVersion.id, lvTranslation?.name || enTranslation?.name || '')}
                                disabled={isTransitionPending}
                                title={t('delete') || 'Delete'}
                                className="group inline-flex items-center text-[#eaeaea] bg-[#271523]/60 hover:bg-[#341a3e] px-3 py-1.5 rounded-md text-xs font-medium border border-red-500/20 shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                              >
                                <TrashIcon className="h-4 w-4 mr-1.5 text-red-400 group-hover:text-red-300 transition-colors" />
                                {t('delete') || 'Delete'}
                              </button>
                            </motion.div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody></table>{/* Ensure no space */}
              </div>
            </div>

            {/* Pagination - Styled like categories */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-400">
                  {tCommon('showing')} <span className="font-medium text-white">{indexOfFirstItem + 1}</span> {tCommon('to')}{' '}
                  <span className="font-medium text-white">{Math.min(indexOfLastItem, totalCount)}</span>{' '}
                  {tCommon('of')} <span className="font-medium text-white">{totalCount}</span> {t('results')} {/* Use 'results' from terms */}
                </div>

                <nav className="inline-flex rounded-lg shadow-lg">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading || isTransitionPending}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-400 hover:bg-[#263354] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">{tCommon('previous')}</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {/* Basic Page Number Display (can be enhanced later) */}
                   <span className="relative inline-flex items-center px-4 py-2 border-t border-b border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-300">
                     {tCommon('page')} {currentPage} {tCommon('of')} {totalPages}
                   </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading || isTransitionPending}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-400 hover:bg-[#263354] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">{tCommon('next')}</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                 </nav>
               </div>
             )}
           </motion.div> 
         )}
       </AnimatePresence>


       {/* Manage Labels Modal */}
       <ManageTermLabelsModal
         isOpen={isLabelModalOpen}
         onClose={() => setIsLabelModalOpen(false)}
         termVersion={editingTerm}
         locale={locale}
         onLabelsUpdated={handleLabelsUpdated}
       />

       {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingTermVersionId !== null && (
        <div className="fixed inset-0 z-60 overflow-y-auto"> {/* Increased z-index to 60 */}
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-black/75"
              aria-hidden="true"
              onClick={() => setIsDeleteModalOpen(false)} // Close on overlay click
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <div
              className="inline-block align-bottom bg-[#1a2239] rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-red-500/20"
            >
              <div className="bg-gradient-to-r from-[#271523] to-[#1a1024] px-4 py-4 border-b border-[#30364a] sm:px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                    <TrashIcon className="h-5 w-5 mr-2 text-red-500" />
                    {t('deleteConfirmationTitle')}
                  </h3>
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="bg-[#1a2239]/60 rounded-md p-1 text-gray-400 hover:text-white focus:outline-none transition-colors"
                  >
                    <span className="sr-only">{tCommon('closeModal')}</span>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-5 sm:p-6 bg-gradient-to-br from-[#241428] to-[#1a1024]">
                <div className="flex items-center justify-center mb-6">
                  <div className="rounded-full flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/20">
                    <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
                  </div>
                </div>

                <h3 className="text-lg text-center font-medium text-white mb-4">{t('areYouSure')}</h3>

                <p className="text-gray-300 mb-3 text-center">
                  {t('deleteConfirmationText', { name: deletingTermName })}
                </p>

                <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {t('deleteWarning')}
                </p>
              </div>

              <div className="px-4 py-4 bg-[#10142a]/40 border-t border-[#30364a] sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isTransitionPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  {isTransitionPending ? (
                    <>
                      <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                      {tCommon('deleting')}
                    </>
                  ) : (
                    t('delete') // Use term-specific delete key
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isTransitionPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-[#30364a] shadow-sm px-4 py-2 bg-[#1a2239] text-base font-medium text-gray-300 hover:bg-[#263354] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#30364a] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
