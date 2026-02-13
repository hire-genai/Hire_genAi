import { generateText } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"

// Cache for loaded libraries
let librariesCache: { mammoth: any; pdfParse: any } | null = null

/**
 * Load parsing libraries using require (server-side only)
 */
function loadParsingLibraries() {
  if (typeof window !== 'undefined') {
    return { mammoth: null, pdfParse: null }
  }
  
  if (librariesCache) {
    return librariesCache
  }
  
  let mammoth = null
  let pdfParse = null
  
  try {
    mammoth = require("mammoth")
  } catch (err) {
    console.warn("Failed to load mammoth library:", err)
  }
  
  try {
    pdfParse = require("pdf-parse")
  } catch (err) {
    console.warn("Failed to load pdf-parse library:", err)
  }
  
  librariesCache = { mammoth, pdfParse }
  return librariesCache
}

export interface ParsedResume {
  rawText: string
  name?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  skills: string[]
  usage?: { promptTokens: number, completionTokens: number }
  experience: Array<{
    company?: string
    title?: string
    location?: string
    startDate?: string
    endDate?: string
    description?: string
  }>
  education: Array<{
    school?: string
    degree?: string
    field?: string
    startYear?: string
    endYear?: string
  }>
  certifications?: string[]
  languages?: string[]
  links?: Array<{
    type: string
    url: string
  }>
}

/**
 * Clean text to remove null bytes and invalid UTF-8 sequences
 */
export function cleanText(text: string): string {
  return text
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Check if text looks like binary/PDF raw content (not readable text)
 */
function isBinaryContent(text: string): boolean {
  if (!text || text.length < 10) return false
  
  // Check for PDF header
  if (text.startsWith('%PDF-')) return true
  
  // Check for high ratio of non-printable characters
  const nonPrintable = (text.match(/[^\x20-\x7E\n\r\t]/g) || []).length
  const ratio = nonPrintable / text.length
  
  // If more than 30% non-printable, likely binary
  if (ratio > 0.3) return true
  
  // Check for common binary patterns
  if (text.includes('\x00') || text.includes('stream') && text.includes('endstream')) return true
  
  return false
}

/**
 * Extract text from PDF or DOCX buffer
 */
async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  const type = (mimeType || "").toLowerCase()
  const libs = loadParsingLibraries()
  
  console.log('[extractText] Starting extraction, mimeType:', type, 'bufferSize:', buffer.length)
  
  let rawText = ""
  let extractionMethod = "unknown"
  
  try {
    // PDF extraction
    if (type.includes("pdf") || type.includes("application/pdf")) {
      extractionMethod = "pdf-parse"
      if (!libs.pdfParse) {
        console.error('[extractText] pdf-parse library not loaded!')
        throw new Error("PDF parsing library not available. Please ensure pdf-parse is installed.")
      }
      
      console.log('[extractText] Using pdf-parse for PDF extraction...')
      const data = await libs.pdfParse(buffer)
      rawText = (data.text || "").trim()
      console.log('[extractText] pdf-parse extracted', rawText.length, 'characters')
      
      // Validate extracted text
      if (!rawText || rawText.length < 20) {
        console.warn('[extractText] PDF extraction returned very little text:', rawText.length)
        throw new Error("PDF text extraction returned insufficient content")
      }
    }
    // DOCX/DOC extraction
    else if (
      type.includes("word") ||
      type.includes("docx") ||
      type.includes("msword") ||
      type.includes("officedocument")
    ) {
      extractionMethod = "mammoth"
      if (!libs.mammoth) {
        console.error('[extractText] mammoth library not loaded!')
        throw new Error("DOCX parsing library not available. Please ensure mammoth is installed.")
      }
      
      console.log('[extractText] Using mammoth for DOCX extraction...')
      const { value } = await libs.mammoth.extractRawText({ buffer })
      rawText = (value || "").trim()
      console.log('[extractText] mammoth extracted', rawText.length, 'characters')
      
      if (!rawText || rawText.length < 20) {
        console.warn('[extractText] DOCX extraction returned very little text:', rawText.length)
        throw new Error("DOCX text extraction returned insufficient content")
      }
    }
    // Plain text
    else if (type.includes("text") || type.includes("txt")) {
      extractionMethod = "plain-text"
      console.log('[extractText] Using plain text extraction...')
      rawText = buffer.toString("utf8").trim()
      console.log('[extractText] Plain text extracted', rawText.length, 'characters')
    }
    // Unknown type - try plain text but validate
    else {
      extractionMethod = "fallback-utf8"
      console.warn('[extractText] Unknown mimeType, attempting UTF-8 decode:', type)
      rawText = buffer.toString("utf8").trim()
    }
    
    // Clean the extracted text
    rawText = cleanText(rawText)
    
    // CRITICAL: Validate that we didn't extract binary garbage
    if (isBinaryContent(rawText)) {
      console.error('[extractText] BINARY CONTENT DETECTED! Method:', extractionMethod)
      console.error('[extractText] First 200 chars:', rawText.substring(0, 200))
      throw new Error(`Text extraction produced binary content. The ${extractionMethod} library may have failed.`)
    }
    
    console.log('[extractText] ✅ Successfully extracted', rawText.length, 'chars using', extractionMethod)
    console.log('[extractText] First 300 chars preview:', rawText.substring(0, 300))
    
    return rawText
    
  } catch (error) {
    console.error('[extractText] ❌ Extraction failed:', error)
    console.error('[extractText] Method attempted:', extractionMethod)
    
    // DO NOT fall back to buffer.toString() for binary files - that's what causes the bug!
    // Instead, throw a clear error
    throw new Error(
      `Failed to extract text from ${type || 'unknown'} file using ${extractionMethod}: ` +
      `${error instanceof Error ? error.message : 'Unknown error'}. ` +
      `Please ensure the file is a valid document.`
    )
  }
}

