"use client";

import { useEffect, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation"; // For redirecting or cancel
import { createLabel, CreateLabelFormState } from "@/app/actions/labelActions";
import type { Language } from "@/types/i18n";
import { CheckCircleIcon, ArrowPathIcon, TagIcon } from "@heroicons/react/24/outline";
import LocaleLink from "@/app/components/LocaleLink";


interface NewLabelFormProps {
  languages: Pick<Language, "id" | "code" | "name">[];
}

const initialState: CreateLabelFormState = {
  success: false,
  message: "",
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("common"); // Changed to lowercase
  // const adminT = useTranslations("AdminNewLabel"); // Removed as t("save") from Common is used
  return (
    <button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="px-6 py-3 bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
    >
      {pending ? (
        <>
          <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
          {t("saving")}
        </>
      ) : (
        <>
          <TagIcon className="h-5 w-5 mr-2" /> {/* Or CheckCircleIcon */}
          {t("save")} 
        </>
      )}
    </button>
  );
}

export default function NewLabelForm({ languages }: NewLabelFormProps) {
  const [state, formAction] = useActionState(createLabel, initialState);
  const t = useTranslations("AdminNewLabel");
  // const commonT = useTranslations("Common"); // Removed as not directly used here
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null); // Ref to reset the form

  useEffect(() => {
    if (state.success) {
      // Reset form fields
      formRef.current?.reset();
      // Optionally, redirect after a delay or show persistent success
      // For now, message is displayed via the notification div.
      // setTimeout(() => router.push('/admin/labels'), 2000); // Example redirect
    }
  }, [state.success, router]);
  
  // Determine notification message based on state
  let notification = null;
  if (state.message) {
    if (state.success) {
      notification = { type: 'success' as const, message: t('notifications.createSuccess') };
    } else if (state.errors?.general?.length) {
      notification = { type: 'error' as const, message: state.errors.general.join(', ') };
    } else if (Object.keys(state.errors?.translations || {}).length > 0) {
      notification = { type: 'error' as const, message: t('notifications.validationError') };
    } else {
      notification = { type: 'error' as const, message: state.message || t('notifications.generalError') };
    }
  }


  return (
    <>
      {/* Success/Error Messages */}
      {notification && (
        <div className="mb-6">
          <div className={`bg-${notification.type === 'success' ? 'green' : 'red'}-900/20 border border-${notification.type === 'success' ? 'green' : 'red'}-600/30 text-${notification.type === 'success' ? 'green' : 'red'}-400 px-4 py-3 rounded-lg flex items-start`}>
            <CheckCircleIcon className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${notification.type === 'success' ? 'text-green-400' : 'text-red-400'}`} />
            <div>
              <p className="font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-8">
        <div className="space-y-6">
          {languages.map((lang) => (
            <div key={lang.code} className="bg-[#10142a]/40 p-6 rounded-xl border border-[#30364a]/50">
              <div className="mb-1">
                <div className="inline-block px-2 py-1 bg-[#58a6ff]/10 text-[#58a6ff] text-xs rounded-full mb-2">
                  {lang.name} ({lang.code.toUpperCase()})
                </div>
                <label htmlFor={`labelName-${lang.code}`} className="block text-gray-300 mb-2 font-medium">
                  {t("form.languageInputLabel", { languageName: lang.name, languageCode: lang.code.toUpperCase() })}
                </label>
                <input
                  type="text"
                  id={`labelName-${lang.code}`}
                  name={`translations.${lang.code}.name`}
                  className={`w-full p-3 bg-[#10142a] border ${
                    state.errors?.translations?.[lang.code] ? 'border-red-500' : 'border-[#30364a]'
                  } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]`}
                  placeholder={t("form.inputPlaceholder", { languageName: lang.name })}
                  aria-describedby={state.errors?.translations?.[lang.code] ? `error-name-${lang.code}` : undefined}
                />
                {state.errors?.translations?.[lang.code] && (
                  <p id={`error-name-${lang.code}`} className="mt-1 text-red-500 text-sm">
                    {state.errors.translations[lang.code]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* General errors not tied to a specific field */}
        {state.errors?.general && !notification && ( // Show only if not already covered by main notification
          <div className="text-sm text-red-500 bg-red-900/20 border border-red-600/30 p-3 rounded-lg">
            {state.errors.general.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}

        {/* Form actions */}
        <div className="mt-8 flex items-center justify-end gap-4">
          <LocaleLink
            href="/admin" // Or specific admin labels list page if it exists
            className="px-6 py-3 border border-[#30364a] text-gray-300 rounded-lg hover:bg-[#10142a] hover:text-white transition-all"
          >
            {t('form.cancelButton')}
          </LocaleLink>
          <SubmitButton />
        </div>
      </form>
    </>
  );
}
