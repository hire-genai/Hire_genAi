import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    cvCost: parseFloat(process.env.COST_PER_CV_PARSING || '0.50'),
    interviewCostPerMin: parseFloat(process.env.COST_PER_VIDEO_MINUTE || '0.50'),
  })
}
