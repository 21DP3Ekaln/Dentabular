"use client";

import { useState, useEffect, useTransition, useCallback, useActionState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  getLabels,
  updateLabel,
  deleteLabel,
  LabelForManagement,
  UpdateLabelFormState,
} from '@/app/actions/labelActions';
import type { Language as LanguageType } from '@/types/i18n';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { TagIcon } from '@heroicons/react/24/solid';
import LocaleLink from '@/app/components/LocaleLink';
import { motion, AnimatePresence } from 'framer-motion';

interface ManageLabelsClientProps {
  locale: string;
  initialPage?: number;
  initialSearchQuery?: string;
  availableLanguages: Pick<LanguageType, "id" | "code" | "name">[];
}

const initialEditFormState: UpdateLabelFormState = {
  success: false,
  message: "",
  errors: {},
};

export default function ManageLabelsClient({ locale, initialPage = 1, initialSearchQuery = "", availableLanguages: passedAvailableLanguages }: ManageLabelsClientProps) {
  const t = useTranslations('AdminManageLabels');
  const commonT = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [labels, setLabels] = useState<LabelForManagement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<LabelForManagement | null>(null);
  
  const [editFormState, editFormAction] = useActionState(updateLabel.bind(null, selectedLabel?.id || 0), initialEditFormState);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isPending, startTransition] = useTransition(); // General pending state (e.g. for form submissions)
  const [isDeleting, startDeletingTransition] = useTransition(); // Specific for delete operation

  const fetchLabels = useCallback(async (page: number, query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getLabels({ page, pageSize: 10, searchQuery: query });
      if (result.error) {
        setError(result.error);
        setLabels([]);
      } else {
        setLabels(result.labels);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
      }
    } catch (e: unknown) {
      console.error("Error in fetchLabels:", e);
      setError(commonT('notifications.loadError', { error: e instanceof Error ? e.message : String(e) }));
      setLabels([]);
    } finally {
      setIsLoading(false);
    }
  }, [commonT]);

  useEffect(() => {
    // Use a separate transition for fetching to not interfere with form submission pending states
    startTransition(() => {
        fetchLabels(currentPage, searchQuery);
    });
  }, [currentPage, searchQuery, fetchLabels]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? ""); 
    if (currentPage > 1) params.set('page', currentPage.toString()); else params.delete('page');
    if (searchQuery) params.set('search', searchQuery); else params.delete('search');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentPage, searchQuery, pathname, router, searchParams]);

  useEffect(() => {
    if (editFormState.message) {
        setNotification({
            type: editFormState.success ? 'success' : 'error',
            message: editFormState.message
        });
        if (editFormState.success) {
            setIsEditModalOpen(false);
            setSelectedLabel(null);
            fetchLabels(currentPage, searchQuery); 
        }
    }
  }, [editFormState, currentPage, searchQuery, fetchLabels]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const closeNotification = () => {
    setNotification(null);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const openEditModal = (label: LabelForManagement) => {
    setSelectedLabel(label);
    setNotification(null); // Clear general notifications
    // editFormState will be reset by useActionState when action is re-bound or key changes if we implement that
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (label: LabelForManagement) => {
    setSelectedLabel(label);
    setNotification(null); // Clear general notifications
    setIsDeleteModalOpen(true);
  };

  const handleDeleteLabel = async () => {
    if (!selectedLabel) return;
    startDeletingTransition(async () => {
      const result = await deleteLabel(selectedLabel.id);
      if (result.success) {
        setNotification({ type: 'success', message: result.message || t('deleteSuccessConfirmation') }); // Assuming deleteSuccessConfirmation key
        fetchLabels(currentPage, searchQuery);
        setIsDeleteModalOpen(false);
        setSelectedLabel(null);
      } else {
        setNotification({ type: 'error', message: result.message || t('deleteErrorDetails') }); // Assuming deleteErrorDetails key
      }
    });
  };
  
  const getTranslation = (translations: LabelForManagement['translations'], langCode: string) => {
    return translations.find(t => t.language.code === langCode)?.name || 'N/A';
  };

  return (
    <div className="w-full">
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
              aria-label={commonT('closeNotification')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <h2 className="text-xl font-medium text-white flex items-center">
            <TagIcon className="h-5 w-5 mr-2 text-[#58a6ff]" />
            {t('title')}
          </h2>
          <button
            onClick={() => fetchLabels(currentPage, searchQuery)}
            className="ml-3 p-2 text-gray-400 hover:text-white bg-[#10142a]/40 rounded-full"
            disabled={isLoading || isPending || isDeleting}
            title={commonT('refresh')}
          >
            <ArrowPathIcon className={`h-5 w-5 ${(isLoading || isPending || isDeleting) ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex w-full sm:w-auto space-x-2">
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
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <LocaleLink
            href="/admin/new-label"
            className="bg-[#58a6ff] hover:bg-[#4393e6] text-white px-4 py-2.5 rounded-lg flex items-center transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">{t('addNewLabelButton')}</span>
          </LocaleLink>
        </div>
      </div>

      {error && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center mb-6 shadow-lg"
        >
          <ExclamationCircleIcon className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-400 text-lg mb-2 font-medium">{commonT('errorTitle')}</p>
          <p className="text-red-400/80 mb-6">{error}</p>
          <button
            onClick={() => fetchLabels(currentPage, searchQuery)}
            className="bg-[#1a2239] hover:bg-[#263354] border border-[#30364a] text-white px-4 py-2 rounded-lg transition-colors shadow-md"
          >
            {commonT('tryAgain')}
          </button>
        </motion.div>
      )}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center items-center py-20"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-[#58a6ff]/20 border-t-[#58a6ff] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 font-medium">{t('loadingLabels')}</p>
          </div>
        </motion.div>
      )}
      
      {!isLoading && !error && labels.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-xl border border-[#30364a] p-10 text-center shadow-lg"
        >
          <div className="bg-[#10142a]/40 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 border border-[#30364a]">
            <TagIcon className="h-10 w-10 text-[#58a6ff]/50" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">{t('noLabelsFound')}</h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            {searchQuery ? t('noLabelsMatchingQuery', { query: searchQuery }) : t('noLabelsFoundDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-[#263354] text-white rounded-lg hover:bg-[#1f2942] transition-all flex items-center"
              >
                <XMarkIcon className="h-5 w-5 mr-1.5" />
                {commonT('clearSearch')}
              </button>
            )}
            <LocaleLink
              href="/admin/new-label"
              className="px-4 py-2 bg-[#58a6ff] text-white rounded-lg hover:bg-[#4393e6] transition-all inline-flex items-center shadow-md"
            >
              <PlusIcon className="h-5 w-5 mr-1.5" />
              {t('addNewLabelButton')}
            </LocaleLink>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {!isLoading && !error && labels.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-gradient-to-br from-[#1a2239]/80 to-[#1c2541]/80 rounded-lg border border-[#30364a] shadow-lg overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#10142a]/80 text-left">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{t('tableHeaders.id')}</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{t('tableHeaders.name')} (EN)</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{t('tableHeaders.name')} (LV)</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{t('tableHeaders.termsUsing')}</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{t('tableHeaders.created')}</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">{t('tableHeaders.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((label, idx) => (
                      <motion.tr
                        key={label.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`${idx % 2 === 0 ? 'bg-[#1a2239]/40' : 'bg-[#10142a]/20'} hover:bg-[#263354]/30 transition-colors`}
                      >
                        <td className="px-4 py-4 text-sm text-gray-300 border-b border-[#30364a]/30">
                          <span className="bg-[#10142a]/60 px-3 py-1 rounded-full text-xs text-[#58a6ff]">{label.id}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white border-b border-[#30364a]/30">{getTranslation(label.translations, 'en')}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white border-b border-[#30364a]/30">{getTranslation(label.translations, 'lv')}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400 border-b border-[#30364a]/30">{label._count.terms}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400 border-b border-[#30364a]/30">{new Date(label.createdAt).toLocaleDateString(locale)}</td>
                        <td className="px-4 py-4 text-right border-b border-[#30364a]/30">
                          <div className="flex justify-end flex-wrap gap-2">
                            <button
                              onClick={() => openEditModal(label)}
                              disabled={isPending || isDeleting}
                              className="group inline-flex items-center text-[#eaeaea] bg-[#263354]/60 hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff]/50 transition-all"
                            >
                              <PencilIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                              {commonT('edit')}
                            </button>
                            <button
                              onClick={() => openDeleteModal(label)}
                              disabled={isPending || isDeleting || label._count.terms > 0}
                              className="group inline-flex items-center text-[#eaeaea] bg-[#271523]/60 hover:bg-[#341a3e] px-3 py-1.5 rounded-md text-xs font-medium border border-red-500/20 shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <TrashIcon className="h-4 w-4 mr-1.5 text-red-400 group-hover:text-red-300 transition-colors" />
                              {commonT('delete')}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-400">
                  {commonT('pagination.showing')} <span className="font-medium text-white">{currentPage * 10 - 9}</span> {commonT('pagination.to')} <span className="font-medium text-white">{Math.min(currentPage * 10, totalCount)}</span> {commonT('pagination.of')} <span className="font-medium text-white">{totalCount}</span> {commonT('pagination.results')}
                </div>
                <nav className="inline-flex rounded-lg shadow-lg">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isPending || isDeleting}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-400 hover:bg-[#263354] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">{commonT('previous')}</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={isPending || isDeleting}
                      className={`relative inline-flex items-center px-4 py-2 border ${currentPage === page ? 'bg-[#263354] text-[#58a6ff] border-[#58a6ff]/50 font-medium' : 'bg-[#1a2239] text-gray-400 border-[#30364a] hover:bg-[#10142a] hover:text-white'} text-sm transition-colors`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isPending || isDeleting}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-[#30364a] bg-[#1a2239] text-sm font-medium text-gray-400 hover:bg-[#263354] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="sr-only">{commonT('next')}</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isEditModalOpen && selectedLabel && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/75" aria-hidden="true"></motion.div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="inline-block align-bottom bg-[#1a2239] rounded-lg text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-[#30364a]"
            >
              <div className="bg-gradient-to-r from-[#10142a] to-[#172045] px-4 py-4 border-b border-[#30364a] sm:px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-white flex items-center">
                    <PencilIcon className="h-5 w-5 mr-2 text-[#58a6ff]" />
                    {t('editModalTitle')}
                  </h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="bg-[#1a2239]/60 rounded-md p-1 text-gray-400 hover:text-white focus:outline-none transition-colors">
                    <span className="sr-only">{commonT('closeModal')}</span>
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <form action={editFormAction}>
                <div className="px-4 py-5 sm:p-6 bg-gradient-to-br from-[#1a2239] to-[#1c2541]">
                  <div className="space-y-4">
                    {passedAvailableLanguages.map(lang => {
                      const currentTranslation = selectedLabel.translations.find(t => t.language.code === lang.code)?.name || "";
                      const errorForLang = editFormState.errors?.translations?.[lang.code];
                      return (
                        <div key={lang.code}>
                          <label htmlFor={`edit-label-${lang.code}`} className="block text-sm font-medium text-gray-300 mb-1.5">
                            <span className="flex items-center">
                              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#64d8cb]/10 text-[#64d8cb] mr-1.5 border border-[#64d8cb]/20">
                                {lang.code.slice(0, 1).toUpperCase()}
                              </div>
                              {lang.name} ({lang.code.toUpperCase()})
                              {(lang.code === 'lv' || lang.code === 'en') && (<span className="text-red-500 ml-1">*</span>)}
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              id={`edit-label-${lang.code}`}
                              name={`translations.${lang.code}.name`}
                              defaultValue={currentTranslation}
                              className={`w-full p-2.5 bg-[#10142a]/60 border ${errorForLang ? 'border-red-500' : 'border-[#30364a]'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] transition-all`}
                            />
                            {(lang.code === 'lv' || lang.code === 'en') && (<div className="absolute inset-y-0 right-0 pr-3 flex items-center"><span className="text-red-500 text-xl">*</span></div>)}
                          </div>
                          {errorForLang && (<p className="mt-1.5 text-xs text-red-500 flex items-center"><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errorForLang}</p>)}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-4 py-4 bg-[#10142a]/40 border-t border-[#30364a] sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                  <button type="submit" disabled={isPending || isDeleting} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#58a6ff] text-base font-medium text-white hover:bg-[#4393e6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#58a6ff] sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50">
                    {(isPending && !isDeleting) ? <><ArrowPathIcon className="animate-spin h-5 w-5 mr-2" /> {commonT('saving')}</> : <><PencilIcon className="h-5 w-5 mr-2" /> {commonT('save')}</>}
                  </button>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isPending || isDeleting} className="mt-3 w-full inline-flex justify-center rounded-md border border-[#30364a] shadow-sm px-4 py-2 bg-[#1a2239] text-base font-medium text-gray-300 hover:bg-[#263354] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#30364a] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50">
                    {commonT('cancel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedLabel && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/75" aria-hidden="true"></motion.div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
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
                    {t('deleteModalTitle')}
                  </h3>
                  <button onClick={() => setIsDeleteModalOpen(false)} className="bg-[#1a2239]/60 rounded-md p-1 text-gray-400 hover:text-white focus:outline-none transition-colors">
                    <span className="sr-only">{commonT('closeModal')}</span>
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
                <h3 className="text-lg text-center font-medium text-white mb-4">{commonT('areYouSure')}</h3>
                <p className="text-gray-300 mb-3 text-center">
                  {selectedLabel._count.terms > 0 
                    ? t('deleteWarningInUse', { count: selectedLabel._count.terms })
                    : t('deleteConfirmationText', { labelName: getTranslation(selectedLabel.translations, locale) || selectedLabel.translations[0]?.name || 'this label' })}
                </p>
                {selectedLabel._count.terms === 0 && (
                  <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {commonT('deleteWarning')}
                  </p>
                )}
              </div>
              <div className="px-4 py-4 bg-[#10142a]/40 border-t border-[#30364a] sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button type="button" onClick={handleDeleteLabel} disabled={isPending || isDeleting || selectedLabel._count.terms > 0} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50 disabled:bg-red-800">
                  {isDeleting ? <><ArrowPathIcon className="animate-spin h-5 w-5 mr-2" /> {commonT('deleting')}</> : <><TrashIcon className="h-5 w-5 mr-2" /> {commonT('delete')}</>}
                </button>
                <button type="button" onClick={() => setIsDeleteModalOpen(false)} disabled={isPending || isDeleting} className="mt-3 w-full inline-flex justify-center rounded-md border border-[#30364a] shadow-sm px-4 py-2 bg-[#1a2239] text-base font-medium text-gray-300 hover:bg-[#263354] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#30364a] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors disabled:opacity-50">
                  {commonT('cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
