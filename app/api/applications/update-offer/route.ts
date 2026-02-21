import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      applicationId,
      offerStatus,
      offerAmount,
      offerBonus,
      offerEquity,
      offerExtendedDate,
      offerExpiryDate,
      negotiationRounds,
      declineReason,
      hireDate,
      startDate,
      backgroundCheckStatus,
      referenceCheckStatus,
      onboardingStatus,
      onboardingChecklist,
      qualityOfHireRating,
      employmentStatus,
    } = body

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }

    // Map UI display values to DB enum values
    const offerStatusMap: Record<string, string> = {
      'Not Sent Yet': 'not_sent',
      'Offer Sent': 'sent',
      'Under Review': 'under_review',
      'Negotiating': 'negotiating',
      'Accepted': 'accepted',
      'Declined': 'declined',
    }

    const { offerCurrency } = body

    const fields: string[] = []
    const values: any[] = []
    let idx = 1

    if (offerStatus !== undefined) {
      const dbStatus = offerStatusMap[offerStatus] || offerStatus
      fields.push(`offer_status = $${idx++}`)
      values.push(dbStatus)
    }
    if (offerAmount !== undefined)          { fields.push(`offer_amount = $${idx++}`);            values.push(offerAmount || null) }
    if (offerBonus !== undefined)           { fields.push(`offer_bonus = $${idx++}`);             values.push(offerBonus || null) }
    if (offerEquity !== undefined)          { fields.push(`offer_equity = $${idx++}`);            values.push(offerEquity || null) }
    if (offerExtendedDate !== undefined)    { fields.push(`offer_extended_date = $${idx++}`);     values.push(offerExtendedDate || null) }
    if (offerExpiryDate !== undefined)      { fields.push(`offer_expiry_date = $${idx++}`);       values.push(offerExpiryDate || null) }
    if (negotiationRounds !== undefined)    { fields.push(`negotiation_rounds = $${idx++}`);      values.push(negotiationRounds || 0) }
    if (declineReason !== undefined)        { fields.push(`decline_reason = $${idx++}`);          values.push(declineReason || null) }
    if (hireDate !== undefined)             { fields.push(`hire_date = $${idx++}`);               values.push(hireDate || null) }
    if (startDate !== undefined)            { fields.push(`start_date = $${idx++}`);              values.push(startDate || null) }
    if (backgroundCheckStatus !== undefined){ fields.push(`background_check_status = $${idx++}`); values.push(backgroundCheckStatus || null) }
    if (referenceCheckStatus !== undefined) { fields.push(`reference_check_status = $${idx++}`);  values.push(referenceCheckStatus || null) }
    if (onboardingStatus !== undefined)     { fields.push(`onboarding_status = $${idx++}`);       values.push(onboardingStatus || null) }
    if (onboardingChecklist !== undefined)  { fields.push(`onboarding_checklist = $${idx++}`);    values.push(JSON.stringify(onboardingChecklist)) }
    if (qualityOfHireRating !== undefined)  { fields.push(`quality_of_hire_rating = $${idx++}`);  values.push(qualityOfHireRating || null) }
    if (employmentStatus !== undefined)     { fields.push(`employment_status = $${idx++}`);       values.push(employmentStatus || null) }
    if (offerCurrency !== undefined)        { fields.push(`offer_currency = $${idx++}`);           values.push(offerCurrency || 'USD') }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(applicationId)
    const query = `UPDATE applications SET ${fields.join(', ')} WHERE id = $${idx}::uuid RETURNING id`
    await DatabaseService.query(query, values)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ update-offer error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update offer data' }, { status: 500 })
  }
}
