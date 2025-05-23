'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'; // Keep locale-aware useRouter
import LocaleLink from '@/app/components/LocaleLink'; // Import LocaleLink
import { useTranslations } from 'next-intl'; // Import useTranslations
import { createTermDraft, getCategories, getLabels } from '@/app/actions/adminActions'
import {
  DocumentPlusIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TagIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'

// Types for form data
type FormData = {
  lvName: string
  lvDescription: string
  enName: string
  enDescription: string
  categoryId: number | null
  labels: string[]
}

// Types for categories and labels
type CategoryTranslation = {
  name: string
  languageId: number
  language?: {
    code: string
    name: string
  }
}

type Category = {
  id: number
  translations: CategoryTranslation[]
}

type LabelTranslation = {
  name: string
  languageId: number
  language?: {
    code: string
    name: string
  }
}

type Label = {
  id: number
  translations: LabelTranslation[]
}

export default function NewTermPage() {
  const t = useTranslations('AdminNewTerm'); // Initialize translations
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    lvName: '',
    lvDescription: '',
    enName: '',
    enDescription: '',
    categoryId: null,
    labels: []
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Load categories and labels for the form
  useEffect(() => {
    const loadFormData = async () => {
      setLoading(true)

      try {
        const [categoriesResponse, labelsResponse] = await Promise.all([
          getCategories(),
          getLabels()
        ]);

        // Set categories
        if (categoriesResponse.success && categoriesResponse.categories.length > 0) {
          setCategories(categoriesResponse.categories);

          // Set default category (first one)
          setFormData(prev => ({
            ...prev,
            categoryId: categoriesResponse.categories[0].id
          }));
        } else if (categoriesResponse.success && categoriesResponse.categories.length === 0) {
          setNotification({
            type: 'error',
            message: t('notifications.noCategories') // Translate
          });
        } else {
          setNotification({
            type: 'error',
            message: categoriesResponse.error || t('notifications.loadCategoriesError') // Translate
          });
        }

        // Set labels
        if (labelsResponse.success) {
          setLabels(labelsResponse.labels);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
        setNotification({
          type: 'error',
          message: t('notifications.loadFormDataError') // Translate
        });
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  // Helper function to get category name by language with better error handling
  const getCategoryName = (category: Category, languageId: number): string => {
    const translation = category.translations.find(t => t.languageId === languageId);
    return translation?.name || category.translations[0]?.name || t('unnamedCategory'); // Translate fallback
  };

  // Helper function to get label name by language
  const getLabelName = (label: Label, languageId: number): string => {
    const translation = label.translations.find(t => t.languageId === languageId);
    return translation?.name || label.translations[0]?.name || t('unnamedLabel'); // Translate fallback
  };

  // Handle form input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    if (name === 'categoryId') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? Number(value) : null
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Clear error for this field if it exists
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setNotification(null) // Clear any previous notifications

    try {
      // Validate form data
      const validationErrors: Partial<Record<keyof FormData, string>> = {};

      if (!formData.lvName) {
        validationErrors.lvName = t('validation.lvNameRequired'); // Translate
      }

      if (!formData.enName) {
        validationErrors.enName = t('validation.enNameRequired'); // Translate
      }

      if (!formData.categoryId) {
        validationErrors.categoryId = t('validation.categoryRequired'); // Translate
      }

      // If there are validation errors, display them and stop submission
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setNotification({
          type: 'error',
          message: t('notifications.fillRequiredFields') // Translate
        });
        setIsSubmitting(false);
        return;
      }

      // Convert categoryId to number before submission and ensure labels is an array
      const dataToSubmit = {
        ...formData,
        categoryId: formData.categoryId ? Number(formData.categoryId) : 0,
        labels: formData.labels || [] // Ensure labels is always an array
      }

      console.log("Submitting form data:", JSON.stringify(dataToSubmit, null, 2))

      const result = await createTermDraft(dataToSubmit)

      console.log("Server response:", JSON.stringify(result, null, 2))

      if (result.success) {
        setNotification({
          type: 'success',
          message: t('notifications.createSuccess') // Translate
        })

        // Reset form
        setFormData({
          lvName: '',
          lvDescription: '',
          enName: '',
          enDescription: '',
          categoryId: null,
          labels: []
        })

        // Redirect to pending terms page after a short delay
        setTimeout(() => {
          router.push('/admin/pending-terms')
        }, 2000)
      } else {
        console.error("Error from server:", result.error)
        setNotification({
          type: 'error',
          message: result.error || t('notifications.createError') // Translate
        })
      }
    } catch (error) {
      console.error('Error creating term draft:', error)
      let errorMessage = t('notifications.unexpectedError'); // Translate

      if (error instanceof Error) {
        errorMessage = `${t('notifications.errorPrefix')}: ${error.message}`; // Translate
      }

      setNotification({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle multi-select for labels
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target
    console.log("Label change:", value, checked)

    if (checked) {
      setFormData(prev => {
        const newLabels = [...prev.labels, value];
        console.log("Updated labels (added):", newLabels);
        return {
          ...prev,
          labels: newLabels
        };
      });
    } else {
      setFormData(prev => {
        const newLabels = prev.labels.filter(id => id !== value);
        console.log("Updated labels (removed):", newLabels);
        return {
          ...prev,
          labels: newLabels
        };
      });
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
            <span>{t('backToDashboard')}</span> {/* Translate */}
          </LocaleLink>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-2 flex items-center">
          <DocumentPlusIcon className="h-8 w-8 mr-3 text-[#58a6ff]" />
          {t('pageTitle')} {/* Translate */}
        </h1>
        <p className="text-gray-400 max-w-3xl">
          {t('pageDescription')} {/* Translate */}
        </p>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-400 bg-[#10142a]/20 py-3 px-4 rounded-lg">
          <LocaleLink href="/" className="hover:text-[#58a6ff] transition-colors">{t('header.home')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <LocaleLink href="/admin" className="hover:text-[#58a6ff] transition-colors">{t('header.adminPanel')}</LocaleLink>
          <span className="text-gray-600">/</span>
          <span className="text-[#58a6ff]">{t('header.addNewTerm')}</span> {/* Current page */}
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
                <p className="text-sm mt-1">{t('notifications.redirecting')}</p> // Translate
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
                <p className="text-gray-400">{t('loadingForm')}</p> {/* Translate */}
              </div>
            </div>
          ) : (
            <div className="bg-[#1a2239] rounded-xl border border-[#30364a] overflow-hidden shadow-xl">
              <div className="bg-gradient-to-r from-[#1a2239] to-[#192036] p-6 border-b border-[#30364a]">
                <h2 className="text-xl font-medium text-[#58a6ff]">{t('form.termInfoTitle')}</h2> {/* Translate */}
                <p className="text-gray-400 text-sm mt-1">{t('form.requiredFieldsNote')}</p> {/* Translate */}
              </div>

              <form onSubmit={handleSubmit} className="p-6">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Left column - Latvian */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-[#1a2239] to-[#283459] p-6 rounded-xl border border-[#30364a]/80 relative overflow-hidden">
                    {/* Background decorative element */}
                    <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#58a6ff]/5 rounded-full"></div>
                    <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-[#58a6ff]/5 rounded-full"></div>

                    <div className="relative">
                      <div className="inline-block px-2 py-1 bg-[#58a6ff]/10 text-[#58a6ff] text-xs rounded-full mb-4">
                        {t('form.latvianLabel')} {/* Translate */}
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-300 mb-2 font-medium">
                          {t('form.lvNameLabel')} * {/* Translate */}
                        </label>
                        <input
                          type="text"
                          name="lvName"
                          value={formData.lvName}
                          onChange={handleChange}
                          className={`w-full p-3 bg-[#10142a] border ${errors.lvName ? 'border-red-500' : 'border-[#30364a]'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]`}
                          placeholder={t('form.lvNamePlaceholder')} // Translate
                        />
                        {errors.lvName && (
                          <p className="mt-1 text-red-500 text-sm">{errors.lvName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-300 mb-2 font-medium">
                          {t('form.lvDescriptionLabel')} * {/* Translate */}
                        </label>
                        <textarea
                          name="lvDescription"
                          value={formData.lvDescription}
                          onChange={handleChange}
                          rows={7}
                          className={`w-full p-3 bg-[#10142a] border ${errors.lvDescription ? 'border-red-500' : 'border-[#30364a]'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] resize-none`}
                          placeholder={t('form.lvDescriptionPlaceholder')} // Translate
                        ></textarea>
                        {errors.lvDescription && (
                          <p className="mt-1 text-red-500 text-sm">{errors.lvDescription}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column - English */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-[#1a2239] to-[#283459] p-6 rounded-xl border border-[#30364a]/80 relative overflow-hidden">
                    {/* Background decorative element */}
                    <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#58a6ff]/5 rounded-full"></div>
                    <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-[#58a6ff]/5 rounded-full"></div>

                    <div className="relative">
                      <div className="inline-block px-2 py-1 bg-[#58a6ff]/10 text-[#58a6ff] text-xs rounded-full mb-4">
                        {t('form.englishLabel')} {/* Translate */}
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-300 mb-2 font-medium">
                          {t('form.enNameLabel')} * {/* Translate */}
                        </label>
                        <input
                          type="text"
                          name="enName"
                          value={formData.enName}
                          onChange={handleChange}
                          className={`w-full p-3 bg-[#10142a] border ${errors.enName ? 'border-red-500' : 'border-[#30364a]'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]`}
                          placeholder={t('form.enNamePlaceholder')} // Translate
                        />
                        {errors.enName && (
                          <p className="mt-1 text-red-500 text-sm">{errors.enName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-gray-300 mb-2 font-medium">
                          {t('form.enDescriptionLabel')} * {/* Translate */}
                        </label>
                        <textarea
                          name="enDescription"
                          value={formData.enDescription}
                          onChange={handleChange}
                          rows={7}
                          className={`w-full p-3 bg-[#10142a] border ${errors.enDescription ? 'border-red-500' : 'border-[#30364a]'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff] resize-none`}
                          placeholder={t('form.enDescriptionPlaceholder')} // Translate
                        ></textarea>
                        {errors.enDescription && (
                          <p className="mt-1 text-red-500 text-sm">{errors.enDescription}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories and Labels Section */}
              <div className="mt-8 grid md:grid-cols-2 gap-8">
                {/* Categories */}
                <div className="bg-[#1a2239] p-6 rounded-xl border border-[#30364a]">
                  <div className="flex items-center mb-4">
                    <TagIcon className="h-5 w-5 text-[#58a6ff] mr-2" />
                    <h3 className="text-lg font-medium text-white">{t('form.categoryLabel')} *</h3> {/* Translate */}
                  </div>

                  <div className="mb-3">
                    <select
                      name="categoryId"
                      value={formData.categoryId !== null ? formData.categoryId.toString() : ''}
                      onChange={handleChange}
                      className={`w-full p-3 bg-[#10142a] border ${errors.categoryId ? 'border-red-500' : 'border-[#30364a]'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/40 focus:border-[#58a6ff]`}
                    >
                      <option value="">{t('form.selectCategoryPlaceholder')}</option> {/* Translate */}
                      {categories.length > 0 ? (
                        categories.map(category => (
                          <option key={category.id} value={category.id.toString()}>
                            {getCategoryName(category, 2)} ({getCategoryName(category, 1)})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>{t('form.noCategoriesOption')}</option> // Translate
                      )}
                    </select>
                    {errors.categoryId && (
                      <p className="mt-1 text-red-500 text-sm">{errors.categoryId}</p>
                    )}
                    {categories.length === 0 && (
                      <p className="mt-1 text-amber-500 text-sm">{t('form.noCategoriesWarning')}</p> // Translate
                    )}
                  </div>

                  <p className="text-gray-400 text-sm italic">
                    {t('form.categoryHelpText')} {/* Translate */}
                  </p>
                </div>

                {/* Labels */}
                <div className="bg-[#1a2239] p-6 rounded-xl border border-[#30364a]">
                  <div className="flex items-center mb-4">
                    <BookmarkIcon className="h-5 w-5 text-[#58a6ff] mr-2" />
                    <h3 className="text-lg font-medium text-white">{t('form.labelsLabel')}</h3> {/* Translate */}
                  </div>

                  <div className="mb-2">
                    <p className="text-gray-400 text-sm mb-3">
                      {t('form.labelsHelpText')} {/* Translate */}
                    </p>

                    {labels.length > 0 ? (
                      // Apply Tailwind classes for scrollbar styling (basic)
                      <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-2 scrollbar scrollbar-thumb-[#30364a] scrollbar-track-[#10142a] hover:scrollbar-thumb-[#4a5169]">
                        {labels.map(label => (
                          <div key={label.id} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`label-${label.id}`}
                              name="label"
                              value={label.id}
                              onChange={handleLabelChange}
                              className="w-4 h-4 bg-[#10142a] border border-[#30364a] rounded text-[#58a6ff] focus:ring-[#58a6ff]/40"
                            />
                            <label htmlFor={`label-${label.id}`} className="ml-2 text-sm text-gray-300">
                              {getLabelName(label, 2)} ({getLabelName(label, 1)})
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">{t('form.noLabelsAvailable')}</p> // Translate
                    )}
                  </div>
                </div>
              </div>

              {/* Submission Status */}
              <div className="flex items-center justify-center text-gray-400 text-sm mt-6">
                <div className="bg-[#10142a]/40 border border-[#30364a] p-4 rounded-lg">
                  <p className="text-center">
                    {t('form.draftNotice')} {/* Translate */}
                  </p>
                </div>
              </div>

              {/* Form actions */}
              <div className="mt-8 flex items-center justify-end gap-4">
                <LocaleLink
                  href="/admin"
                  className="px-6 py-3 border border-[#30364a] text-gray-300 rounded-lg hover:bg-[#10142a] hover:text-white transition-all"
                >
                  {t('form.cancelButton')} {/* Translate */}
                </LocaleLink>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-[#58a6ff] to-[#4393e6] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      {t('form.submittingButton')} {/* Translate */}
                    </>
                  ) : (
                    <>
                      <DocumentPlusIcon className="h-5 w-5 mr-2" />
                      {t('form.submitButton')} {/* Translate */}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Removed <style jsx> block as styles are now handled by Tailwind */}
    </div>
  )
}
