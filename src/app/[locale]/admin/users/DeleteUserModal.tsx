'use client'

import { useTranslations } from 'next-intl'; // Import useTranslations
import { XMarkIcon } from '@heroicons/react/24/outline'

type User = {
  id: number
  email: string
  fullName: string
  isAdmin: boolean
  isDisabled: boolean
}

interface DeleteUserModalProps {
  user: User
  isLoading: boolean
  onDelete: () => void
  onCancel: () => void
}

export default function DeleteUserModal({
  user,
  isLoading,
  onDelete,
  onCancel
}: DeleteUserModalProps) {
  const t = useTranslations('AdminDeleteUserModal'); // Initialize translations
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-900/75 transition-opacity" onClick={onCancel} />
        <div className="relative transform overflow-hidden rounded-lg bg-[#1a2239] border border-[#30364a] text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-white">
                  {t('title')} {/* Translate */}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-300">
                    {t('confirmationText', { userName: user.fullName })} {/* Translate */}
                  </p>
                  
                  <div className="mt-3 p-3 bg-[#10142a] rounded-md">
                    <div className="text-xs text-gray-400">{t('userInfoTitle')}</div> {/* Translate */}
                    <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-400">{t('labels.fullName')}:</div> {/* Translate */}
                      <div className="text-white font-medium">{user.fullName}</div>
                      <div className="text-gray-400">{t('labels.email')}:</div> {/* Translate */}
                      <div className="text-white font-medium">{user.email}</div>
                      <div className="text-gray-400">{t('labels.role')}:</div> {/* Translate */}
                      <div className="text-white font-medium">{user.isAdmin ? t('roles.admin') : t('roles.user')}</div> {/* Translate */}
                      <div className="text-gray-400">{t('labels.status')}:</div> {/* Translate */}
                      <div className="text-white font-medium">{user.isDisabled ? t('status.disabled') : t('status.active')}</div> {/* Translate */}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-amber-400">
                    <strong>{t('warningTitle')}:</strong> {t('warningText')} {/* Translate */}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              disabled={isLoading}
              onClick={onDelete}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-700 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('buttons.deleting')} {/* Translate */}
                </>
              ) : (
                t('buttons.delete') // Translate
              )}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="mt-3 inline-flex w-full justify-center rounded-md border border-[#30364a] bg-[#1a2239] px-4 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-[#232c45] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('buttons.cancel')} {/* Translate */}
            </button>
          </div>
          
          <button
            type="button"
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 focus:outline-none"
            onClick={onCancel}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
