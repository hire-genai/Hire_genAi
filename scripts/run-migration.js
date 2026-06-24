#!/usr/bin/env node
/**
 * Run a SQL migration file against Neon DB.
 * Usage: node scripts/run-migration.js <migration-file>
 *
 * Properly handles:
 *  - semicolons inside single-line comments (-- ...)
 *  - semicolons inside block comments (/* ... *\/)
 *  - semicolons inside string literals ('...')
 */
const { neon } = require('@neondatabase/serverless')
require('dotenv').config({ path: '.env.local' })
const fs = require('fs')

function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let i = 0

  while (i < sql.length) {
    const ch = sql[i]

    // Single-line comment: consume until newline
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        current += sql[i++]
      }
      continue
    }

    // Block comment: consume until */
    if (ch === '/' && sql[i + 1] === '*') {
      current += sql[i++] // /
      current += sql[i++] // *
      while (i < sql.length) {
        if (sql[i] === '*' && sql[i + 1] === '/') {
          current += sql[i++] // *
          current += sql[i++] // /
          break
        }
        current += sql[i++]
      }
      continue
    }

    // String literal: consume until closing quote (handle '' escape)
    if (ch === "'") {
      current += sql[i++]
      while (i < sql.length) {
        if (sql[i] === "'") {
          current += sql[i++]
          if (sql[i] === "'") { // escaped quote ''
            current += sql[i++]
            continue
          }
          break
        }
        current += sql[i++]
      }
      continue
    }

    // Statement end
    if (ch === ';') {
      const trimmed = current.trim()
      if (trimmed) statements.push(trimmed)
      current = ''
      i++
      continue
    }

    current += sql[i++]
  }

  // Trailing statement without semicolon
  const trimmed = current.trim()
  if (trimmed) statements.push(trimmed)

  return statements
}

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error('Usage: node scripts/run-migration.js <migration-file>')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
  const content = fs.readFileSync(file, 'utf8')
  const statements = splitSqlStatements(content).filter(s => {
    // Skip pure comment blocks
    const noComments = s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
    return noComments.length > 0
  })

  console.log(`Running ${file} — ${statements.length} statements`)

  let ok = 0, failed = 0
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    try {
      await sql.query(stmt)
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 80)
      console.log(`  [${i + 1}/${statements.length}] OK — ${preview}`)
      ok++
    } catch (e) {
      console.error(`  [${i + 1}/${statements.length}] ERROR: ${e.message}`)
      console.error(`  Statement: ${stmt.slice(0, 200)}`)
      failed++
    }
  }

  console.log(`\nDone: ${ok} ok, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
