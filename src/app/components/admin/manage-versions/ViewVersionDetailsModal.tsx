'use client';

import { useTranslations } from 'next-intl';
import { TermVersionHistory } from '@/app/actions/manage_termsActions';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ViewVersionDetailsModalProps {
  version: TermVersionHistory | null;
  onClose: () => void;
}

export default function ViewVersionDetailsModal({ version, onClose }: ViewVersionDetailsModalProps) {
  const t = useTranslations('AdminManageVersions');

  if (!version) {
    return null;
  }

  const lvTranslation = version.translations.find(tr => tr.language.code === 'lv');
  const enTranslation = version.translations.find(tr => tr.language.code === 'en');

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">
      <div className="bg-[#1a2239] border border-[#30364a] rounded-xl shadow-xl max-w-2xl w-full text-[#eaeaea] animate-fadeIn">
        {/* Modal header */}
        <div className="bg-[#263354] rounded-t-xl px-6 py-4 flex justify-between items-center border-b border-[#30364a]">
          <h2 className="text-xl font-semibold text-[#58a6ff]">
            {t('detailsModalTitle', { version: version.versionNumber })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-[#10142a]/40"
            aria-label={t('closeModalAriaLabel') || 'Close'}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Latvian Details */}
            <div className="bg-[#10142a]/40 rounded-lg p-4 border border-[#30364a]">
              <h3 className="text-lg font-medium mb-3 text-[#58a6ff]">{t('latvianFields')}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{t('termNameLabel')}</p>
                  <p className="font-medium">{lvTranslation?.name || t('noTranslation')}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">{t('termDescriptionLabel')}</p>
                  <div className="bg-[#0b0f23] rounded-md p-3 border border-[#30364a]/50">
                    <p className="text-sm whitespace-pre-wrap">{lvTranslation?.description || t('noDescription')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* English Details */}
            <div className="bg-[#10142a]/40 rounded-lg p-4 border border-[#30364a]">
              <h3 className="text-lg font-medium mb-3 text-[#58a6ff]">{t('englishFields')}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{t('termNameLabel')}</p>
                  <p className="font-medium">{enTranslation?.name || t('noTranslation')}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">{t('termDescriptionLabel')}</p>
                  <div className="bg-[#0b0f23] rounded-md p-3 border border-[#30364a]/50">
                    <p className="text-sm whitespace-pre-wrap">{enTranslation?.description || t('noDescription')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Version Metadata */}
            <div className="text-xs text-gray-400 pt-4 border-t border-[#30364a] mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                {/* Use translation key */}
                <p className="mb-1">{t('status')}</p> 
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  version.status === 'PUBLISHED' ? 'bg-emerald-900/20 text-emerald-400' :
                  version.status === 'DRAFT' ? 'bg-amber-900/20 text-amber-400' :
                  version.status === 'ARCHIVED' ? 'bg-gray-900/20 text-gray-400' : ''
                }`}>
                  {t(version.status.toLowerCase()) || version.status}
                </span>
              </div>
              <div>
                {/* Use translation key */}
                <p className="mb-1">{t('createdDate')}</p> 
                <p className="text-white">{new Date(version.createdAt).toLocaleString()}</p>
              </div>
              {version.publishedAt && (
                <div>
                  {/* Use translation key */}
                  <p className="mb-1">{t('publishedDate')}</p> 
                  <p className="text-white">{new Date(version.publishedAt).toLocaleString()}</p>
                </div>
              )}
              {version.archivedAt && (
                <div>
                  {/* Use translation key */}
                  <p className="mb-1">{t('archivedDate')}</p> 
                  <p className="text-white">{new Date(version.archivedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#263354] hover:bg-[#2d3b66] text-white rounded-md border border-[#30364a] transition-colors"
            >
              {t('closeButton') || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
