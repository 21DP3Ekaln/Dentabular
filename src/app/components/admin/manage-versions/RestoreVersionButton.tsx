'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { restoreTermVersion } from '@/app/actions/manage_termsActions';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface RestoreVersionButtonProps {
  termVersionId: number;
}

export default function RestoreVersionButton({ termVersionId }: RestoreVersionButtonProps) {
  const t = useTranslations('AdminManageVersions');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRestore = () => {
    const confirmRestore = window.confirm(t('restoreConfirmation') || 'Are you sure you want to restore this version? The current published version will be archived.');
    if (!confirmRestore) {
      return;
    }

    startTransition(async () => {
      const result = await restoreTermVersion(termVersionId);
      if (result.error) {
        alert(`${t('restoreError') || 'Error restoring version:'} ${result.error}`);
      } else {
        alert(t('restoreSuccess') || 'Version restored successfully!');
        router.refresh();
      }
    });
  };

  return (
    <button
      onClick={handleRestore}
      disabled={isPending}
      className="group relative inline-flex items-center text-[#eaeaea] bg-[#1e293f] hover:bg-[#263354] px-3 py-1.5 rounded-md text-xs font-medium border border-[#30364a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#58a6ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowPathIcon className={`h-4 w-4 mr-1.5 text-[#58a6ff] group-hover:text-[#64d8cb] transition-colors ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? t('restoringButton') : t('restoreButton')}
    </button>
  );
}
