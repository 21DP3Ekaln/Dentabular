'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Dynamically import the ExportFavoritesPDF component with SSR disabled
const ExportFavoritesPDF = dynamic(() => import('./ExportFavoritesPDF'), { 
  ssr: false,
  loading: () => <LoadingButton />
});

function LoadingButton() {
  const t = useTranslations();
  
  return (
    <button className="flex items-center space-x-2 bg-gradient-to-r from-[#64d8cb] to-[#4bd3c5] text-white px-6 py-3 rounded-lg font-medium shadow-md opacity-70">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
      </svg>
      <span>{t('actions.export_to_pdf')}</span>
    </button>
  );
}

export default function ExportPDFButton() {
  return <ExportFavoritesPDF />;
}
