import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { DatabaseService } from '@/lib/database'
import { decrypt } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      applicationId,
      companyId,
      questionId,
      question,
      answer,
      criterion,
      difficulty,
      marks
    } = body

    if (!applicationId || !companyId) {
      return NextResponse.json({ error: 'applicationId and companyId are required' }, { status: 400 })
    }
    if (!question || !answer) {
      return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
    }

    console.log('[Interview Evaluate] Question:', questionId, 'Criterion:', criterion, 'Difficulty:', difficulty)

    // Fetch company's OpenAI service key
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
          console.log('[Interview Evaluate] Using company service account key')
        } catch (e) {
          console.warn('[Interview Evaluate] Failed to decrypt company key:', e)
        }
      }
    } catch (e) {
      console.warn('[Interview Evaluate] Failed to fetch company key:', e)
    }

    // Fallback to env var
    if (!companyOpenAIKey) {
      companyOpenAIKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY || undefined
      if (companyOpenAIKey) {
        console.log('[Interview Evaluate] Using environment OPENAI_API_KEY as fallback')
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

    const maxMarks = marks || 10
    const difficultyLevel = difficulty || 'Medium'

    const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

QUESTION: ${question}
CRITERION: ${criterion}
DIFFICULTY: ${difficultyLevel}
MAX MARKS: ${maxMarks}

CANDIDATE'S ANSWER:
${answer}

Evaluate the answer based on:
1. Technical accuracy and correctness
2. Depth of understanding for a ${difficultyLevel} difficulty question
3. Communication clarity and structure
4. Relevance to the question asked

For a ${difficultyLevel} difficulty question worth ${maxMarks} marks:
- High difficulty: Expects deep expertise, advanced concepts, real-world examples
- Medium difficulty: Expects solid understanding, practical knowledge
- Low difficulty: Expects basic understanding, clear explanation

Return ONLY valid JSON (no markdown):
{
  "score": <number 0-100>,
  "marksObtained": <number out of ${maxMarks}>,
  "feedback": "<overall feedback string>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"]
}`

    const { text, usage } = await generateText({
      model: openaiProvider('gpt-4o'),
      system: 'You are an expert interviewer providing objective, constructive evaluation. Return only valid JSON.',
      prompt,
      temperature: 0.1,
    })

    console.log('[Interview Evaluate] OpenAI response received, tokens:', (usage as any)?.promptTokens || 0, 'prompt,', (usage as any)?.completionTokens || 0, 'completion')

    // Parse the response
    const cleaned = text.trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim()

    let evaluation: any
    try {
      evaluation = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('[Interview Evaluate] Failed to parse AI response:', cleaned.substring(0, 500))
      // Return default evaluation on parse failure
      evaluation = {
        score: 50,
        marksObtained: maxMarks * 0.5,
        feedback: 'Unable to fully evaluate response',
        strengths: ['Answer provided'],
        gaps: ['Could not parse AI evaluation']
      }
    }

    // Ensure marksObtained is within bounds
    const marksObtained = Math.min(Math.max(evaluation.marksObtained || (evaluation.score / 100 * maxMarks), 0), maxMarks)

    console.log('[Interview Evaluate] Score:', evaluation.score, '% Marks:', marksObtained, '/', maxMarks)
    console.log('[Interview Evaluate] Strengths:', evaluation.strengths?.length || 0, 'Gaps:', evaluation.gaps?.length || 0)

    return NextResponse.json({
      success: true,
      questionId,
      criterion,
      difficulty: difficultyLevel,
      maxMarks,
      evaluation: {
        score: evaluation.score,
        marksObtained: Math.round(marksObtained * 100) / 100,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths || [],
        gaps: evaluation.gaps || []
      },
      usage: {
        promptTokens: (usage as any)?.promptTokens || 0,
        completionTokens: (usage as any)?.completionTokens || 0
      }
    })
  } catch (error: any) {
    console.error('[Interview Evaluate] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate answer' },
      { status: 500 }
    )
  }
}
