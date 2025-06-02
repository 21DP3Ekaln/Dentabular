'use client';

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useTranslations, useLocale } from 'next-intl'; 

type Term = {
  id: number;
  identifier: string;
  createdAt: Date;
  activeVersion: {
    translations: {
      name: string;
      description: string;
      language: {
        id: number;
        code: string;
        name: string;
        isDefault: boolean;
        isEnabled: boolean;
      };
    }[];
  } | null;
  category: {
    id: number;
    createdAt: Date;
    translations: {
      name: string;
      language: {
        id: number;
        code: string;
        name: string;
        isDefault: boolean;
        isEnabled: boolean;
      };
    }[];
  };
  labels: { // Added labels definition
    label: {
      id: number;
      translations: {
        name: string;
        language: {
          code: string;
        };
      }[];
    };
  }[];
};

// Add proper type definitions for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      head?: Array<Array<string>>;
      body?: Array<Array<string>>;
      startY?: number;
      margin?: { top?: number; right?: number; bottom?: number; left?: number };
      styles?: object;
      headStyles?: object;
      bodyStyles?: object;
      theme?: string;
      tableWidth?: string | number;
      columnStyles?: object;
      columns?: Array<{ header: string; dataKey: string }>;
      html?: string | HTMLElement;
    }) => jsPDF;
  }
}

// Font data will be loaded here
let fontData: string | null = null;

