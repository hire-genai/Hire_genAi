import { neon } from '@neondatabase/serverless'

const getDatabaseUrl = () => {
  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL
}

// Create a prisma-compatible wrapper around Neon serverless driver
const createPrismaCompatible = () => {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }

  // Use fullResults: true so .query() returns { rows, fields, ... }
  const sql = neon(databaseUrl, { fullResults: true })

  return {
    $queryRawUnsafe: async (query: string, ...params: any[]) => {
      try {
        // Use sql.query() for conventional parameterized queries with $1, $2, etc.
        const result = await sql.query(query, params)
        return (result as any).rows as any[]
      } catch (error: any) {
        console.error('Database query error:', error.message)
        throw error
      }
    },
  }
}

// Singleton instance
let prismaInstance: ReturnType<typeof createPrismaCompatible> | null = null

export const prisma = (() => {
  if (!prismaInstance) {
    prismaInstance = createPrismaCompatible()
  }
  return prismaInstance
})()
