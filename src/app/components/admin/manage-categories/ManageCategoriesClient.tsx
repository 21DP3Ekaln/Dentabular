'use client';
import { useEffect, useState, useTransition, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { TagIcon } from '@heroicons/react/24/solid';
import LocaleLink from '@/app/components/LocaleLink';
import { getAllCategoriesWithTranslations, updateCategory, deleteCategory } from '@/app/actions/categoryActions';
import { CategoryForFilter } from '@/app/actions/categoryActions';
import { motion, AnimatePresence } from 'framer-motion';

interface ManageCategoriesClientProps {
  locale: string;
}

type EditingCategory = {
  id: number;
  translations: Record<string, string>;
};

export default function ManageCategoriesClient({ locale }: ManageCategoriesClientProps) {
  const t = useTranslations('AdminManageCategories');
  const [isPending, startTransition] = useTransition();

  // State for categories data
  const [categories, setCategories] = useState<CategoryForFilter[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryForFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // State for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // State for deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  // State for notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllCategoriesWithTranslations();
      if (result.error) {
        setError(result.error);
      } else {
        setCategories(result.categories);
        setFilteredCategories(result.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(t('fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Apply search filter
  const applySearchFilter = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(categories);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase().trim();

    const filtered = categories.filter((category) => {
      // Search in all translations
      return category.translations.some((translation) => translation.name.toLowerCase().includes(query));
    });

    setFilteredCategories(filtered);
    setCurrentPage(1);
  }, [searchQuery, categories]);

  // Initial data fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Apply search filter when search query changes
  useEffect(() => {
    if (categories.length > 0) {
      applySearchFilter();
    }
  }, [searchQuery, categories, applySearchFilter]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Open edit modal
  const handleEditClick = (category: CategoryForFilter) => {
    const translations: Record<string, string> = {};

    category.translations.forEach((translation) => {
      translations[translation.languageId.toString()] = translation.name;
    });

    setEditingCategory({
      id: category.id,
      translations,
    });
    setEditErrors({});
    setIsEditModalOpen(true);
  };

  // Handle input change in edit modal
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>, languageId: number) => {
    if (!editingCategory) return;

    setEditingCategory({
      ...editingCategory,
      translations: {
        ...editingCategory.translations,
        [languageId]: e.target.value,
      },
    });

    // Clear error for this field if it exists
    if (editErrors[`lang_${languageId}`]) {
      const newErrors = { ...editErrors };
      delete newErrors[`lang_${languageId}`];
      setEditErrors(newErrors);
    }
  };

  // Submit category edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    // Validate form data - Both Latvian and English names are required
    const validationErrors: Record<string, string> = {};

    // Find Latvian (1) and English (2) language IDs - assuming these are the IDs based on context
    if (!editingCategory.translations['1']?.trim()) {
      validationErrors['lang_1'] = t('validation.lvNameRequired');
    }

    if (!editingCategory.translations['2']?.trim()) {
      validationErrors['lang_2'] = t('validation.enNameRequired');
    }

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateCategory(editingCategory.id, editingCategory.translations);

        if (result.success) {
          setNotification({
            type: 'success',
            message: t('editSuccess'),
          });
          setIsEditModalOpen(false);
          // Refresh the categories list
          fetchCategories();
        } else {
          setNotification({
            type: 'error',
            message: result.error || t('editError'),
          });
        }
      } catch (error) {
        console.error('Error updating category:', error);
        setNotification({
          type: 'error',
          message: t('unexpectedError'),
        });
      }
    });
  };

  // Open delete confirmation modal
  const handleDeleteClick = (categoryId: number) => {
    setDeletingCategoryId(categoryId);
    setIsDeleteModalOpen(true);
  };

  // Confirm category deletion
  const handleDeleteConfirm = async () => {
    if (deletingCategoryId === null) return;

    startTransition(async () => {
      try {
        const result = await deleteCategory(deletingCategoryId);

        if (result.success) {
          setNotification({
            type: 'success',
            message: t('deleteSuccess'),
          });
          // Refresh the categories list
          fetchCategories();
        } else {
          setNotification({
            type: 'error',
            message: result.error || t('deleteError'),
          });
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        setNotification({
          type: 'error',
          message: t('unexpectedError'),
        });
      } finally {
        setIsDeleteModalOpen(false);
        setDeletingCategoryId(null);
      }
    });
  };

  // Close notification
  const closeNotification = () => {
    setNotification(null);
  };

  // Render function for category name based on locale
  const getCategoryName = (category: CategoryForFilter): string => {
    // Find the translation for the current locale (1 for lv, 2 for en)
    const targetLanguageId = locale === 'lv' ? 1 : 2;
    const translation = category.translations.find((t) => t.languageId === targetLanguageId);

    if (translation) {
      return translation.name;
    }

    // Fallback to any translation if locale-specific one isn't found
    return category.translations[0]?.name || t('unnamedCategory');
  };

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
              onClick={closeNotification}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label={t('closeNotification')}
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
            <TagIcon className="h-5 w-5 mr-2 text-[#58a6ff]" />
            {t('categoriesList')}
          </h2>
          <button
            onClick={fetchCategories}
            className="ml-3 p-2 text-gray-400 hover:text-white bg-[#10142a]/40 rounded-full"
            disabled={isLoading}
            title={t('refresh')}
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex w-full sm:w-auto space-x-2">
          {/* Search box */}
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t('searchPlaceholder')}
              className="bg-[#10142a]/60 border border-[#30364a] text-white text-sm rounded-lg focus:ring-[#58a6ff] focus:border-[#58a6ff] block w-full pl-10 p-2.5"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Add category button */}
          <LocaleLink
            href="/admin/new-category"
            className="bg-[#58a6ff] hover:bg-[#4393e6] text-white px-4 py-2.5 rounded-lg flex items-center transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">{t('addCategory')}</span>
          </LocaleLink>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center mb-6 shadow-lg"
        >
          <ExclamationCircleIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 text-lg mb-2 font-medium">{t('errorTitle')}</p>
          <p className="text-red-400/80 mb-6">{error}</p>
          <button
            onClick={fetchCategories}
            className="bg-[#1a2239] hover:bg-[#263354] border border-[#30364a] text-white px-4 py-2 rounded-lg transition-colors shadow-md"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center py-20"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#58a6ff]/20 border-t-[#58a6ff] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-medium">{t('loading')}</p>
          </div>
        </motion.div>
      )}

      {/* No categories message */}
      {!isLoading && !error && filteredCategories.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-xl border border-[#30364a] p-10 text-center shadow-lg"
        >
          <div className="bg-[#10142a]/40 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-[#30364a]">
            <TagIcon className="h-10 w-10 text-[#58a6ff]/50" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">{t('noCategories')}</h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            {searchQuery ? t('noCategoriesMatching', { query: searchQuery }) : t('noCategoriesDescription')}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-[#263354] text-white rounded-lg hover:bg-[#1f2942] transition-all flex items-center"
              >
                <XMarkIcon className="h-5 w-5 mr-1.5" />
                {t('clearSearch')}
              </button>
            )}

            <LocaleLink
              href="/admin/new-category"
              className="px-4 py-2 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] transition-all inline-flex items-center shadow-md"
            >
              <PlusIcon className="h-5 w-5 mr-1.5" />
              {t('addCategory')}
            </LocaleLink>
          </div>
        </motion.div>
      )}

      {/* Categories list */}
      <AnimatePresence>
        {!isLoading && !error && filteredCategories.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-lg border border-[#30364a] shadow-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#10142a]/80 text-left">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t('tableHeaders.id')}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t('tableHeaders.name')}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t('tableHeaders.translations')}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {t('tableHeaders.created')}
                      </th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">
                        {t('tableHeaders.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((category, idx) => (
                      <motion.tr
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`${
                          idx % 2 === 0 ? 'bg-[#1a2239]/40' : 'bg-[#10142a]/20'
                        } hover:bg-[#263354]/30 transition-colors`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-300 border-b border-[#30364a]/30">
                          <span className="bg-[#10142a]/60 px-3 py-1 rounded-full text-xs text-[#58a6ff]">
                            {category.id}
                          </span>
                        </td>
                        <td className="px-4 py-4 border-b border-[#30364a]/30">
                          <div className="font-medium text-white flex items-center">
                            <TagIcon className="h-4 w-4 mr-2 text-[#58a6ff]" />
                            {getCategoryName(category)}
                          </div>
                          <div className="mt-1 text-xs text-gray-400 flex items-center">
                            {/* Display category name in other language */}
                            {category.translations
                              .filter((t) => t.languageId !== (locale === 'lv' ? 1 : 2))
                              .map((t) => (
                                <span key={t.languageId} className="mr-2">
                                  {t.language.code.toUpperCase()}: {t.name}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-b border-[#30364a]/30">
                          <div className="flex flex-wrap gap-2">
                            {category.translations.map((translation) => (
                              <div
                                key={translation.languageId}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#263354]/60 text-[#64d8cb] border border-[#64d8cb]/20"
                              >
                                <span className="flex w-2 h-2 bg-[#64d8cb] rounded-full mr-1.5"></span>
                                {translation.language.code.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400 border-b border-[#30364a]/30">
                          {new Date(category.createdAt).toLocaleDateString(locale)}
                        </td>
                        <td className="px-4 py-4 text-right border-b border-[#30364a]/30">
                          <div className="flex justify-end flex-wrap gap-2">
                            <button
                              onClick={() => handleEditClick(category)}
                              disabled={isPending}
                              className="group inline-flex items-center text-[#eaeaea] bg-[#263354]/60 hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/50 transition-all"
                            >
                              <PencilIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                              {t('edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteClick(category.id)}
                              disabled={isPending}
                              className="group inline-flex items-center text-[#eaeaea] bg-[#271523]/60 hover:bg-[#341a3e] px-3 py-1.5 rounded-md text-xs font-medium border border-red-500/20 shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                            >
                              <TrashIcon className="h-4 w-4 mr-1.5 text-red-400 group-hover:text-red-300 transition-colors" />
                              {t('delete')}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6"> {/* Added mt-6 for spacing, ensure this matches if file was formatted */}
                <div className="text-sm text-gray-400">
                  {t('showing')} <span className="font-medium text-white">{indexOfFirstItem + 1}</span> {t('to')}{' '}
                  <span className="font-medium text-white">{Math.min(indexOfLastItem, filteredCategories.length)}</span>{' '}
                  {t('of')} <span className="font-medium text-white">{filteredCategories.length}</span> {t('categories')}
                </div>

                <nav className="inline-flex rounded-lg shadow-lg">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isPending}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-400 hover:bg-[#263354] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">{t('previous')}</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isPending}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        currentPage === page
                          ? 'bg-[#263354] text-[#58a6ff] border-[#58a6ff]/50 font-medium'
                          : 'bg-[#1a2239] text-gray-400 border-[#30364a] hover:bg-[#10142a] hover:text-white'
                      } text-sm transition-colors`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isPending}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-400 hover:bg-[#263354] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">{t('next')}</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Category Modal */}
      {isEditModalOpen && editingCategory && (
        <div className="fixed inset-0 z-60 overflow-y-auto"> {/* Increased z-index to 60 */}
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/75" /* Added bg-black/75, removed transition-opacity */
              aria-hidden="true"
            ></motion.div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="inline-block align-bottom bg-[#1a2239] rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            >
              <div className="bg-gradient-to-r from-[#10142a] to-[#172045] px-4 py-4 border-b border-[#30364a] sm:px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                    <PencilIcon className="h-5 w-5 mr-2 text-[#58a6ff]" />
                    {t('editCategoryTitle')}
                  </h3>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="bg-[#1a2239]/60 rounded-md p-1 text-gray-400 hover:text-white focus:outline-none transition-colors"
                  >
                    <span className="sr-only">{t('closeModal')}</span>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="px-4 py-5 sm:p-6 bg-gradient-to-br from-[#1a2239] to-[#1c2541]">
                  <div className="space-y-4">
                    {editingCategory &&
                      categories.find((c) => c.id === editingCategory.id)?.translations.map((translation) => (
                        <div key={translation.languageId}>
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            <span className="flex items-center">
                              <div
                                className="flex items-center justify-center w-5 h-5 rounded-full bg-[#64d8cb]/10 text-[#64d8cb] mr-1.5 border border-[#64d8cb]/20"
                              >
                                {translation.language.code.slice(0, 1).toUpperCase()}
                              </div>
                              {translation.language.name} ({translation.language.code.toUpperCase()})
                              {(translation.language.code === 'lv' || translation.language.code === 'en') && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={editingCategory.translations[translation.languageId] || ''}
                              onChange={(e) => handleEditInputChange(e, translation.languageId)}
                              className={`w-full p-2.5 bg-[#10142a]/60 border ${
                                editErrors[`lang_${translation.languageId}`] ? 'border-red-500' : 'border-[#30364a]'
                              } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all`}
                            />
                            {(translation.language.code === 'lv' || translation.language.code === 'en') && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <span className="text-red-500 text-xl">*</span>
                              </div>
                            )}
                          </div>
                          {editErrors[`lang_${translation.languageId}`] && (
                            <p className="mt-1.5 text-xs text-red-500 flex items-center">
                              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                              {editErrors[`lang_${translation.languageId}`]}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="px-4 py-4 bg-[#10142a]/40 border-t border-[#30364a] sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#58a6ff] text-base font-medium text-white hover:bg-[#4393e6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58a6ff] sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    {isPending ? (
                      <>
                        <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                        {t('saving')}
                      </>
                    ) : (
                      t('save')
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isPending}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-[#30364a] shadow-sm px-4 py-2 bg-[#1a2239] text-base font-medium text-gray-300 hover:bg-[#263354] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#30364a] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingCategoryId !== null && (
        <div className="fixed inset-0 z-60 overflow-y-auto"> {/* Increased z-index to 60 */}
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/75" /* Added bg-black/75, removed transition-opacity */
              aria-hidden="true"
            ></motion.div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
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
                    <span className="sr-only">{t('closeModal')}</span>
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

                <p className="text-gray-300 mb-3 text-center">{t('deleteConfirmationText')}</p>

                <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  {t('deleteWarning')}
                </p>
              </div>

              <div className="px-4 py-4 bg-[#10142a]/40 border-t border-[#30364a] sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  {isPending ? (
                    <>
                      <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                      {t('deleting')}
                    </>
                  ) : (
                    t('delete')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isPending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-[#30364a] shadow-sm px-4 py-2 bg-[#1a2239] text-base font-medium text-gray-300 hover:bg-[#263354] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#30364a] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
