import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Check if trial is expired
    const isTrialExpired = await DatabaseService.isTrialExpired(companyId)
    
    if (!isTrialExpired) {
      return NextResponse.json({ 
        ok: true, 
        message: 'Trial is not expired',
        jobsOnHold: 0,
        interviewsOnHold: 0
      })
    }

    // Put all OPEN jobs on hold
    const jobsOnHold = await DatabaseService.putOpenJobsOnHoldForTrialExpiry(companyId)
    
    // Put all pending interviews on hold
    const interviewsOnHold = await DatabaseService.putInterviewsOnHoldForTrialExpiry(companyId)

    console.log(`⏸️ [Trial Expiry Enforced] Company: ${companyId}, Jobs: ${jobsOnHold}, Interviews: ${interviewsOnHold}`)

    return NextResponse.json({
      ok: true,
      message: 'Trial expiry enforced',
      jobsOnHold,
      interviewsOnHold
    })
  } catch (error: any) {
    console.error('Failed to enforce trial expiry:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to enforce trial expiry' 
    }, { status: 500 })
  }
}