/**
 * Parse resume using OpenAI to extract structured data
 */
export async function parseResume(
  fileBuffer: Buffer,
  mimeType: string,
  options?: { apiKey?: string }
): Promise<ParsedResume> {
  const rawText = await extractText(fileBuffer, mimeType)
  
  if (!rawText || rawText.length < 50) {
    throw new Error("Could not extract meaningful text from resume")
  }

  const companyApiKey = options?.apiKey
  const hasOpenAI = !!companyApiKey || !!(process.env as any)?.OPENAI_API_KEY
  
  if (!hasOpenAI) {
    return {
      rawText,
      skills: extractBasicSkills(rawText),
      experience: [],
      education: [],
    }
  }

  // Use company-specific key if provided, otherwise default env key
  const openaiProvider = companyApiKey
    ? createOpenAI({ apiKey: companyApiKey })
    : openai

  const maxChars = 20000
  const truncatedText = rawText.length > maxChars 
    ? rawText.substring(0, maxChars) + "\n\n[Resume truncated due to length...]"
    : rawText

  try {
    const { text, usage } = await generateText({
      model: openaiProvider("gpt-4o"),
      system: `You are a resume parser. Extract structured information from resumes and return valid JSON only.`,
      prompt: `
Parse this resume and extract all relevant information. Return ONLY valid JSON with no markdown formatting.

RESUME TEXT:
${truncatedText}

Return this exact JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, Country",
  "summary": "Professional summary or objective",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, Country",
      "startDate": "Jan 2020",
      "endDate": "Present",
      "description": "Job responsibilities and achievements"
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "startYear": "2016",
      "endYear": "2020"
    }
  ],
  "certifications": ["AWS Certified", "PMP"],
  "languages": ["English", "Spanish"],
  "links": [
    {"type": "linkedin", "url": "https://linkedin.com/in/username"},
    {"type": "github", "url": "https://github.com/username"}
  ]
}

Rules:
- Extract ALL skills mentioned (technical, soft skills, tools, frameworks, languages)
- Include all work experience with dates
- Parse education history
- Find LinkedIn, GitHub, portfolio URLs
- If a field is not found, omit it or use null
- Return ONLY the JSON object, no markdown code blocks
      `.trim(),
    })

    let jsonText = text.trim()
    jsonText = jsonText.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()
    
    const match = jsonText.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error("No valid JSON found in response")
    }
    
    const parsed = JSON.parse(match[0])
    
    const tokenUsage = usage ? {
      promptTokens: (usage as any).promptTokens || 0,
      completionTokens: (usage as any).completionTokens || 0
    } : undefined

    const result: ParsedResume = {
      rawText,
      usage: tokenUsage,
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
      location: typeof parsed.location === "string" ? parsed.location : undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
      skills: Array.isArray(parsed.skills)
        ? parsed.skills.filter((s: any) => typeof s === "string")
        : extractBasicSkills(rawText),
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.map((exp: any) => ({
            company: typeof exp?.company === "string" ? exp.company : undefined,
            title: typeof exp?.title === "string" ? exp.title : undefined,
            location: typeof exp?.location === "string" ? exp.location : undefined,
            startDate: typeof exp?.startDate === "string" ? exp.startDate : undefined,
            endDate: typeof exp?.endDate === "string" ? exp.endDate : undefined,
            description: typeof exp?.description === "string" ? exp.description : undefined,
          }))
        : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.map((edu: any) => ({
            school: typeof edu?.school === "string" ? edu.school : undefined,
            degree: typeof edu?.degree === "string" ? edu.degree : undefined,
            field: typeof edu?.field === "string" ? edu.field : undefined,
            startYear: typeof edu?.startYear === "string" ? edu.startYear : undefined,
            endYear: typeof edu?.endYear === "string" ? edu.endYear : undefined,
          }))
        : [],
      certifications: Array.isArray(parsed.certifications)
        ? parsed.certifications.filter((c: any) => typeof c === "string")
        : undefined,
      languages: Array.isArray(parsed.languages)
        ? parsed.languages.filter((l: any) => typeof l === "string")
        : undefined,
      links: Array.isArray(parsed.links)
        ? parsed.links
            .map((link: any) => ({
              type: typeof link?.type === "string" ? link.type : "other",
              url: typeof link?.url === "string" ? link.url : "",
            }))
            .filter((l: { type: string; url: string }) => l.url)
        : undefined,
    }

    return result
  } catch (error) {
    console.error("AI resume parsing error:", error)
    
    return {
      rawText,
      skills: extractBasicSkills(rawText),
      experience: [],
      education: [],
      usage: undefined
    }
  }
}

/**
 * Basic skill extraction fallback (keyword matching)
 */
function extractBasicSkills(text: string): string[] {
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "PHP", "Go", "Rust",
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring",
    "HTML", "CSS", "SASS", "Tailwind", "Bootstrap",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "DynamoDB",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD",
    "Git", "GitHub", "GitLab", "Agile", "Scrum",
    "REST API", "GraphQL", "Microservices",
    "Machine Learning", "AI", "Data Science", "TensorFlow", "PyTorch",
  ]
  
  const textLower = text.toLowerCase()
  const found = new Set<string>()
  
  for (const skill of commonSkills) {
    if (textLower.includes(skill.toLowerCase())) {
      found.add(skill)
    }
  }
  
  return Array.from(found)
}
