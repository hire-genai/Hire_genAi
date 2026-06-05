import fs from 'fs'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth', 'user.json')

export default async function globalTeardown(): Promise<void> {
  if (fs.existsSync(AUTH_FILE)) {
    fs.unlinkSync(AUTH_FILE)
    console.log(`[global.teardown] Removed ${AUTH_FILE}`)
  }
  console.log('[global.teardown] Teardown complete.')
}
