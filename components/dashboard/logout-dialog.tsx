'use client'

import { useState } from 'react'
import { LogOut, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LogoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function LogoutDialog({ open, onOpenChange, onConfirm }: LogoutDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-gray-200">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <LogOut className="w-6 h-6 text-red-600" />
          </div>
          <DialogTitle className="text-center mt-4">Confirm Logout</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to logout? You'll need to login again to access your account.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              'Logging out...'
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Yes, Logout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
