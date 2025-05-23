import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import React from 'react'
import { SessionProvider } from "next-auth/react";
import { NextIntlClientProvider } from 'next-intl'; // Removed unused useMessages
import { notFound } from 'next/navigation';
import Header from '@/app/components/layout/Header'; // Import Header
import Footer from '@/app/components/layout/Footer'; // Import Footer

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Define params as a Promise
type LocaleParams = Promise<{ locale: string }>;

// This function is called by Next.js at build and runtime
export async function generateMetadata({
  params
}: {
  params: LocaleParams
}): Promise<Metadata> {
  // Properly await the params
  const { locale } = await params;
  
  return {
    title: "Dentabular",
    description: locale === 'lv' ? 
      "Zobārstniecības terminoloģijas datubāze" : 
      "Dental Terminology Database"
  };
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // Await params for locale
}>) {
  // Properly await the params to get the locale
  const { locale } = await params;

  // Load messages using useMessages hook is preferred in newer next-intl versions,
  // but since this is an async component, direct import is fine.
  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    notFound(); // Trigger 404 if messages fail to load
  }

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0f23] text-[#eaeaea]`} // Added base background/text colors
      >
        {/* Providers need to wrap the components that use their context */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>
            <div className="flex flex-col min-h-screen"> {/* Wrapper for sticky footer */}
              <Header /> {/* Render shared header */}
              <main className="flex-grow px-4 py-8"> {/* Adjusted main styling */}
                {children} {/* Page content */}
              </main>
              <Footer /> {/* Render shared footer */}
            </div>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
