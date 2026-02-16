import { generateText } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"

// Direct require() at module level - simple and reliable
// pdf-parse v2 exports PDFParse class; mammoth exports an object
let PDFParseClass: any = null
let mammoth: any = null

if (typeof window === 'undefined') {
  try {
    const pdfModule = require('pdf-parse')
    // pdf-parse v2: named export PDFParse (class)
    // pdf-parse v1: direct function export
    if (typeof pdfModule?.PDFParse === 'function') {
      PDFParseClass = pdfModule.PDFParse
      console.log('✅ pdf-parse v2 loaded (PDFParse class)')
    } else if (typeof pdfModule === 'function') {
      PDFParseClass = pdfModule
      console.log('✅ pdf-parse v1 loaded (direct function)')
    } else if (typeof pdfModule?.default === 'function') {
      PDFParseClass = pdfModule.default
      console.log('✅ pdf-parse loaded (.default)')
    } else {
      console.error('❌ pdf-parse loaded but no callable export found. Keys:', Object.keys(pdfModule || {}))
    }
  } catch (err: any) {
    console.error('❌ Failed to load pdf-parse:', err.message)
    console.error('   Run: npm install pdf-parse')
  }

  try {
    mammoth = require('mammoth')
    console.log('✅ mammoth loaded')
  } catch (err: any) {
    console.error('❌ Failed to load mammoth:', err.message)
    console.error('   Run: npm install mammoth')
  }
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
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📄 EXTRACTION START')
  console.log('   MIME Type:', type)
  console.log('   Buffer Size:', buffer.length, 'bytes')
  console.log('   First 20 bytes (hex):', buffer.slice(0, 20).toString('hex'))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  let rawText = ""
  let extractionMethod = "unknown"
  
  try {
    // PDF extraction
    if (type.includes("pdf") || type.includes("application/pdf")) {
      extractionMethod = "pdf-parse"
      
      if (!PDFParseClass) {
        throw new Error("pdf-parse library not loaded. Install it with: npm install pdf-parse")
      }

      console.log('🔧 Using pdf-parse, PDFParseClass type:', typeof PDFParseClass)
      
      let data: any
      
      // pdf-parse v2: class-based API (PDFParse is a class)
      // pdf-parse v1: function-based API (pdfParse is a function)
      const isV2 = PDFParseClass.toString().startsWith('class')
      
      if (isV2) {
        const parser = new PDFParseClass({ data: buffer })
        const result = await parser.getText()
        // v2 getText() returns { pages, text, total }
        data = {
          text: result?.text || '',
          numpages: result?.total || 0,
          info: {},
        }
        if (typeof parser.destroy === 'function') {
          await parser.destroy()
        }
      } else {
        // v1: pdfParse(buffer) returns { text, numpages, info, ... }
        data = await PDFParseClass(buffer)
      }
      
      console.log('📊 PDF Parse Result:')
      console.log('   numpages:', data?.numpages)
      console.log('   info:', JSON.stringify(data?.info))
      console.log('   text length:', data?.text?.length)
      
      rawText = (data?.text || "").trim()
      
      if (!rawText || rawText.length < 20) {
        console.warn(`⚠️ PDF extraction returned only ${rawText.length} chars. Pages: ${data?.numpages || 0}. May be image-based or corrupted.`)
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
      
      if (!mammoth) {
        throw new Error("mammoth library not loaded. Install it with: npm install mammoth")
      }
      
      console.log('🔧 Using mammoth...')
      const result = await mammoth.extractRawText({ buffer })
      
      console.log('📊 Mammoth Result:')
      console.log('   value length:', result?.value?.length)
      console.log('   messages:', result?.messages)
      
      rawText = (result?.value || "").trim()
      
      if (!rawText || rawText.length < 20) {
        console.warn(`⚠️ DOCX extraction returned only ${rawText.length} chars. May be empty or corrupted.`)
      }
    }
    // Plain text
    else if (type.includes("text") || type.includes("txt")) {
      extractionMethod = "plain-text"
      console.log('🔧 Using plain text extraction...')
      rawText = buffer.toString("utf8").trim()
    }
    // Unknown type - try plain text but validate
    else {
      extractionMethod = "fallback-utf8"
      console.warn('⚠️ Unknown MIME type, attempting UTF-8:', type)
      rawText = buffer.toString("utf8").trim()
    }
    
    // Clean the extracted text
    rawText = cleanText(rawText)
    
    // CRITICAL: Validate that we didn't extract binary garbage
    if (isBinaryContent(rawText)) {
      console.error('❌ BINARY CONTENT DETECTED! Method:', extractionMethod)
      console.error('   First 200 chars:', rawText.substring(0, 200))
      throw new Error(`Text extraction produced binary content. The ${extractionMethod} library may have failed.`)
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ EXTRACTION SUCCESS')
    console.log('   Method:', extractionMethod)
    console.log('   Characters:', rawText.length)
    console.log('   First 300 chars:')
    console.log('   ' + rawText.substring(0, 300).replace(/\n/g, '\n   '))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return rawText
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ EXTRACTION FAILED')
    console.error('   Method:', extractionMethod)
    console.error('   MIME Type:', type)
    console.error('   Error:', error instanceof Error ? error.message : error)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // DO NOT fall back to buffer.toString() for binary files - that causes the bug!
    throw new Error(
      `Failed to extract text from ${type || 'unknown'} file using ${extractionMethod}: ` +
      `${error instanceof Error ? error.message : 'Unknown error'}`
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
  if (companyApiKey) {
    console.log('[Resume Parse] Using company service account key for OpenAI provider')
  } else if ((process.env as any)?.OPENAI_API_KEY) {
    console.log('[Resume Parse] Using environment OPENAI_API_KEY for OpenAI provider')
  }

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
      system: `You are an expert resume parser. Extract structured information and return valid JSON only. No markdown, no explanations.`,
      prompt: `Parse this resume and extract all information. Return ONLY valid JSON (no markdown, no code fences, no explanations).

RESUME TEXT:
${truncatedText}

Return this JSON structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, State/Country",
  "summary": "Professional summary or objective statement",
  "skills": [
    "JavaScript",
    "React",
    "Node.js",
    "Communication",
    "Leadership"
  ],
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, Country",
      "startDate": "Jan 2020",
      "endDate": "Present",
      "description": "Detailed job responsibilities, achievements, and impact. Include bullet points from resume."
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
  "certifications": [
    "AWS Certified Solutions Architect",
    "PMP Certification"
  ],
  "languages": [
    "English (Native)",
    "Spanish (Fluent)",
    "French (Intermediate)"
  ],
  "links": [
    { "type": "linkedin", "url": "https://linkedin.com/in/username" },
    { "type": "github", "url": "https://github.com/username" },
    { "type": "portfolio", "url": "https://myportfolio.com" }
  ]
}

RULES:
- Read the resume text carefully and extract ALL relevant information.
- Be thorough; include all skills (technical, tools, frameworks, certifications, soft skills).
- Include ALL jobs/internships/volunteer work with dates; use "Present" for current roles.
- Extract education with school, degree, field, and years.
- Extract certifications, languages (with proficiency if available), and links (linkedin/github/portfolio/etc.).
- Dates should be consistent (e.g., "Jan 2020", "2020-01", "Present").
- If a field is missing, omit it or set it to null.
- Return ONLY valid JSON. No markdown, no extra text.`.trim(),
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
