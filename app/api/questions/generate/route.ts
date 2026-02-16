import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIFFICULTY_MARKS: Record<string, number> = {
  High: 15,
  Medium: 10,
  Low: 5,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyId,
      jobDescription,
      selectedCriteria,
      questionCount = 10,
      draftJobId,
      requiredSkills = [],
      experienceYears = '',
      responsibilities = [],
    } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }
    if (!jobDescription) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 })
    }
    if (!selectedCriteria || selectedCriteria.length === 0) {
      return NextResponse.json({ error: 'selectedCriteria is required' }, { status: 400 })
    }

    console.log('[Question Generate] Starting for company:', companyId)
    console.log('[Question Generate] Criteria:', selectedCriteria)
    console.log('[Question Generate] Requested count:', questionCount)

    // Fetch company's OpenAI service key from DB
    let companyOpenAIKey: string | undefined

    try {
      const companyData = await DatabaseService.query(
        `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
        [companyId]
      ) as any[]

      if (companyData?.[0]?.openai_service_account_key) {
        try {
          const decryptedKey = decrypt(companyData[0].openai_service_account_key).trim()
          if (decryptedKey.startsWith('{')) {
            const keyObj = JSON.parse(decryptedKey)
            companyOpenAIKey = keyObj.value || keyObj.apiKey || keyObj.api_key || keyObj.key || undefined
          } else {
            companyOpenAIKey = decryptedKey
          }
          console.log('[Question Generate] Using company service account key')
        } catch (e) {
          console.warn('[Question Generate] Failed to decrypt company key:', e)
        }
      }
    } catch (e) {
      console.warn('[Question Generate] Failed to fetch company key:', e)
    }

    // Fallback to env var
    if (!companyOpenAIKey) {
      companyOpenAIKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY || undefined
      if (companyOpenAIKey) {
        console.log('[Question Generate] Using environment OPENAI_API_KEY as fallback')
      }
    }

    if (!companyOpenAIKey) {
      return NextResponse.json(
        { error: 'No OpenAI API key configured for this company' },
        { status: 500 }
      )
    }

    // Use company-specific key
    const openaiProvider = createOpenAI({ apiKey: companyOpenAIKey })

    const truncatedJD = jobDescription.length > 3000
      ? jobDescription.substring(0, 3000) + '\n\n[JD truncated...]'
      : jobDescription

    const criteriaList = selectedCriteria.join(', ')
    const skillsList = Array.isArray(requiredSkills) && requiredSkills.length > 0 
      ? requiredSkills.filter((s: string) => s && s.trim()).join(', ') 
      : 'Not specified'
    const responsibilitiesList = Array.isArray(responsibilities) && responsibilities.length > 0
      ? responsibilities.filter((r: string) => r && r.trim()).join('\n- ')
      : 'Not specified'
    const expYears = experienceYears || 'Not specified'

    console.log('[Question Generate] Skills:', skillsList)
    console.log('[Question Generate] Experience:', expYears)
    console.log('[Question Generate] Responsibilities count:', responsibilities?.length || 0)

    const prompt = `You are an expert interviewer. Generate exactly ${questionCount} interview questions based on the following job details.

JOB DESCRIPTION:
${truncatedJD}

REQUIRED SKILLS:
${skillsList}

YEARS OF EXPERIENCE REQUIRED:
${expYears}

KEY RESPONSIBILITIES:
- ${responsibilitiesList}

EVALUATION CRITERIA (distribute questions across these):
${criteriaList}

REQUIREMENTS:
- Generate exactly ${questionCount} questions total
- Distribute questions evenly across the given criteria
- Questions should test the REQUIRED SKILLS mentioned above
- Adjust question complexity based on YEARS OF EXPERIENCE (more experience = deeper technical questions)
- Include questions related to KEY RESPONSIBILITIES
- Assign difficulty levels: approximately 30% High, 40% Medium, 30% Low
- Each question should be specific, behavioral, and relevant to the job
- Return ONLY valid JSON, no markdown formatting

Return this exact JSON structure:
[
  {
    "question": "The interview question text",
    "criterion": "One of the criteria from the list above",
    "difficulty": "High" or "Medium" or "Low"
  }
]`

    const { text, usage } = await generateText({
      model: openaiProvider('gpt-4o'),
      system: 'You are an expert interviewer who generates targeted, behavioral interview questions. Return only valid JSON.',
      prompt,
      temperature: 0.7,
    })

    console.log('[Question Generate] OpenAI response received, tokens:', usage)

    // Parse the response
    const cleaned = text.trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim()

    let parsedQuestions: any[]
    try {
      parsedQuestions = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('[Question Generate] Failed to parse AI response:', cleaned.substring(0, 500))
      return NextResponse.json(
        { error: 'Failed to parse AI-generated questions' },
        { status: 500 }
      )
    }

    // Format questions with IDs and marks
    const questions = parsedQuestions.map((q: any, index: number) => ({
      id: index + 1,
      question: q.question,
      criterion: q.criterion,
      difficulty: q.difficulty || 'Medium',
      marks: DIFFICULTY_MARKS[q.difficulty] || 10,
      source: 'ai',
    }))

    const aiQuestionCount = questions.length

    // Record usage in question_generation_usage table
    // Use simple pricing: 1-4 free, 5-10 charged
    try {
      const { getQuestionGenerationCost } = await import('@/lib/config')
      const { cost, tier } = getQuestionGenerationCost(aiQuestionCount)

      console.log('[Question Generate] Tier:', tier, 'Cost:', cost, 'Questions:', aiQuestionCount)

      if (cost > 0) {
        await DatabaseService.recordQuestionGenerationUsage({
          companyId,
          jobId: null,
          draftJobId: draftJobId || `draft_${Date.now()}`,
          promptTokens: (usage as any)?.promptTokens || 0,
          completionTokens: (usage as any)?.completionTokens || 0,
          questionCount: aiQuestionCount,
          modelUsed: 'gpt-4o',
        })
        console.log('[Question Generate] Usage recorded successfully')
      } else {
        console.log('[Question Generate] Free tier (1-4 questions), no charge')
      }
    } catch (usageError) {
      console.warn('[Question Generate] Failed to record usage:', usageError)
    }

    return NextResponse.json({
      success: true,
      questions,
      usage: {
        promptTokens: (usage as any)?.promptTokens || 0,
        completionTokens: (usage as any)?.completionTokens || 0,
        totalTokens: ((usage as any)?.promptTokens || 0) + ((usage as any)?.completionTokens || 0),
      },
      questionCount: aiQuestionCount,
      draftJobId: draftJobId || `draft_${Date.now()}`,
    })
  } catch (error: any) {
    console.error('[Question Generate] Error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Failed to generate questions',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    )
  }
}
