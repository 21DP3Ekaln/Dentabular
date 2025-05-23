'use client';

import { Fragment, useState, useEffect, useTransition } from 'react';
import { Dialog, Transition, Combobox } from '@headlessui/react';
import { TagIcon, XMarkIcon, CheckIcon, ChevronUpDownIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { ManagedTermVersion } from '@/app/actions/manage_termsActions'; // Assuming type is exported
import { LabelForSelect, getAllLabelsForSelect, addLabelToTerm, removeLabelFromTerm } from '@/app/actions/labelActions';

interface ManageTermLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  termVersion: ManagedTermVersion | null; // Use the updated type which includes term.labels
  locale: string;
  onLabelsUpdated: () => void; // Callback to refresh parent list
}

// Helper to get primary term name for display
const getPrimaryTermName = (termVersion: ManagedTermVersion | null, locale: string): string => {
  if (!termVersion) return 'N/A';
  const currentLocaleTranslation = termVersion.translations.find(t => t.language.code === locale);
  if (currentLocaleTranslation?.name) return currentLocaleTranslation.name;
  const fallbackTranslation = termVersion.translations.find(t => t.languageId === 1) // Try LV
                           || termVersion.translations.find(t => t.languageId === 2) // Try EN
                           || termVersion.translations[0]; // Any translation
  return fallbackTranslation?.name || `Term ID: ${termVersion.termId}`;
};

