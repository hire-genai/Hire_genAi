import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET - Fetch company data with address
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    console.log("📋 [SETTINGS] Fetching company data for:", companyId)

    // Fetch company with all fields matching signup schema
    const companyQuery = `
      SELECT 
        c.id,
        c.name,
        c.industry,
        c.size_band,
        c.website_url,
        c.description_md,
        c.phone_number,
        c.primary_country,
        c.legal_company_name,
        c.tax_id_ein,
        c.business_registration_number,
        c.headquarters,
        c.status,
        c.verified
      FROM companies c
      WHERE c.id = $1::uuid
      LIMIT 1
    `
    const companyResult = await DatabaseService.query(companyQuery, [companyId]) as any[]

    if (!companyResult || companyResult.length === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const companyData = companyResult[0]

    // Fetch address from company_addresses table
    let addressData = null
    try {
      const addressQuery = `
        SELECT 
          street_address,
          city,
          state_province,
          postal_code,
          country
        FROM company_addresses
        WHERE company_id = $1::uuid AND (address_type = 'primary' OR is_primary = true)
        LIMIT 1
      `
      const addressResult = await DatabaseService.query(addressQuery, [companyId]) as any[]
      if (addressResult && addressResult.length > 0) {
        addressData = addressResult[0]
      }
    } catch (e) {
      console.log("⚠️ [SETTINGS] Could not fetch address:", e)
    }

    // Map size_band back to UI format
    const mapSizeToUI = (sizeBand: string | null): string => {
      if (!sizeBand) return ''
      const sizeMap: Record<string, string> = {
        '1-10': '1-10 employees',
        '11-50': '11-50 employees',
        '51-200': '51-200 employees',
        '201-500': '201-500 employees',
        '501-1000': '501-1000 employees',
        '1001-5000': '1001-5000 employees',
        '5001-10000': '5001-10000 employees',
        '10000+': '1000+ employees',
      }
      return sizeMap[sizeBand] || sizeBand
    }

    // Combine company and address data
    const company = {
      id: companyData.id,
      name: companyData.name,
      industry: companyData.industry || '',
      companySize: mapSizeToUI(companyData.size_band),
      website: companyData.website_url || '',
      description: companyData.description_md || '',
      phone: companyData.phone_number || '',
      legalCompanyName: companyData.legal_company_name || '',
      taxId: companyData.tax_id_ein || '',
      registrationNumber: companyData.business_registration_number || '',
      // Address fields
      street: addressData?.street_address || '',
      city: addressData?.city || '',
      state: addressData?.state_province || '',
      postalCode: addressData?.postal_code || '',
      country: addressData?.country || companyData.primary_country || '',
    }

    console.log("📋 [SETTINGS] Company data fetched:", company)

    return NextResponse.json({ company })
  } catch (error: any) {
    console.error("❌ [SETTINGS] Error fetching company:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch company data" },
      { status: 500 }
    )
  }
}

// PUT - Update company data
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { companyId, ...updateData } = body

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    console.log("📋 [SETTINGS] Updating company data for:", companyId)
    console.log("📋 [SETTINGS] Update data:", updateData)

    const updatedCompany = await DatabaseService.updateCompany(companyId, updateData)

    return NextResponse.json({ company: updatedCompany, success: true })
  } catch (error: any) {
    console.error("❌ [SETTINGS] Error updating company:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update company data" },
      { status: 500 }
    )
  }
}
