'use client'

import { Button } from '@/components/ui/button'
import { XCircle, Wallet } from 'lucide-react'

interface LowBalancePopupProps {
  show: boolean
  onClose: () => void
  onRecharge?: () => void
  title?: string
  message?: string
}

/**
 * Reusable Low Balance Popup for AI Interview features.
 * Shows when trial is expired and wallet balance < 500.
 */
export function LowBalancePopup({
  show,
  onClose,
  onRecharge,
  title = 'Interview Access Blocked',
  message = 'Interview link expired.\nWallet balance is low.\nPlease recharge your wallet to continue.'
}: LowBalancePopupProps) {
  if (!show) return null

  const handleRecharge = () => {
    onClose()
    if (onRecharge) {
      onRecharge()
    } else {
      window.location.href = '/settings?tab=payment'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl">
        <div className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {title}
            </h3>
            <p className="text-base text-gray-600 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleRecharge}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg gap-2 transition-colors"
            >
              <Wallet className="h-5 w-5" />
              Recharge Wallet
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full font-semibold py-2.5 rounded-lg border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
