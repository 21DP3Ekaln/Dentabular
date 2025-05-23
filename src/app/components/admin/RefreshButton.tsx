'use client'

import { ArrowPathIcon } from '@heroicons/react/24/outline'

export default function RefreshButton() {
  return (
    <button 
      onClick={() => window.location.reload()}
      className="flex items-center text-gray-400 hover:text-white transition-colors"
    >
      <ArrowPathIcon className="h-4 w-4 mr-1" />
      <span>Refresh</span>
    </button>
  )
} 