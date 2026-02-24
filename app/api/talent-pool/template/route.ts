import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()
    
    // Define headers
    const headers = [
      'Name', 'Email', 'Phone', 'Position', 'Skills', 
      'Experience', 'Location', 'Current Company', 
      'LinkedIn', 'Source', 'Status', 'Notes'
    ]
    
    // Create sample data
    const data = [
      headers,
      [
        'John Doe', 
        'john@example.com', 
        '+1234567890', 
        'Software Engineer', 
        'React, Node.js, TypeScript', 
        '5', 
        'New York', 
        'Tech Corp', 
        'https://linkedin.com/in/johndoe', 
        'LinkedIn', 
        'Passive', 
        'Great candidate'
      ],
      [
        'Jane Smith', 
        'jane@example.com', 
        '+9876543210', 
        'Product Manager', 
        'Product Strategy, Agile, Scrum', 
        '8', 
        'San Francisco', 
        'Product Inc', 
        'https://linkedin.com/in/janesmith', 
        'Referral', 
        'Active Interest', 
        'Strong PM background'
      ]
    ]
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 15 },  // Name
      { wch: 25 },  // Email
      { wch: 15 },  // Phone
      { wch: 20 },  // Position
      { wch: 30 },  // Skills
      { wch: 10 },  // Experience
      { wch: 15 },  // Location
      { wch: 20 },  // Current Company
      { wch: 30 },  // LinkedIn
      { wch: 15 },  // Source
      { wch: 15 },  // Status
      { wch: 30 },  // Notes
    ]
    worksheet['!cols'] = colWidths
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Talent Pool Template')
    
    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    // Return Excel file as response
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="talent_pool_template.xlsx"'
      }
    })
  } catch (error: any) {
    console.error('Error generating Excel template:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate template' },
      { status: 500 }
    )
  }
}
