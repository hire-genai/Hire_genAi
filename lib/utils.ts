import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Validate whether a string is a proper UUID
export function isValidUUID(val: string | null | undefined): boolean {
  return !!val && UUID_REGEX.test(val)
}

// Validate and throw error if UUID is invalid
export function validateUUID(val: string | null | undefined, name = 'UUID'): string {
  if (!isValidUUID(val)) {
    throw new Error(`Invalid ${name} format`)
  }
  return val!
}
