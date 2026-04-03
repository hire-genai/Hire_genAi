import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    // Check if trial is still expired
    const isTrialExpired = await DatabaseService.isTrialExpired(companyId)
    
    if (isTrialExpired) {
      return NextResponse.json({ 
        ok: true, 
        message: 'Trial is still expired, no restoration needed',
        jobsRestored: 0,
        interviewsRestored: 0
      })
    }

    // Trial is NOT expired - restore jobs and interviews that were on hold due to trial expiry
    const jobsRestored = await DatabaseService.restoreJobsAfterRecharge(companyId)
    const interviewsRestored = await DatabaseService.restoreInterviewsAfterRecharge(companyId)

    console.log(`✅ [Trial Restoration] Company: ${companyId}, Jobs restored: ${jobsRestored}, Interviews restored: ${interviewsRestored}`)

    return NextResponse.json({
      ok: true,
      message: 'Jobs and interviews restored from trial expiry',
      jobsRestored,
      interviewsRestored
    })
  } catch (error: any) {
    console.error('Failed to restore from trial expiry:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to restore from trial expiry' 
    }, { status: 500 })
  }
}