export default function ExportFavoritesPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false); // Tracks if the font has been fetched and added
  const t = useTranslations();
  const locale = useLocale(); // Get current locale

  // Load the custom font that supports Latvian characters
  useEffect(() => {
    const loadCustomFont = async () => {
      if (fontLoaded || fontData) {
        setFontLoaded(true); // Already loaded or fetched
        return;
      }
      try {
        // Fetch the font file from the public directory
        const response = await fetch('/fonts/NotoSans-Regular.ttf');
        if (!response.ok) {
          throw new Error(`Failed to fetch font: ${response.statusText}`);
        }
        const fontBlob = await response.blob();
        
        // Read the font file as Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          // Remove the Base64 prefix "data:...;base64,"
          fontData = (reader.result as string).split(',')[1];
          setFontLoaded(true); // Mark font as ready
          console.log('Noto Sans font loaded successfully.');
        };
        reader.onerror = (error) => {
          console.error('Error reading font file:', error);
          alert(t('actions.font_load_error'));
        };
        reader.readAsDataURL(fontBlob);

      } catch (error) {
        console.error('Error loading custom font:', error);
        alert(t('actions.font_load_error'));
      }
    };

    loadCustomFont();
  }, [fontLoaded, t]); // Rerun if fontLoaded changes or language changes

  const handleExport = async () => {
    // Ensure font data is loaded before exporting
    if (!fontLoaded || !fontData) {
      alert(t('actions.font_loading_wait'));
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Fetch favorites data from the API
      const response = await fetch('/api/export-favorites');
      
      if (!response.ok) {
        throw new Error('Failed to fetch favorites data');
      }
      
      const data = await response.json();
      const favorites: Term[] = data.favorites;
      
      // Generate PDF with the custom font
      const doc = new jsPDF();

      // Add the custom font to jsPDF
      if (!fontData) {
        console.error('Font data is not available.');
        alert(t('actions.font_load_error'));
        setIsExporting(false);
        return;
      }
      // Add the font file to VFS (Virtual File System)
      doc.addFileToVFS('NotoSans-Regular.ttf', fontData);
      // Add the font to jsPDF's font list
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
      // Set the document font
      doc.setFont('NotoSans', 'normal');
      
      // Add title (using the custom font)
      doc.setFontSize(20);
      doc.setTextColor(0, 102, 204);
      doc.text(t('profile.favorite_dental_terms'), 105, 15, { align: 'center' });
      
      // Add date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${t('profile.exported_on')} ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
      
      // Add separator line
      doc.setDrawColor(220, 220, 220);
      doc.line(14, 25, 196, 25);
      
      // Add content
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      let yPos = 35;
      
      // Loop through each favorite term
      favorites.forEach((term, index) => {
        // Check if we need a new page
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Add term number and category
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`#${index + 1} • ${t('category.category')}: ${term.category.translations.find(t => t.language.code === 'en')?.name || t('category.uncategorized')}`, 14, yPos);
        yPos += 8;
        
        // Add Latvian term with proper encoding
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        
        // Add Latvian term directly (no processing needed with the right font)
        const lvName = term.activeVersion?.translations.find(t => t.language.code === 'lv')?.name || t('term_view.no_translation');
        
        // Use the custom font which supports Latvian characters
        doc.text(`${lvName} (LV)`, 14, yPos);
        yPos += 7;
        
        // Add Latvian description
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Add Latvian description directly
        const lvDesc = term.activeVersion?.translations.find(t => t.language.code === 'lv')?.description || t('term_view.no_description');
        
        // Split text to handle wrapping
        const lv_lines = doc.splitTextToSize(lvDesc, 175);
        doc.text(lv_lines, 14, yPos);
        yPos += (lv_lines.length * 5) + 7;
        
        // Add English term
        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        const engName = term.activeVersion?.translations.find(t => t.language.code === 'en')?.name || t('term_view.no_translation');
        doc.text(`${engName} (EN)`, 14, yPos);
        yPos += 7;
        
        // Add English description
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Split text to handle wrapping
        const engDesc = term.activeVersion?.translations.find(t => t.language.code === 'en')?.description || t('term_view.no_description');
        const eng_lines = doc.splitTextToSize(engDesc, 175);
        doc.text(eng_lines, 14, yPos);
        yPos += (eng_lines.length * 5) + 7; // Adjusted spacing

        // Add Labels
        if (term.labels && term.labels.length > 0) {
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50); // Darker gray for label title
          doc.text(`${t('labels.labels')}:`, 14, yPos);
          yPos += 5;

          doc.setFontSize(9);
          doc.setTextColor(80, 80, 80); // Slightly lighter gray for label names
          const labelNames = term.labels.map(termLabel => {
            const translation = termLabel.label.translations.find(lt => lt.language.code === locale) || termLabel.label.translations.find(lt => lt.language.code === 'en');
            return translation ? translation.name : t('labels.no_labels'); // Fallback if no translation found
          }).join(', ');
          
          const label_lines = doc.splitTextToSize(labelNames, 175);
          doc.text(label_lines, 14, yPos);
          yPos += (label_lines.length * 4.5) + 7; // Adjusted spacing
        }
        
        yPos += 8; // Extra space before separator or end of term block

        // Add separator between terms
        if (index < favorites.length - 1) {
          doc.setDrawColor(220, 220, 220);
          doc.line(14, yPos - 7, 196, yPos - 7);
        }
      });
      
      // Add footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`${t('profile.page')} ${i} ${t('profile.of')} ${pageCount}`, 105, 290, { align: 'center' });
        doc.text(t('profile.exported_from'), 105, 295, { align: 'center' });
      }
      
      // Save the PDF with a more descriptive filename
      doc.save(`dental-terms-favorites-${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('actions.failed_to_generate'));
    } finally {
      setIsExporting(false);
    }
  };

  // Disable button until font is loaded
  const isButtonDisabled = isExporting || !fontLoaded;
  
  return (
    <button
      onClick={handleExport}
      disabled={isButtonDisabled}
      className={`flex items-center space-x-2 bg-gradient-to-r from-[#64d8cb] to-[#4bd3c5] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all ${isButtonDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {isExporting ? (
        <>
          {/* Spinner SVG */}
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('actions.exporting')}</span>
        </>
      ) : !fontLoaded ? (
         <>
          {/* Loading Font Indicator */}
           <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{t('actions.loading_font')}</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
          </svg>
          <span>{t('actions.export_to_pdf')}</span>
        </>
      )}
    </button>
  );
}
