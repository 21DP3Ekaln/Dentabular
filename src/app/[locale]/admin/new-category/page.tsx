'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import LocaleLink from '@/app/components/LocaleLink'
import { useTranslations } from 'next-intl'
import { createCategory, getLanguages } from '@/app/actions/categoryActions'
import {
  TagIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

// Types for form data
type FormData = {
  translations: Record<string, string>
}

// Type for language
type Language = {
  id: number
  code: string
  name: string
  isDefault: boolean
  isEnabled: boolean
}

export default function NewCategoryPage() {
  const t = useTranslations('AdminNewCategory') // Initialize translations
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    translations: {}
  })
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Load languages for the form
  useEffect(() => {
    const loadFormData = async () => {
      setLoading(true)

      try {
        const languagesResponse = await getLanguages()

        if (languagesResponse.success) {
          setLanguages(languagesResponse.languages)
          
          // Initialize translations object with empty strings for each language
          const initialTranslations: Record<string, string> = {}
          languagesResponse.languages.forEach(lang => {
            initialTranslations[lang.id.toString()] = ''
          })
          
          setFormData({ translations: initialTranslations })
        } else {
          setNotification({
            type: 'error',
            message: languagesResponse.error || t('notifications.loadLanguagesError')
          })
        }
      } catch (error) {
        console.error('Error loading languages:', error)
        setNotification({
          type: 'error',
          message: t('notifications.loadFormDataError')
        })
      } finally {
        setLoading(false)
      }
    }

    loadFormData()
  }, [t])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, languageId: number) => {
    const { value } = e.target
    
    setFormData(prev => ({
      translations: {
        ...prev.translations,
        [languageId]: value
      }
    }))

    // Clear error for this field if it exists
    if (errors[`lang_${languageId}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`lang_${languageId}`]
        return newErrors
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setNotification(null) // Clear any previous notifications
    setErrors({}) // Clear previous errors

    try {
      // Validate form data - Both Latvian and English names are required
      const validationErrors: Record<string, string> = {}
      const lvLang = languages.find(lang => lang.code === 'lv');
      const enLang = languages.find(lang => lang.code === 'en');

      // It's unlikely languages won't be found if loaded correctly, but good practice to check
      if (!lvLang) {
        console.error("Latvian language configuration not found.");
        validationErrors['general'] = t('notifications.languageLoadError'); // Use a general error key
      } else if (!formData.translations[lvLang.id]?.trim()) {
        validationErrors[`lang_${lvLang.id}`] = t('validation.nameRequiredSpecific', { language: lvLang.name });
      }

      if (!enLang) {
        console.error("English language configuration not found.");
        validationErrors['general'] = t('notifications.languageLoadError'); // Use a general error key
      } else if (!formData.translations[enLang.id]?.trim()) {
        validationErrors[`lang_${enLang.id}`] = t('validation.nameRequiredSpecific', { language: enLang.name });
      }

      // If there are validation errors, display them and stop submission
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        // Determine the appropriate notification message
        let notificationMessage = t('notifications.fillRequiredFields');
        if (validationErrors['general']) {
            notificationMessage = validationErrors['general'];
        } else if (validationErrors[`lang_${lvLang?.id}`] && validationErrors[`lang_${enLang?.id}`]) {
            notificationMessage = t('notifications.fillRequiredLvEn'); // Specific message if both are missing
        } else if (validationErrors[`lang_${lvLang?.id}`]) {
            // Use non-null assertion (!) as lvLang is guaranteed to exist here if this error key is present
            notificationMessage = t('validation.nameRequiredSpecific', { language: lvLang!.name });
        } else if (validationErrors[`lang_${enLang?.id}`]) {
            // Use non-null assertion (!) as enLang is guaranteed to exist here if this error key is present
            notificationMessage = t('validation.nameRequiredSpecific', { language: enLang!.name });
        }
        setNotification({ type: 'error', message: notificationMessage });
        setIsSubmitting(false)
        return
      }

      // Format data for submission
      const dataToSubmit = Object.entries(formData.translations).reduce((acc, [langId, name]) => {
        if (name.trim()) {
          acc[langId] = name.trim()
        }
        return acc
      }, {} as Record<string, string>)

      const result = await createCategory(dataToSubmit)

      if (result.success) {
        setNotification({
          type: 'success',
          message: t('notifications.createSuccess')
        })

        // Reset form
        const resetTranslations: Record<string, string> = {}
        languages.forEach(lang => {
          resetTranslations[lang.id.toString()] = ''
        })
        setFormData({ translations: resetTranslations })

        // Redirect to categories page after a short delay
        setTimeout(() => {
          router.push('/admin/categories')
        }, 2000)
      } else {
        setNotification({
          type: 'error',
          message: result.error || t('notifications.createError')
        })
      }
    } catch (error) {
      console.error('Error creating category:', error)
      let errorMessage = t('notifications.unexpectedError')

      if (error instanceof Error) {
        errorMessage = `${t('notifications.errorPrefix')}: ${error.message}`
      }

      setNotification({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f23] text-[#eaeaea]">
      {/* Page title */}
      <section className="relative mx-4 sm:mx-8 lg:mx-auto max-w-6xl mt-6 mb-6">
        <div className="flex items-center justify-between">
          <LocaleLink
            href="/admin"
            className="flex items-center text-[#58a6ff] hover:text-[#4393e6] transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            <span>{t('backToDashboard')}</span>
          </LocaleLink>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-2 flex items-center">
          <TagIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('pageTitle')}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t('pageDescription')}
        </p>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('header.home')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t('header.adminPanel')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">{t('header.addNewCategory')}</span> {/* Current page */}
        </div>
      </section>

      {/* Success/Error Messages */}
      {notification && (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-6">
          <div className={`bg-${notification.type === 'success' ? 'green' : 'red'}-900/20 border border-${notification.type === 'success' ? 'green' : 'red'}-600/30 text-${notification.type === 'success' ? 'green' : 'red'}-400 px-4 py-3 rounded-lg flex items-start`}>
            <CheckCircleIcon className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${notification.type === 'success' ? 'text-green-400' : 'text-red-400'}`} />
            <div>
              <p className="font-medium">{notification.message}</p>
              {notification.type === 'success' && (
                <p className="text-sm mt-1">{t('notifications.redirecting')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#58a6ff] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">{t('loadingForm')}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a2239] rounded-xl border border-[#30364a] overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-[#1a2239] to-[#192036] p-6 border-b border-[#30364a]">
                <h2 className="text-xl font-medium text-[#58a6ff]">{t('form.categoryInfoTitle')}</h2>
                <p className="text-gray-400 text-sm mt-1">{t('form.requiredFieldsNote')}</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {languages.map(language => (
                    <div key={language.id} className="bg-[#10142a]/40 p-6 rounded-xl border border-[#30364a]/50">
                      <div className="mb-4">
                        <div className="inline-block px-2 py-1 bg-[#58a6ff]/10 text-[#58a6ff] text-xs rounded-full mb-2">
                          {language.name} ({language.code.toUpperCase()})
                          {/* Default language tag removed */}
                        </div>

                        <label className="block text-gray-300 mb-2 font-medium">
                          {t('form.nameLabel', { language: language.name })}
                          {/* Add asterisk if LV or EN */}
                          {(language.code === 'lv' || language.code === 'en') && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type="text"
                          value={formData.translations[language.id] || ''}
                          onChange={(e) => handleChange(e, language.id)}
                          className={`w-full p-3 bg-[#10142a] border ${
                            errors[`lang_${language.id}`] ? 'border-red-500' : 'border-[#30364a]'
                          } rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]`}
                          placeholder={t('form.namePlaceholder', { language: language.name })}
                        />
                        {errors[`lang_${language.id}`] && (
                          <p className="mt-1 text-red-500 text-sm">{errors[`lang_${language.id}`]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submission Status */}
                <div className="flex items-center justify-center text-gray-400 text-sm mt-6">
                  <div className="bg-[#10142a]/40 border border-[#30364a] p-4 rounded-lg">
                    <p className="text-center">
                      {t('form.categoryNote')}
                    </p>
                  </div>
                </div>

                {/* Form actions */}
                <div className="mt-8 flex items-center justify-end gap-4">
                  <LocaleLink
                    href="/admin"
                    className="px-6 py-3 border border-[#30364a] text-gray-300 rounded-lg hover:bg-[#10142a] hover:text-white transition-all"
                  >
                    {t('form.cancelButton')}
                  </LocaleLink>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                        {t('form.submittingButton')}
                      </>
                    ) : (
                      <>
                        <TagIcon className="h-5 w-5 mr-2" />
                        {t('form.submitButton')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
      </main>

    </div>
  )
}
