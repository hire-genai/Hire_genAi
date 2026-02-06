// Test the dynamic domain configuration
// This file can be used for testing purposes

import { getDomainConfig, getAppUrl, getWwwUrl } from './domain-config'

// Test cases
console.log('=== Domain Configuration Tests ===')

// Test localhost
console.log('\n1. Localhost:')
console.log('getDomainConfig():', getDomainConfig())
console.log('getAppUrl("/login"):', getAppUrl('/login'))
console.log('getWwwUrl("/about"):', getWwwUrl('/about'))

// Test production domain
console.log('\n2. Production (hiregenai.com):')
// Simulate production environment
const originalWindow = global.window
global.window = { location: { hostname: 'www.hiregenai.com' } } as any

console.log('getDomainConfig():', getDomainConfig())
console.log('getAppUrl("/login"):', getAppUrl('/login'))
console.log('getWwwUrl("/about"):', getWwwUrl('/about'))

// Test custom domain
console.log('\n3. Custom domain (example.com):')
global.window = { location: { hostname: 'www.example.com' } } as any

console.log('getDomainConfig():', getDomainConfig())
console.log('getAppUrl("/login"):', getAppUrl('/login'))
console.log('getWwwUrl("/about"):', getWwwUrl('/about'))

// Restore original window
global.window = originalWindow

console.log('\n=== Tests Complete ===')
