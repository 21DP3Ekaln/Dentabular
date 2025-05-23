"use client";

import { useState, useEffect, useTransition, useCallback, useActionState } from 'react'; // Changed useFormState
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
// useFormState from react-dom changed to useActionState from react
import {
  getLabels,
  updateLabel,
  deleteLabel,
  LabelForManagement,
  UpdateLabelFormState,
} from '@/app/actions/labelActions';
// import { getLanguages as getEnabledLanguages } from '@/lib/i18n-utils'; // Removed
import type { Language as LanguageType } from '@/types/i18n';

import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  // CheckCircleIcon, // Removed
  ExclamationTriangleIcon,
  ArrowPathIcon
  // TagIcon removed as it's not directly used in this component
} from '@heroicons/react/24/outline';
// import { Language } from '@prisma/client'; // LanguageType from @/types/i18n is used

// Debounce utility removed
interface ManageLabelsClientProps {
  locale: string;
  initialPage?: number;
  initialSearchQuery?: string;
  availableLanguages: Pick<LanguageType, "id" | "code" | "name">[];
}

// Edit Modal Form State
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
  const [editNotification, setEditNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // const [availableLanguages, setAvailableLanguages] = useState<Pick<LanguageType, "id" | "code" | "name">[]>([]); // Removed, will use passedAvailableLanguages from props

  const [isPending, startTransition] = useTransition();

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
    } catch (e: unknown) { // Added type for caught error
      console.error("Error in fetchLabels:", e); // Log the error
      setError(commonT('notifications.loadError', { error: e instanceof Error ? e.message : String(e) }));
      setLabels([]);
    } finally {
      setIsLoading(false);
    }
  }, [commonT]);

  useEffect(() => {
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
  
  // useEffect(() => { // Removed: Languages will be passed as a prop
  //   async function loadLangs() {
  //       const langResult = await getEnabledLanguages();
  //       if (langResult.success) {
  //           setAvailableLanguages(langResult.languages);
  //       } else {
  //           console.error("Failed to load languages for edit modal:", langResult.error);
  //           // Optionally set an error state here to inform the user
  //       }
  //   }
  //   loadLangs();
  // }, []);

  useEffect(() => {
    if (editFormState.message) {
        setEditNotification({
            type: editFormState.success ? 'success' : 'error',
            message: editFormState.message
        });
        if (editFormState.success) {
            setIsEditModalOpen(false);
            setSelectedLabel(null);
            fetchLabels(currentPage, searchQuery); // Refresh list
        }
    }
  }, [editFormState, currentPage, searchQuery, fetchLabels]);


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const openEditModal = (label: LabelForManagement) => {
    setSelectedLabel(label);
    setEditNotification(null); // Clear previous notifications
    // Reset form state for the specific action - this is tricky with useFormState's binding
    // For now, relying on initialEditFormState and new binding in formAction
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (label: LabelForManagement) => {
    setSelectedLabel(label);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteLabel = async () => {
    if (!selectedLabel) return;
    startTransition(async () => {
      const result = await deleteLabel(selectedLabel.id);
      if (result.success) {
        // Show success notification (e.g., using a toast library or simple state)
        fetchLabels(currentPage, searchQuery); // Refresh list
        setIsDeleteModalOpen(false);
        setSelectedLabel(null);
        alert(result.message); // Temporary
      } else {
        // Show error notification
        alert(result.message); // Temporary
      }
    });
  };
  
  const getTranslation = (translations: LabelForManagement['translations'], langCode: string) => {
    return translations.find(t => t.language.code === langCode)?.name || 'N/A';
  };


  return (
    <div className="space-y-6">
      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t('searchPlaceholder')}
            className="w-full p-2.5 pl-10 bg-[#10142a] border border-[#30364a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        {/* Add New Label button is on the page.tsx now */}
      </div>

      {/* Table */}
      {isLoading && !labels.length ? (
        <div className="text-center py-10 text-gray-400">{t('loadingLabels')}</div>
      ) : error ? (
        <div className="text-center py-10 text-red-400">{error}</div>
      ) : labels.length === 0 ? (
        <div className="text-center py-10 text-gray-400">{t('noLabelsFound')}</div>
      ) : (
        <div className="overflow-x-auto bg-[#10142a]/40 rounded-lg border border-[#30364a]">
          <table className="min-w-full divide-y divide-[#30364a]">
            <thead className="bg-[#1a2239]/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('tableHeaders.id')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('tableHeaders.name')} (EN)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('tableHeaders.name')} (LV)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('tableHeaders.termsUsing')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('tableHeaders.created')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('tableHeaders.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-[#1a2239] divide-y divide-[#30364a]">
              {labels.map((label) => (
                <tr key={label.id} className="hover:bg-[#10142a]/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{label.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{getTranslation(label.translations, 'en')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{getTranslation(label.translations, 'lv')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{label._count.terms}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(label.createdAt).toLocaleDateString(locale)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <button onClick={() => openEditModal(label)} className="text-[#58a6ff] hover:text-[#79bbff] transition-colors">
                      <PencilIcon className="h-5 w-5 inline-block mr-1" /> {commonT('edit')}
                    </button>
                    <button onClick={() => openDeleteModal(label)} className="text-red-500 hover:text-red-400 transition-colors">
                      <TrashIcon className="h-5 w-5 inline-block mr-1" /> {commonT('delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6 text-sm text-gray-400">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isPending}
            className="px-4 py-2 border border-[#30364a] rounded-lg hover:bg-[#10142a] disabled:opacity-50"
          >
            {commonT('previous')}
          </button>
          <span>
            {commonT('page')} {currentPage} {commonT('of')} {totalPages} ({totalCount} {commonT('results', { count: totalCount })})
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isPending}
            className="px-4 py-2 border border-[#30364a] rounded-lg hover:bg-[#10142a] disabled:opacity-50"
          >
            {commonT('next')}
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedLabel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">{t('editModalTitle')}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {editNotification && (
                <div className={`mb-4 p-3 rounded-md text-sm ${editNotification.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-600/50' : 'bg-red-900/30 text-red-400 border border-red-600/50'}`}>
                    {editNotification.message}
                </div>
            )}
            
            <form action={editFormAction} className="space-y-4">
              {passedAvailableLanguages.map(lang => {
                const currentTranslation = selectedLabel.translations.find(t => t.language.code === lang.code)?.name || "";
                return (
                  <div key={lang.code}>
                    <label htmlFor={`edit-label-${lang.code}`} className="block text-sm font-medium text-gray-300 mb-1">
                      {t('labelName')} ({lang.name})
                    </label>
                    <input
                      type="text"
                      id={`edit-label-${lang.code}`}
                      name={`translations.${lang.code}.name`}
                      defaultValue={currentTranslation}
                      className="w-full p-2.5 bg-[#10142a] border border-[#30364a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]"
                    />
                    {editFormState.errors?.translations?.[lang.code] && (
                        <p className="text-red-500 text-xs mt-1">{editFormState.errors.translations[lang.code]}</p>
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-[#30364a] text-gray-300 rounded-lg hover:bg-[#10142a]">
                  {commonT('cancel')}
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-[#58a6ff] hover:bg-[#4393e6] text-white rounded-lg flex items-center disabled:opacity-50">
                  {isPending ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-2"/> : <PencilIcon className="h-5 w-5 mr-2"/>}
                  {commonT('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedLabel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0"/>
                <div>
                    <h3 className="text-xl font-semibold text-white">{t('deleteModalTitle')}</h3>
                    <p className="text-gray-400 mt-2">
                        {selectedLabel._count.terms > 0 
                            ? t('deleteWarningInUse', { count: selectedLabel._count.terms })
                            : t('deleteConfirmationText', { labelName: getTranslation(selectedLabel.translations, locale) || selectedLabel.translations[0]?.name || 'this label' })}
                    </p>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 border border-[#30364a] text-gray-300 rounded-lg hover:bg-[#10142a]">
                {commonT('cancel')}
              </button>
              <button 
                onClick={handleDeleteLabel} 
                disabled={isPending || selectedLabel._count.terms > 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center disabled:opacity-50 disabled:bg-red-800"
              >
                {isPending ? <ArrowPathIcon className="h-5 w-5 animate-spin mr-2"/> : <TrashIcon className="h-5 w-5 mr-2"/>}
                {commonT('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
