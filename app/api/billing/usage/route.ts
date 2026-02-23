import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/database'
import { getBillingPrices } from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const jobId = searchParams.get('jobId')

    if (!companyId) {
      return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    // Get CV parsing usage totals
    const cvQuery = `
      SELECT 
        COUNT(*) as cv_count,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM cv_parsing_usage
      WHERE company_id = $1::uuid
        AND created_at >= $2
        AND created_at <= $3
        ${jobId && jobId !== 'all' ? 'AND job_id = $4::uuid' : ''}
    `
    const cvParams = jobId && jobId !== 'all' 
      ? [companyId, start, end, jobId]
      : [companyId, start, end]

    // Get question generation usage totals
    const questionQuery = `
      SELECT 
        COALESCE(SUM(question_count), 0) as question_count,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(total_tokens), 0) as total_tokens
      FROM question_generation_usage
      WHERE company_id = $1::uuid
        AND created_at >= $2
        AND created_at <= $3
        ${jobId && jobId !== 'all' ? 'AND job_id = $4::uuid' : ''}
    `

    // Get video interview usage totals
    const videoQuery = `
      SELECT 
        COUNT(*) as interview_count,
        COALESCE(SUM(duration_minutes), 0) as total_minutes,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM video_interview_usage
      WHERE company_id = $1::uuid
        AND created_at >= $2
        AND created_at <= $3
        ${jobId && jobId !== 'all' ? 'AND job_id = $4::uuid' : ''}
    `

    // Get usage breakdown by job
    const jobUsageQuery = `
      WITH job_cv AS (
        SELECT job_id, COUNT(*) as cv_count, COALESCE(SUM(cost), 0) as cv_cost
        FROM cv_parsing_usage
        WHERE company_id = $1::uuid AND created_at >= $2 AND created_at <= $3 AND job_id IS NOT NULL
        GROUP BY job_id
      ),
      job_questions AS (
        SELECT job_id, COALESCE(SUM(question_count), 0) as question_count, COALESCE(SUM(cost), 0) as question_cost
        FROM question_generation_usage
        WHERE company_id = $1::uuid AND created_at >= $2 AND created_at <= $3 AND job_id IS NOT NULL
        GROUP BY job_id
      ),
      job_video AS (
        SELECT job_id, COUNT(*) as interview_count, COALESCE(SUM(cost), 0) as video_cost
        FROM video_interview_usage
        WHERE company_id = $1::uuid AND created_at >= $2 AND created_at <= $3 AND job_id IS NOT NULL
        GROUP BY job_id
      )
      SELECT 
        jp.id as job_id,
        jp.title as job_title,
        COALESCE(cv.cv_count, 0) as cv_count,
        COALESCE(cv.cv_cost, 0) as cv_parsing_cost,
        COALESCE(q.question_count, 0) as question_count,
        COALESCE(q.question_cost, 0) as jd_questions_cost,
        COALESCE(v.interview_count, 0) as interview_count,
        COALESCE(v.video_cost, 0) as video_cost,
        COALESCE(cv.cv_cost, 0) + COALESCE(q.question_cost, 0) + COALESCE(v.video_cost, 0) as total_cost
      FROM job_postings jp
      LEFT JOIN job_cv cv ON jp.id = cv.job_id
      LEFT JOIN job_questions q ON jp.id = q.job_id
      LEFT JOIN job_video v ON jp.id = v.job_id
      WHERE jp.company_id = $1::uuid
        AND (cv.job_id IS NOT NULL OR q.job_id IS NOT NULL OR v.job_id IS NOT NULL)
      ORDER BY total_cost DESC
    `

    const [cvResult, questionResult, videoResult, jobUsageResult] = await Promise.all([
      DatabaseService.query(cvQuery, cvParams),
      DatabaseService.query(questionQuery, cvParams),
      DatabaseService.query(videoQuery, cvParams),
      DatabaseService.query(jobUsageQuery, [companyId, start, end])
    ])

    const cv = cvResult[0] || { cv_count: 0, total_cost: 0, total_tokens: 0 }
    const questions = questionResult[0] || { question_count: 0, total_cost: 0, total_tokens: 0 }
    const video = videoResult[0] || { interview_count: 0, total_minutes: 0, total_cost: 0, total_tokens: 0 }

    // Get pricing from config
    const pricing = getBillingPrices()

    return NextResponse.json({
      ok: true,
      totals: {
        cvParsing: parseFloat(cv.total_cost) || 0,
        cvCount: parseInt(cv.cv_count) || 0,
        jdQuestions: parseFloat(questions.total_cost) || 0,
        questionCount: parseInt(questions.question_count) || 0,
        video: parseFloat(video.total_cost) || 0,
        interviewCount: parseInt(video.interview_count) || 0,
        videoMinutes: parseFloat(video.total_minutes) || 0,
        tokenCount: (parseInt(cv.total_tokens) || 0) + (parseInt(questions.total_tokens) || 0) + (parseInt(video.total_tokens) || 0)
      },
      jobUsage: jobUsageResult.map((job: any) => ({
        jobId: job.job_id,
        jobTitle: job.job_title || 'Untitled Job',
        cvCount: parseInt(job.cv_count) || 0,
        cvParsingCost: parseFloat(job.cv_parsing_cost) || 0,
        questionCount: parseInt(job.question_count) || 0,
        jdQuestionsCost: parseFloat(job.jd_questions_cost) || 0,
        interviewCount: parseInt(job.interview_count) || 0,
        videoCost: parseFloat(job.video_cost) || 0,
        totalCost: parseFloat(job.total_cost) || 0
      })),
      pricing: {
        cvParsingCost: pricing.cvParsingCost,
        questionGenerationCost: pricing.questionGenerationCostPer10,
        videoInterviewCost: pricing.videoInterviewCostPerMinute
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    })
  } catch (error: any) {
    console.error('[Billing Usage] Error:', error)
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}
