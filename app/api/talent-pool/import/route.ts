import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { cookies } from 'next/headers'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!DatabaseService.isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Get the form data with the file
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    // Get companyId and userId from session
    let companyId: string | null = null
    let userId: string | null = null

    try {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get('session')
      if (sessionCookie?.value) {
        const session = JSON.parse(sessionCookie.value)
        companyId = session.companyId || session.company?.id || null
        userId = session.userId || session.user?.id || null
      }
    } catch {
      console.log('Failed to parse session cookie for talent-pool import')
    }

    if (!companyId) {
      // Try to get companyId from the formData if available
      const formCompanyId = formData.get('companyId')
      if (formCompanyId && typeof formCompanyId === 'string') {
        companyId = formCompanyId
      } else {
        return NextResponse.json({ error: 'Company ID is required. Please refresh the page and try again.' }, { status: 400 })
      }
    }
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Parse Excel/CSV file
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json({ error: 'No data found in the file' }, { status: 400 })
    }

    console.log(`📊 Importing ${jsonData.length} candidates from Excel`)

    // Process each row and insert into database
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const row of jsonData as any[]) {
      try {
        // Map Excel columns to database fields
        const name = row['Name'] || row['Full Name'] || row['name'] || row['full_name'] || ''
        const email = row['Email'] || row['email'] || row['Email Address'] || ''
        const phone = row['Phone'] || row['phone'] || row['Phone Number'] || ''
        const position = row['Position'] || row['position'] || row['Role'] || row['Title'] || ''
        const skills = row['Skills'] || row['skills'] || ''
        const experience = row['Experience'] || row['experience'] || row['Years of Experience'] || ''
        const location = row['Location'] || row['location'] || ''
        const currentCompany = row['Current Company'] || row['Company'] || row['current_company'] || ''
        const linkedIn = row['LinkedIn'] || row['linkedin'] || row['LinkedIn URL'] || ''
        const source = row['Source'] || row['source'] || 'Excel Import'
        const status = row['Status'] || row['status'] || 'Passive'
        const notes = row['Notes'] || row['notes'] || ''

        // Validate required fields
        if (!name || !email) {
          errors.push(`Row skipped: Missing name or email for "${name || email || 'unknown'}"`)
          errorCount++
          continue
        }

        // Check if candidate already exists
        const existingCandidate = await DatabaseService.query(
          `SELECT id FROM candidates WHERE email = $1 LIMIT 1`,
          [email]
        )

        let candidateId: string

        if (existingCandidate.length > 0) {
          // Candidate exists, use existing ID
          candidateId = existingCandidate[0].id
        } else {
          // Create new candidate
          const candidateResult = await DatabaseService.query(
            `INSERT INTO candidates (
              full_name, email, phone, location, current_company, current_title, 
              experience_years, linkedin_url, created_at, company_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
            RETURNING id`,
            [
              name,
              email,
              phone || null,
              location || null,
              currentCompany || null,
              position || null,
              experience ? parseInt(experience) : null,
              linkedIn || null,
              companyId
            ]
          )
          candidateId = candidateResult[0].id
        }

        // Map status to database enum
        const statusMap: Record<string, string> = {
          'Active Interest': 'active_interest',
          'active_interest': 'active_interest',
          'Passive': 'passive',
          'passive': 'passive',
          'Not Interested': 'not_interested',
          'not_interested': 'not_interested',
          'Hired': 'hired',
          'hired': 'hired',
          'Archived': 'archived',
          'archived': 'archived',
        }
        const dbStatus = statusMap[status] || 'passive'

        // Check if already in talent pool for this company
        const existingPoolEntry = await DatabaseService.query(
          `SELECT id FROM talent_pool_entries WHERE company_id = $1::uuid AND candidate_id = $2::uuid LIMIT 1`,
          [companyId, candidateId]
        )

        if (existingPoolEntry.length > 0) {
          // Update existing entry
          await DatabaseService.query(
            `UPDATE talent_pool_entries 
             SET status = $1, skills = $2, notes = $3, source = $4
             WHERE id = $5::uuid`,
            [dbStatus, skills, notes, source, existingPoolEntry[0].id]
          )
        } else {
          // Create new talent pool entry - created_at and updated_at have DEFAULT NOW() in schema
          const query = userId 
            ? `INSERT INTO talent_pool_entries (
                company_id, candidate_id, status, skills, notes, source, added_by
              ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid)`
            : `INSERT INTO talent_pool_entries (
                company_id, candidate_id, status, skills, notes, source
              ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`;
          
          const params = userId 
            ? [companyId, candidateId, dbStatus, skills, notes, source, userId]
            : [companyId, candidateId, dbStatus, skills, notes, source];
            
          await DatabaseService.query(query, params)
        }

        successCount++
      } catch (err: any) {
        console.error('Error importing row:', err)
        errors.push(`Error importing "${(row as any)['Name'] || (row as any)['Email'] || 'unknown'}": ${err.message}`)
        errorCount++
      }
    }

    console.log(`✅ Import complete: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} candidate(s) successfully`,
      imported: successCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 10) // Return first 10 errors
    })
  } catch (error: any) {
    console.error('Excel import error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to import candidates' },
      { status: 500 }
    )
  }
}
