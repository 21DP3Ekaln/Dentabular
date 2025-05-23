import { getLanguages } from "@/lib/i18n-utils";
import { getTranslations } from "next-intl/server";
import NewLabelForm from "@/app/components/admin/new-label/NewLabelForm";
import LocaleLink from "@/app/components/LocaleLink";
import { ArrowLeftIcon, TagIcon, CheckCircleIcon } from "@heroicons/react/24/outline"; // Assuming TagIcon for labels

export default async function NewLabelPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "AdminNewLabel" });
  const commonT = await getTranslations({ locale, namespace: "common" }); // Changed to lowercase
  const navT = await getTranslations({ locale, namespace: "navigation" }); // For breadcrumbs
  const languagesResult = await getLanguages();
  const languages = languagesResult.success ? languagesResult.languages : [];

  // The NewLabelForm will handle the notification display based on form state.
  // This page component focuses on layout.

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Page Header Section */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-6">
        <div className="flex items-center justify-between">
          <LocaleLink
            href="/admin"
            className="flex items-center text-[#58a6ff] hover:text-[#4393e6] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            <span>{navT("back_to_admin")}</span>
          </LocaleLink>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-2 flex items-center">
          <TagIcon className="h-8 w-8 mr-3 text-[#58a6ff]" /> {/* Using TagIcon */}
          {t("pageTitle")}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t("pageDescription")}
        </p>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t("header.home")}</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t("header.adminPanel")}</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">{t("header.addNewLabel")}</span>
        </div>
      </section>
      
      {/* Main content: Form Card */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 w-full">
        {!languagesResult.success || languages.length === 0 ? (
          <div className="bg-red-900/20 border border-red-600/30 text-red-400 px-4 py-3 rounded-lg flex items-start">
            <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-red-400" />
            <p className="font-medium">{languagesResult.error || commonT("error.noLanguagesConfigured")}</p>
          </div>
        ) : (
          <div className="bg-[#1a2239] rounded-xl border border-[#30364a] overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-[#1a2239] to-[#192036] p-6 border-b border-[#30364a]">
              <h2 className="text-xl font-medium text-[#58a6ff]">{t("form.labelInfoTitle")}</h2>
              <p className="text-gray-400 text-sm mt-1">{t("form.requiredFieldsNote")}</p>
            </div>
            {/* NewLabelForm is already designed to take languages and handle its internal state */}
            <div className="p-6"> {/* Added padding around the form itself */}
              <NewLabelForm languages={languages} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
