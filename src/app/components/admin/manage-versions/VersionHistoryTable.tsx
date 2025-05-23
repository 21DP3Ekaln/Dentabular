'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TermVersionHistory } from '@/app/actions/manage_termsActions';
import RestoreVersionButton from './RestoreVersionButton';
import ViewVersionDetailsModal from './ViewVersionDetailsModal';
import { CheckCircleIcon, ClockIcon, ArchiveBoxIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface VersionHistoryTableProps {
  versions: TermVersionHistory[];
  locale: string;
}

export default function VersionHistoryTable({ versions, locale }: VersionHistoryTableProps) {
  const t = useTranslations('AdminManageVersions');
  const [selectedVersion, setSelectedVersion] = useState<TermVersionHistory | null>(null);

  const openModal = (version: TermVersionHistory) => {
    setSelectedVersion(version);
  };

  const closeModal = () => {
    setSelectedVersion(null);
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'PUBLISHED':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-400" />;
      case 'DRAFT':
        return <ClockIcon className="h-5 w-5 text-amber-400" />;
      case 'ARCHIVED':
        return <ArchiveBoxIcon className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[#10142a]/40">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('version')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('status')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('createdDate')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('publishedDate')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{t('archivedDate')}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30364a]">
            {versions.map((version) => (
              <tr key={version.id} className="bg-[#1a2239] hover:bg-[#10142a]/20 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="bg-[#263354] text-[#58a6ff] text-xs px-2 py-1 rounded-md">
                    v{version.versionNumber}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full w-fit ${
                    version.status === 'PUBLISHED' ? 'bg-emerald-900/20 text-emerald-400' :
                    version.status === 'DRAFT' ? 'bg-amber-900/20 text-amber-400' :
                    version.status === 'ARCHIVED' ? 'bg-gray-900/20 text-gray-400' : ''
                  }`}>
                    {getStatusIcon(version.status)}
                    {t(version.status.toLowerCase()) || version.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(version.createdAt).toLocaleDateString(locale)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {version.publishedAt ? new Date(version.publishedAt).toLocaleDateString(locale) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {version.archivedAt ? new Date(version.archivedAt).toLocaleDateString(locale) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => openModal(version)}
                      className="group relative inline-flex items-center text-[#eaeaea] bg-[#263354] hover:bg-[#2d3b66] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff] transition-all"
                    >
                      <InformationCircleIcon className="h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors" />
                      {t('viewDetailsButton') || 'View Details'}
                    </button>
                    {version.status === 'ARCHIVED' && (
                      <RestoreVersionButton termVersionId={version.id} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <ViewVersionDetailsModal version={selectedVersion} onClose={closeModal} />
    </>
  );
}
