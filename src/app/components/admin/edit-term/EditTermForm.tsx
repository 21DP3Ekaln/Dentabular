'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
// Import the necessary actions
import { TermVersionForEdit, updateTermVersionDraft, createAndSaveNewTermVersion } from '@/app/actions/manage_termsActions';
import { CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon, LanguageIcon } from '@heroicons/react/24/outline';

interface EditTermFormProps {
  termVersionData: TermVersionForEdit;
  locale: string;
  mode: 'editExisting' | 'createFromSource'; // Mode prop
}

// Destructure locale along with other props
export default function EditTermForm({ termVersionData, mode, locale }: EditTermFormProps) {
  const t = useTranslations('AdminEditTerm');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Find initial translations
  const initialLvTranslation = termVersionData.translations.find(t => t.language.code === 'lv');
  const initialEnTranslation = termVersionData.translations.find(t => t.language.code === 'en');

  // Form state
  const [lvName, setLvName] = useState(initialLvTranslation?.name ?? '');
  const [lvDescription, setLvDescription] = useState(initialLvTranslation?.description ?? '');
  const [enName, setEnName] = useState(initialEnTranslation?.name ?? '');
  const [enDescription, setEnDescription] = useState(initialEnTranslation?.description ?? '');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      let result: { success: boolean; error?: string; newVersionId?: number }; // Define result type

      const translationData = {
        lv: { name: lvName, description: lvDescription },
        en: { name: enName, description: enDescription },
      };

      try {
        if (mode === 'editExisting') {
          // Call the update action for existing drafts
          result = await updateTermVersionDraft({
            termVersionId: termVersionData.id,
            translations: translationData,
          });
        } else { // mode === 'createFromSource'
          // Call the new create action
          result = await createAndSaveNewTermVersion({
            sourceTermId: termVersionData.termId, // Pass the original term ID
            translations: translationData,
            // Pass categoryId if it should be copied or potentially changed
            // categoryId: termVersionData.term.categoryId
          });
        }

        if (result.error) {
          setError(result.error);
        } else {
          // Adjust success message and redirect based on mode
          if (mode === 'editExisting') {
            setSuccess(t('updateSuccessMessage') || 'Draft updated successfully!');
            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Optionally refresh or redirect after a delay
          } else { // createFromSource success
            // Redirect immediately to the pending terms page (with locale)
            router.push(`/${locale}/admin/pending-terms`);
            // No need to set success message here as we are navigating away
          }
        }
      } catch (err) {
         console.error("Error during form submission:", err);
         setError("An unexpected error occurred."); // Generic error for unexpected issues
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 flex items-start shadow-lg animate-fadeIn">
          <ExclamationCircleIcon className="h-6 w-6 text-red-400 mr-4 mt-0.5 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && mode === 'editExisting' && ( // Only show success if editing existing and not redirecting
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5 flex items-start shadow-lg animate-fadeIn">
          <CheckCircleIcon className="h-6 w-6 text-emerald-400 mr-4 mt-0.5 flex-shrink-0" />
          <p className="text-emerald-400">{success}</p>
        </div>
      )}

      {/* Form Fields - Two-column layout on larger screens */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Latvian Fields Column */}
        <div className="bg-[#10142a]/40 rounded-xl border border-[#30364a] p-7 shadow-lg transform transition-all hover:shadow-xl">
          <div className="flex items-center mb-6">
            <div className="bg-[#58a6ff]/10 p-2 rounded-lg mr-3">
              <LanguageIcon className="h-6 w-6 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-semibold text-[#58a6ff]">
              {t('latvianFields')}
            </h3>
          </div>

          <div className="space-y-7">
            <div>
              <label htmlFor="lvName" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                {t('termNameLabel')} (LV) <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                id="lvName"
                value={lvName}
                onChange={(e) => setLvName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a2239] border border-[#30364a] rounded-lg shadow-sm text-[#eaeaea] focus:ring-2 focus:ring-[#58a6ff]/50 focus:border-[#58a6ff] placeholder-gray-500 transition-all"
                placeholder={t('termNamePlaceholder') || "Enter Latvian term name"}
              />
            </div>

            <div>
              <label htmlFor="lvDescription" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                {t('termDescriptionLabel')} (LV)
              </label>
              <textarea
                id="lvDescription"
                value={lvDescription}
                onChange={(e) => setLvDescription(e.target.value)}
                rows={7}
                className="w-full px-4 py-3 bg-[#1a2239] border border-[#30364a] rounded-lg shadow-sm text-[#eaeaea] focus:ring-2 focus:ring-[#58a6ff]/50 focus:border-[#58a6ff] placeholder-gray-500 transition-all resize-none"
                placeholder={t('termDescriptionPlaceholder') || "Enter Latvian description"}
              />
            </div>
          </div>
        </div>

        {/* English Fields Column */}
        <div className="bg-[#10142a]/40 rounded-xl border border-[#30364a] p-7 shadow-lg transform transition-all hover:shadow-xl">
          <div className="flex items-center mb-6">
            <div className="bg-[#58a6ff]/10 p-2 rounded-lg mr-3">
              <LanguageIcon className="h-6 w-6 text-[#58a6ff]" />
            </div>
            <h3 className="text-lg font-semibold text-[#58a6ff]">
              {t('englishFields')}
            </h3>
          </div>

          <div className="space-y-7">
            <div>
              <label htmlFor="enName" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                {t('termNameLabel')} (EN) <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                id="enName"
                value={enName}
                onChange={(e) => setEnName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#1a2239] border border-[#30364a] rounded-lg shadow-sm text-[#eaeaea] focus:ring-2 focus:ring-[#58a6ff]/50 focus:border-[#58a6ff] placeholder-gray-500 transition-all"
                placeholder={t('termNamePlaceholder') || "Enter English term name"}
              />
            </div>

            <div>
              <label htmlFor="enDescription" className="flex items-center text-sm font-medium text-gray-300 mb-2">
                {t('termDescriptionLabel')} (EN)
              </label>
              <textarea
                id="enDescription"
                value={enDescription}
                onChange={(e) => setEnDescription(e.target.value)}
                rows={7}
                className="w-full px-4 py-3 bg-[#1a2239] border border-[#30364a] rounded-lg shadow-sm text-[#eaeaea] focus:ring-2 focus:ring-[#58a6ff]/50 focus:border-[#58a6ff] placeholder-gray-500 transition-all resize-none"
                placeholder={t('termDescriptionPlaceholder') || "Enter English description"}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons with improved styling */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10 pt-6 border-t border-[#30364a]/50">
        <button
          type="button"
          onClick={() => router.back()}
          className="order-2 sm:order-1 py-3 px-6 border border-[#30364a] rounded-lg shadow-sm text-sm font-medium text-gray-300 bg-[#1a2239] hover:bg-[#263354] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/50 transition-all duration-200"
          disabled={isPending}
        >
          {t('cancelButton')}
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="order-1 sm:order-2 py-3 px-6 flex justify-center items-center gap-2 rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-[#58a6ff] to-[#64d8cb] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/50 transition-all duration-200 disabled:opacity-70 transform hover:translate-y-[-1px]"
        >
          {isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
          {isPending ? t('savingButton') : t('saveButton')}
        </button>
      </div>
    </form>
  );
}