export default function ManageTermLabelsModal({
  isOpen,
  onClose,
  termVersion,
  locale,
  onLabelsUpdated,
}: ManageTermLabelsModalProps) {
  const t = useTranslations('AdminManageLabels'); // Use translations from ManageLabels or create new ones
  const tCommon = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const [allLabels, setAllLabels] = useState<LabelForSelect[]>([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [selectedLabelToAdd, setSelectedLabelToAdd] = useState<LabelForSelect | null>(null);
  const [comboboxQuery, setComboboxQuery] = useState('');
  const [operationError, setOperationError] = useState<string | null>(null);

  // Derived state for current labels associated with the term
  const currentTermLabels: LabelForSelect[] = termVersion?.term.labels?.map(tl => {
      const translation = tl.label.translations.find(t => t.language.code === locale);
      return {
        id: tl.label.id,
        name: translation?.name || tl.label.translations[0]?.name || `Label ${tl.label.id}`
      };
    }).sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  // Fetch all available labels when the modal opens or locale changes
  useEffect(() => {
    if (isOpen) {
      setIsLoadingLabels(true);
      setLabelsError(null);
      getAllLabelsForSelect(locale)
        .then(result => {
          if (result.error) {
            setLabelsError(result.error);
            setAllLabels([]);
          } else {
            setAllLabels(result.labels);
          }
        })
        .catch(err => {
          console.error("Error fetching all labels:", err);
          setLabelsError(t('notifications.loadError') || 'Failed to load labels.');
          setAllLabels([]);
        })
        .finally(() => {
          setIsLoadingLabels(false);
        });
    } else {
      // Reset state when modal closes
      setLabelsError(null);
      setOperationError(null);
      setSelectedLabelToAdd(null);
      setComboboxQuery('');
    }
  }, [isOpen, locale, t]);

  // Filter labels for Combobox based on query
  const filteredLabels =
    comboboxQuery === ''
      ? allLabels
      : allLabels.filter((label) =>
          label.name.toLowerCase().includes(comboboxQuery.toLowerCase())
        );

  // Handler to remove a label
  const handleRemoveLabel = (labelId: number) => {
    if (!termVersion || isPending) return;
    setOperationError(null);
    startTransition(async () => {
      const result = await removeLabelFromTerm(termVersion.termId, labelId);
      if (result.error) {
        setOperationError(result.error);
      } else {
        onLabelsUpdated(); // Trigger refresh in parent
        // Optionally show a success notification or rely on parent refresh
      }
    });
  };

  // Handler to add the selected label
  const handleAddLabel = () => {
    if (!termVersion || !selectedLabelToAdd || isPending) return;
    setOperationError(null);

    // Prevent adding if already present
    if (currentTermLabels.some(l => l.id === selectedLabelToAdd.id)) {
        setOperationError("Label already added to this term."); // TODO: Add translation
        return;
    }

    startTransition(async () => {
      const result = await addLabelToTerm(termVersion.termId, selectedLabelToAdd.id);
      if (result.error) {
        setOperationError(result.error);
      } else {
        setSelectedLabelToAdd(null); // Clear selection
        setComboboxQuery(''); // Clear query
        onLabelsUpdated(); // Trigger refresh in parent
      }
    });
  };

  const termDisplayName = getPrimaryTermName(termVersion, locale);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1a2239] border border-[#30364a] p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-[#58a6ff] flex items-center mb-4"
                >
                  <TagIcon className="h-5 w-5 mr-2" />
                  {t('editModalTitle')} {/* Reusing key, consider specific key like 'manageTermLabelsTitle' */}
                </Dialog.Title>

                <div className="mt-2 space-y-4">
                  {/* Display Term Name */}
                  <p className="text-sm text-gray-400 border-b border-[#30364a] pb-2">
                    Managing labels for: <span className="font-semibold text-gray-200">{termDisplayName}</span>
                  </p>

                  {/* Display Current Labels */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Current Labels:</h4>
                    {currentTermLabels.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentTermLabels.map((label) => (
                          <span
                            key={label.id}
                            className="inline-flex items-center rounded-full bg-[#263354] pl-3 pr-1 py-1 text-xs font-medium text-[#a2c3f7] border border-[#30364a]"
                          >
                            {label.name}
                            <button
                              onClick={() => handleRemoveLabel(label.id)}
                              disabled={isPending}
                              className="ml-1.5 flex-shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                              aria-label={`Remove ${label.name}`}
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">{t('noLabelsFound')}</p> // Reusing key
                    )}
                  </div>

                  {/* Add New Label Section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Add Label:</h4>
                    {isLoadingLabels ? (
                       <div className="flex items-center text-sm text-gray-400">
                         <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                         {tCommon('loading')}
                       </div>
                    ) : labelsError ? (
                       <p className="text-xs text-red-400">{labelsError}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Combobox value={selectedLabelToAdd} onChange={setSelectedLabelToAdd} nullable>
                          <div className="relative flex-grow">
                            <Combobox.Input
                              className="w-full rounded-md border border-[#30364a] bg-[#10142a]/60 py-2 pl-3 pr-10 text-sm leading-5 text-gray-200 focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] focus:outline-none"
                              displayValue={(label: LabelForSelect | null) => label?.name || ''}
                              onChange={(event) => setComboboxQuery(event.target.value)}
                              placeholder="Search or select label..." // TODO: Translate
                            />
                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </Combobox.Button>
                            <Transition
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                              afterLeave={() => setComboboxQuery('')}
                            >
                              <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-[#1f2740] border border-[#30364a] py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10">
                                {filteredLabels.length === 0 && comboboxQuery !== '' ? (
                                  <div className="relative cursor-default select-none px-4 py-2 text-gray-500">
                                    Nothing found. {/* TODO: Translate */}
                                  </div>
                                ) : (
                                  filteredLabels.map((label) => (
                                    <Combobox.Option
                                      key={label.id}
                                      className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                          active ? 'bg-[#2c3a5f] text-white' : 'text-gray-300'
                                        }`
                                      }
                                      value={label}
                                      disabled={currentTermLabels.some(l => l.id === label.id)} // Disable if already added
                                    >
                                      {({ selected, active }) => (
                                        <>
                                          <span
                                            className={`block truncate ${
                                              selected ? 'font-medium' : 'font-normal'
                                            } ${currentTermLabels.some(l => l.id === label.id) ? 'text-gray-500' : ''}`} // Style disabled options
                                          >
                                            {label.name}
                                          </span>
                                          {selected ? (
                                            <span
                                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                active ? 'text-white' : 'text-[#58a6ff]'
                                              }`}
                                            >
                                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                            </span>
                                          ) : null}
                                          {currentTermLabels.some(l => l.id === label.id) && (
                                             <span className="text-xs text-gray-500 ml-2">(already added)</span> // TODO: Translate
                                          )}
                                        </>
                                      )}
                                    </Combobox.Option>
                                  ))
                                )}
                              </Combobox.Options>
                            </Transition>
                          </div>
                        </Combobox>
                        <button
                          onClick={handleAddLabel}
                          disabled={!selectedLabelToAdd || isPending || currentTermLabels.some(l => l.id === selectedLabelToAdd?.id)}
                          className="px-4 py-2 text-sm font-medium text-white bg-[#58a6ff] rounded-md hover:bg-[#4393e6] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#58a6ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isPending ? tCommon('saving') : 'Add'} {/* TODO: Translate 'Add' */}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Operation Error Display */}
                  {operationError && (
                    <p className="text-xs text-red-400 flex items-center">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {operationError}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-[#30364a] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#263354] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#58a6ff] transition-colors"
                    onClick={onClose}
                  >
                    {tCommon('closeModal')} {/* Reusing key */}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
