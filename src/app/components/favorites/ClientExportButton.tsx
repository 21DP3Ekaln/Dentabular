'use client';

import Link from 'next/link';
import { useFavorites } from '@/app/components/favorites/FavoritesProvider';
import ExportPDFButton from '../ExportPDFButton';
import { useTranslations } from 'next-intl';

export default function ClientExportButton() {
  const { favorites } = useFavorites();
  const t = useTranslations();

  if (favorites.length === 0) {
    return (
      <Link
        href="/"
        className="bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all inline-block"
      >
        {t('actions.browse_categories')}
      </Link>
    );
  }

  return <ExportPDFButton />;
}
