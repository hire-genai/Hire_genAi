'use client'

import { useState, useEffect, use } from 'react'
import { Download, FileText, MessageSquare, User, CheckCircle, XCircle, Award, Briefcase, Loader2, TrendingUp, TrendingDown, Target, Brain, AlertTriangle, Clock, BarChart3, Zap, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type TabType = 'application' | 'evaluation' | 'transcript'

export default function CandidateReportPage({ 
  params 
}: { 
  params: Promise<{ jobId: string; candidateId: string }> 
}) {
  const { jobId, candidateId } = use(params)
  const [activeTab, setActiveTab] = useState<TabType>('application')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true)
        const res = await fetch(`/api/report/${jobId}/${candidateId}`)
        const data = await res.json()
        if (data.ok) {
          setReport(data.report)
        } else {
          setError(data.error || 'Failed to fetch report')
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch report')
      } finally {
        setLoading(false)
      }
    }
    if (jobId && candidateId) fetchReport()
  }, [jobId, candidateId])

  const handleDownloadReport = () => { window.print() }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }
  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-amber-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Report Not Found</h2>
          <p className="text-sm text-gray-600">{error || 'No application found for this job and candidate.'}</p>
        </div>
      </div>
    )
  }

  // Extract data from API response
  const candidate = report.candidate || {}
  const job = report.job || {}
  const screening = report.screening || {}
  const application = report.application || {}
  const interview = report.interview || {}
  const stageHistory = report.stageHistory || []

  // Parse qualification_explanations for CV evaluation data
  const qualExp = screening.qualificationExplanations || {}
  const scores = qualExp.scores || {}
  const extracted = qualExp.extracted || {}
  const explainableScore = qualExp.explainable_score || {}
  const overall = qualExp.overall || {}
  const eligibility = qualExp.eligibility || {}
  const riskAdj = qualExp.risk_adjustments || {}

  const cvScore = screening.score ?? 0
  const isQualified = screening.isQualified

  // Determine if candidate should be hired: qualified=true AND score>=65%
  const shouldHire = isQualified && cvScore >= 65

  // Build profile snapshot
  const educationStr = (extracted.education || []).map((e: any) => 
    [e.degree, e.field, e.institution].filter(Boolean).join(' from ')
  ).join(', ') || 'N/A'

  const employerStr = (extracted.work_experience || []).map((w: any) => 
    `${w.company} (${w.duration})`
  ).join(' & ') || 'N/A'

  const availabilityStr = application.availableStartDate 
    ? new Date(application.availableStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A'

  const salaryStr = application.expectedSalary 
    ? `${application.salaryCurrency || 'USD'} ${Number(application.expectedSalary).toLocaleString()}/${application.salaryPeriod || 'month'}`
    : 'N/A'

  // Classification Logic (profile-based, NOT score-based)
  const candidateProfile = qualExp.candidateProfile || {}
  const breakdown = qualExp.breakdown || {}
  const university = candidateProfile.university_type || 'non-targeted'
  const employer = candidateProfile.employer_type || 'non-targeted'
  const hasRelevantEducation = scores.education_and_certs?.field_match || false

  // Base match decision matrix (NO SCORE INVOLVEMENT)
  let baseMatch: string
  if (university === 'targeted' || employer === 'targeted') {
    baseMatch = 'Strong Match'
  } else if (university === 'non-targeted' && hasRelevantEducation) {
    baseMatch = 'Good Match'
  } else if (university === 'non-targeted') {
    baseMatch = 'Partial Match'
  } else {
    baseMatch = 'Weak Match'
  }

  // Build classification details
  const classificationDetails: string[] = []
  if (university === 'targeted') classificationDetails.push('Targeted institute')
  if (university === 'non-targeted') classificationDetails.push('Non-targeted institute')
  if (employer === 'targeted') classificationDetails.push('Tier-1 employer')
  if (hasRelevantEducation) classificationDetails.push('Relevant education')

  // Final classification format
  const classificationStr = classificationDetails.length > 0
    ? `${baseMatch} (${classificationDetails.join(', ')})`
    : baseMatch

  // Build skills alignment from scores
  const skillsAlignment = [
    scores.skill_match && {
      area: 'Skills Match',
      score: scores.skill_match.score || 0,
      points: `+${(explainableScore.skill_contribution || 0).toFixed(1)}`,
      details: `${(scores.skill_match.matched_critical?.length || 0) + (scores.skill_match.matched_important?.length || 0)}/${(scores.skill_match.matched_critical?.length || 0) + (scores.skill_match.matched_important?.length || 0) + (scores.skill_match.missing_critical?.length || 0)} required skills matched`,
      subDetails: [
        scores.skill_match.matched_critical?.length ? `✓ Strong in: ${[...(scores.skill_match.matched_critical || []), ...(scores.skill_match.matched_important || [])].join(', ')}` : '',
        scores.skill_match.missing_critical?.length ? `✗ Missing: ${scores.skill_match.missing_critical.join(', ')}` : ''
      ].filter(Boolean).join('\n')
    },
    scores.project_relevance && {
      area: 'Project Relevance',
      score: scores.project_relevance.score || 0,
      points: `+${(explainableScore.project_contribution || 0).toFixed(1)}`,
      details: `${scores.project_relevance.relevant_projects || 0} relevant projects analyzed`,
      subDetails: scores.project_relevance.recent_skills_used?.length ? `Recent skills: ${scores.project_relevance.recent_skills_used.join(', ')}` : ''
    },
    scores.experience_match && {
      area: 'Experience Match',
      score: scores.experience_match.score || 0,
      points: `+${(explainableScore.experience_contribution || 0).toFixed(1)}`,
      details: `${extracted.relevant_experience_years || extracted.total_experience_years_estimate || 0}+ years in relevant domain`,
      subDetails: scores.experience_match.evidence?.slice(0, 2).join('\n') || ''
    },
    scores.education_and_certs && {
      area: 'Education & Certifications',
      score: scores.education_and_certs.score || 0,
      points: `+${(explainableScore.edu_certs_contribution || 0).toFixed(1)}`,
      details: educationStr !== 'N/A' ? educationStr.split(',')[0] : 'N/A',
      subDetails: (scores.education_and_certs.issued_certs || []).join(', ')
    },
    scores.location_and_availability && {
      area: 'Location & Availability',
      score: scores.location_and_availability.score || 0,
      points: `+${(explainableScore.location_contribution || 0).toFixed(1)}`,
      details: candidate.location || 'N/A',
      subDetails: `Available: ${availabilityStr}`
    },
    scores.resume_quality && {
      area: 'Resume Quality',
      score: scores.resume_quality.score || 0,
      points: `+${(explainableScore.quality_contribution || 0).toFixed(1)}`,
      details: `Clarity: ${scores.resume_quality.clarity || 0}, Structure: ${scores.resume_quality.structure || 0}, Completeness: ${scores.resume_quality.completeness || 0}`,
      subDetails: scores.resume_quality.issues?.length ? `Issues: ${scores.resume_quality.issues.join(', ')}` : ''
    }
  ].filter(Boolean) as any[]

  // Certifications & Projects from extracted data
  const certifications = (extracted.certifications || []).map((c: any) => typeof c === 'string' ? c : c.name).filter(Boolean)
  const recentProjects = (extracted.recent_projects || []).map((p: any) => ({
    name: p.title || 'Project',
    duration: p.duration || '',
    tech: (p.technologies || []).join(', ')
  }))

  // Recommendation based on shouldHire
  const recommendation = shouldHire ? 'PROCEED TO NEXT ROUND' : 'UNDER REVIEW'
  const matchedSkills = [...(scores.skill_match?.matched_critical || []), ...(scores.skill_match?.matched_important || [])]
  const missingSkills = scores.skill_match?.missing_critical || []

  // Interview evaluations - new comprehensive structure
  const interviewEvalData = interview.evaluations?.evaluation || {}
  const evalQuestions = interviewEvalData.questions || []
  const evalScoring = interviewEvalData.scoring || {}
  const evalCriterionAvg = interviewEvalData.criterion_averages || {}
  const evalTechCutoff = interviewEvalData.technical_cutoff || {}
  const evalKeyStrengths = interviewEvalData.key_strengths || []
  const evalAreasForImprovement = interviewEvalData.areas_for_improvement || []
  const evalRecommendation = interviewEvalData.recommendation || ''
  const evalSummary = interviewEvalData.summary || interview.summary || ''
  const interviewScore = interview.score ?? evalScoring.final_score ?? 0
  const interviewRec = interview.recommendation || 'Pending'

  // Group questions by criterion for display
  const questionsByCriterion: Record<string, any[]> = {}
  evalQuestions.forEach((q: any) => {
    const crit = q.criterion || 'General'
    if (!questionsByCriterion[crit]) questionsByCriterion[crit] = []
    questionsByCriterion[crit].push(q)
  })
  const criterionNames = Object.keys(questionsByCriterion)

  // Criterion icon/color mapping
  const getCriterionStyle = (criterion: string) => {
    const map: Record<string, { bg: string; text: string; icon: any }> = {
      'Technical Skills': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Brain },
      'Problem Solving': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Target },
      'Communication': { bg: 'bg-teal-100', text: 'text-teal-700', icon: MessageSquare },
      'Culture Fit': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Zap },
      'Leadership': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: TrendingUp },
    }
    return map[criterion] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: BarChart3 }
  }

  const getDifficultyBadge = (difficulty: string) => {
    if (difficulty === 'High') return 'bg-red-100 text-red-700'
    if (difficulty === 'Medium') return 'bg-amber-100 text-amber-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-6 print:py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold print:text-xl">Report of {candidate.name} for {candidate.position}</h1>
              <p className="text-blue-100 text-sm mt-2">Candidate ID: {candidateId}</p>
            </div>
            <Button onClick={handleDownloadReport} className="bg-white text-blue-600 hover:bg-blue-50 print:hidden" size="default">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b print:hidden">
          {[
            { id: 'application', label: 'Candidate Job Application', icon: User },
            { id: 'evaluation', label: 'Interview Evaluation', icon: FileText },
            { id: 'transcript', label: 'Interview Transcript', icon: MessageSquare }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 print:p-4 space-y-4 print:space-y-3">
          {/* Candidate Header Card - Only on Application tab */}
          {activeTab === 'application' && (
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 print:p-3 border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 print:w-12 print:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg print:text-base">
                {(candidate.name || '').split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-lg print:text-base font-bold text-gray-900">{candidate.name}</h2>
                <p className="text-sm print:text-xs text-gray-600">{candidate.position}</p>
                <Badge className={`mt-1 text-[10px] print:text-[9px] ${shouldHire ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {shouldHire ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {shouldHire ? 'HIRE' : 'NOT HIRE'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {candidate.resumeUrl && (
                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs print:hidden">
                    <Download className="h-3 w-3 mr-1" />
                    Download Resume
                  </Button>
                </a>
              )}
              <div className="text-center">
                <p className="text-xs text-gray-500">Score</p>
                <div className={`text-2xl print:text-xl font-bold ${getScoreColor(cvScore)}`}>
                  {cvScore}<span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* ==================== APPLICATION TAB ==================== */}
          {activeTab === 'application' && (
            <>
              {/* Candidate Profile Snapshot */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-800 text-white px-4 py-2 print:py-1.5">
                  <h3 className="text-sm print:text-xs font-semibold">Candidate Profile Snapshot</h3>
                </div>
                <div className="divide-y text-xs print:text-[10px]">
                  {[
                    { label: 'Name', value: candidate.name || 'N/A' },
                    { label: 'Expected Salary', value: salaryStr },
                    { label: 'Availability', value: availabilityStr },
                    { label: 'Classification', value: classificationStr },
                    { label: 'Education', value: educationStr },
                    { label: 'Employer History', value: employerStr },
                    { label: 'Location', value: candidate.location || 'N/A' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex">
                      <div className="w-32 print:w-28 bg-gray-50 px-3 py-2 print:py-1.5 font-medium text-gray-700 shrink-0">
                        {item.label}
                      </div>
                      <div className="flex-1 px-3 py-2 print:py-1.5 text-gray-600">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills & Experience Alignment */}
              {skillsAlignment.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-2 print:py-1.5">
                    <h3 className="text-sm print:text-xs font-semibold">Skills & Experience Alignment</h3>
                  </div>
                  <table className="w-full text-xs print:text-[10px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 print:py-1.5 text-left font-semibold text-gray-700 w-36">Area</th>
                        <th className="px-3 py-2 print:py-1.5 text-center font-semibold text-gray-700 w-20">Score</th>
                        <th className="px-3 py-2 print:py-1.5 text-center font-semibold text-gray-700 w-16">Points</th>
                        <th className="px-3 py-2 print:py-1.5 text-left font-semibold text-gray-700">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {skillsAlignment.map((skill: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 print:py-1.5 font-medium text-gray-800">{skill.area}</td>
                          <td className="px-3 py-2 print:py-1.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-semibold ${getScoreBg(skill.score)} ${getScoreColor(skill.score)}`}>
                              {skill.score}/100
                            </span>
                          </td>
                          <td className="px-3 py-2 print:py-1.5 text-center text-green-600 font-medium">{skill.points}</td>
                          <td className="px-3 py-2 print:py-1.5 text-gray-600">
                            <div>{skill.details}</div>
                            {skill.subDetails && (
                              <div className="text-[10px] print:text-[9px] text-gray-500 mt-0.5 whitespace-pre-line">
                                {skill.subDetails}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Certifications & Recent Projects */}
              <div className="grid grid-cols-2 gap-4 print:gap-3">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-2 print:py-1.5">
                    <h3 className="text-sm print:text-xs font-semibold flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5" />
                      Certifications
                    </h3>
                  </div>
                  <div className="p-3 print:p-2">
                    {certifications.length > 0 ? certifications.map((cert: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs print:text-[10px] py-0.5">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        <span className="text-gray-700">{cert}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400">No certifications found</p>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-800 text-white px-4 py-2 print:py-1.5">
                    <h3 className="text-sm print:text-xs font-semibold flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      Recent Projects
                    </h3>
                  </div>
                  <div className="p-3 print:p-2 space-y-2 print:space-y-1.5">
                    {recentProjects.length > 0 ? recentProjects.map((project: any, idx: number) => (
                      <div key={idx} className="text-xs print:text-[10px]">
                        <div className="font-medium text-gray-800">{project.name}</div>
                        {project.duration && <div className="text-gray-500 text-[10px] print:text-[9px]">{project.duration}</div>}
                        {project.tech && <Badge className="mt-0.5 text-[9px] print:text-[8px] bg-blue-100 text-blue-700">{project.tech}</Badge>}
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400">No projects found</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Final Recommendation */}
              <div className="border rounded-lg overflow-hidden">
                <div className={`${shouldHire ? 'bg-green-700' : 'bg-red-600'} text-white px-4 py-2 print:py-1.5`}>
                  <h3 className="text-sm print:text-xs font-semibold">Final Recommendation</h3>
                </div>
                <div className={`p-4 print:p-3 ${shouldHire ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-3 print:mb-2">
                    {shouldHire ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
                    <span className={`font-bold text-sm print:text-xs ${shouldHire ? 'text-green-700' : 'text-red-700'}`}>
                      Recommendation: {recommendation}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 print:gap-3 text-xs print:text-[10px]">
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Strengths:</p>
                      <div className="flex flex-wrap gap-1">
                        {matchedSkills.length > 0 ? matchedSkills.map((s: string, i: number) => (
                          <Badge key={i} className="bg-green-100 text-green-700 text-[10px] print:text-[9px]">{s}</Badge>
                        )) : <span className="text-gray-400">N/A</span>}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Gaps:</p>
                      <div className="flex flex-wrap gap-1">
                        {missingSkills.length > 0 ? missingSkills.map((g: string, i: number) => (
                          <Badge key={i} className="bg-red-100 text-red-700 text-[10px] print:text-[9px]">{g}</Badge>
                        )) : <span className="text-gray-400">None</span>}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700 mb-1">Next Steps:</p>
                      <ul className="space-y-0.5">
                        {riskAdj.critical_gaps?.length > 0 && (
                          <li className="flex items-start gap-1 text-gray-600">
                            <span className="text-blue-500">→</span>
                            <span>Address critical gaps: {riskAdj.critical_gaps.join(', ')}</span>
                          </li>
                        )}
                        <li className="flex items-start gap-1 text-gray-600">
                          <span className="text-blue-500">→</span>
                          <span>Technical interview to verify claimed skills</span>
                        </li>
                        <li className="flex items-start gap-1 text-gray-600">
                          <span className="text-blue-500">→</span>
                          <span>Validate work experience with references</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== EVALUATION TAB ==================== */}
          {activeTab === 'evaluation' && (
            <>
              {interview.status === 'Not Scheduled' ? (
                <div className="border rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Interview Not Completed</h3>
                  <p className="text-sm text-gray-500">Interview status: {interview.status}</p>
                </div>
              ) : Object.keys(evalCriterionAvg).length === 0 && evalQuestions.length === 0 && !interviewScore ? (
                <div className="border rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">Interview Data Not Available</h3>
                  <p className="text-sm text-gray-500">Interview status: {interview.status}</p>
                  <p className="text-xs text-gray-400 mt-2">The interview has been marked as {interview.status}, but evaluation data is not available yet.</p>
                </div>
              ) : (
                <>
                  {/* Overall Score & Summary Card */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-xs text-gray-300">Interview Score</p>
                          <div className={`text-2xl font-bold ${interviewScore >= 65 ? 'text-green-400' : 'text-red-400'}`}>
                            {interviewScore}<span className="text-sm text-gray-400">/100</span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          {interviewRec && (
                            <Badge className={`text-xs ${
                              interviewRec?.trim().toUpperCase() === 'HIRE'
                                ? 'bg-green-400/20 text-green-200 border border-green-400/30'
                                : interviewRec?.trim().toUpperCase() === 'NOT HIRE'
                                ? 'bg-red-400/20 text-red-200 border border-red-400/30'
                                : interviewRec?.trim().toUpperCase() === 'STRONGLY RECOMMEND' || interviewRec?.trim().toUpperCase() === 'RECOMMEND'
                                ? 'bg-green-400/20 text-green-200 border border-green-400/30'
                                : interviewRec?.trim().toUpperCase() === 'ON HOLD'
                                ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                                : 'bg-red-400/20 text-red-200 border border-red-400/30'
                            }`}>
                              {interviewRec}
                            </Badge>
                          )}
                          {interview.completedAt && (
                            <p className="text-xs text-gray-300 flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {new Date(interview.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {evalSummary && (
                      <div className="px-5 py-3 bg-purple-50 border-b text-xs text-gray-700 leading-relaxed">
                        <span className="font-semibold text-purple-700">AI Summary: </span>{evalSummary}
                      </div>
                    )}
                  </div>

                  {/* Criterion Averages Bar */}
                  {Object.keys(evalCriterionAvg).length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-800 text-white px-4 py-2 print:py-1.5">
                        <h3 className="text-sm print:text-xs font-semibold flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Criterion Performance
                        </h3>
                      </div>
                      <div className="p-4 space-y-2.5">
                        {Object.entries(evalCriterionAvg).map(([criterion, avg]: [string, any]) => {
                          const style = getCriterionStyle(criterion)
                          const CritIcon = style.icon
                          const score = Math.round(Number(avg))
                          return (
                            <div key={criterion} className="flex items-center gap-3">
                              <div className={`flex items-center gap-1.5 w-36 shrink-0`}>
                                <div className={`p-1 rounded ${style.bg}`}>
                                  <CritIcon className={`h-3 w-3 ${style.text}`} />
                                </div>
                                <span className="text-xs font-medium text-gray-700 truncate">{criterion}</span>
                              </div>
                              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                                <div
                                  className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' : score >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                                  style={{ width: `${Math.min(score, 100)}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">{score}%</span>
                              </div>
                            </div>
                          )
                        })}
                        {evalTechCutoff.threshold && (
                          <div className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded text-[10px] font-medium ${evalTechCutoff.failed ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {evalTechCutoff.failed ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            Technical Cutoff ({evalTechCutoff.threshold}%): {evalTechCutoff.failed ? 'FAILED' : 'PASSED'} — Avg: {Math.round(evalTechCutoff.technical_avg)}%
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Key Strengths & Areas for Improvement */}
                  {(evalKeyStrengths.length > 0 || evalAreasForImprovement.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 print:gap-3">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-700 text-white px-4 py-2 print:py-1.5 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <h3 className="text-sm print:text-xs font-semibold">Key Strengths</h3>
                        </div>
                        <div className="p-3 space-y-1.5">
                          {evalKeyStrengths.map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                              <span className="text-gray-700">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-red-600 text-white px-4 py-2 print:py-1.5 flex items-center gap-1.5">
                          <TrendingDown className="h-3.5 w-3.5" />
                          <h3 className="text-sm print:text-xs font-semibold">Areas for Improvement</h3>
                        </div>
                        <div className="p-3 space-y-1.5">
                          {evalAreasForImprovement.map((g: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                              <span className="text-gray-700">{g}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question-wise Detailed Evaluation grouped by Criterion */}
                  {criterionNames.map((criterion: string) => {
                    const style = getCriterionStyle(criterion)
                    const CritIcon = style.icon
                    const critQuestions = questionsByCriterion[criterion] || []
                    const critAvg = evalCriterionAvg[criterion] ? Math.round(Number(evalCriterionAvg[criterion])) : null

                    return (
                      <div key={criterion} className="border rounded-lg overflow-hidden">
                        <div className={`bg-gray-800 text-white px-4 py-2.5 print:py-2 flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${style.bg}`}>
                              <CritIcon className={`h-3.5 w-3.5 ${style.text}`} />
                            </div>
                            <h3 className="text-sm print:text-xs font-semibold">{criterion}</h3>
                          </div>
                          <Badge className="text-[9px] bg-white/15 text-white/80">{critQuestions.length} question{critQuestions.length > 1 ? 's' : ''}</Badge>
                        </div>
                        <div className="divide-y">
                          {critQuestions.map((q: any, qIdx: number) => (
                            <div key={qIdx} className="p-4 print:p-3 space-y-2.5">
                              {/* Question Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <span className="text-xs font-bold text-purple-600 bg-purple-50 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                                    Q{q.question_number}
                                  </span>
                                  <p className="text-xs font-semibold text-gray-800 leading-relaxed">{q.question_text}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <Badge className={`text-[9px] ${getDifficultyBadge(q.difficulty)}`}>{q.difficulty}</Badge>
                                  <Badge className="text-[9px] bg-gray-100 text-gray-600 font-mono">
                                    {q.weighted_contribution ?? 0}/{q.marks ?? 0}
                                  </Badge>
                                </div>
                              </div>

                              {/* Candidate Response */}
                              <div className="ml-8 bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">Candidate Response</p>
                                <p className="text-xs text-gray-700 leading-relaxed">{q.candidate_response || 'No response provided'}</p>
                              </div>

                              {/* Strengths & Gaps */}
                              <div className="ml-8 grid grid-cols-2 gap-3">
                                {q.strengths?.length > 0 && (
                                  <div className="bg-green-50 border border-green-100 rounded-lg p-2.5">
                                    <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                      <TrendingUp className="h-3 w-3" /> Strengths
                                    </p>
                                    <div className="space-y-1">
                                      {q.strengths.map((s: string, sIdx: number) => (
                                        <div key={sIdx} className="flex items-start gap-1.5 text-[11px] text-green-800">
                                          <CheckCircle className="h-3 w-3 shrink-0 mt-0.5 text-green-500" />
                                          <span>{s}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {q.gaps?.length > 0 && (
                                  <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                                    <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                      <TrendingDown className="h-3 w-3" /> Gaps
                                    </p>
                                    <div className="space-y-1">
                                      {q.gaps.map((g: string, gIdx: number) => (
                                        <div key={gIdx} className="flex items-start gap-1.5 text-[11px] text-red-800">
                                          <XCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-500" />
                                          <span>{g}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Evaluation Reasoning */}
                              {q.evaluation_reasoning && (
                                <div className="ml-8 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <Brain className="h-3 w-3" /> AI Evaluation Reasoning
                                  </p>
                                  <p className="text-[11px] text-gray-600 leading-relaxed italic">{q.evaluation_reasoning}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}

          {/* ==================== TRANSCRIPT TAB ==================== */}
          {activeTab === 'transcript' && (
            <>
              {/* Interview Transcript from interview_feedback */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">Interview Transcript</h3>
                  </div>
                  {interview.completedAt && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(interview.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                {interview.feedback ? (
                  <div className="p-5 print:p-4">
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {(() => {
                        const lines = interview.feedback.split('\n')
                        const messages: Array<{speaker: 'interviewer' | 'candidate', text: string}> = []
                        let currentSpeaker: 'interviewer' | 'candidate' | null = null
                        let currentMessage = ''
                        
                        lines.forEach((line: string) => {
                          const trimmedLine = line.trim()
                          if (!trimmedLine) {
                            if (currentMessage) {
                              messages.push({ speaker: currentSpeaker!, text: currentMessage.trim() })
                              currentMessage = ''
                              currentSpeaker = null
                            }
                            return
                          }
                          
                          // Check for speaker indicators
                          const lowerLine = trimmedLine.toLowerCase()
                          let detectedSpeaker: 'interviewer' | 'candidate' | null = null
                          let messageText = trimmedLine
                          
                          if (lowerLine.includes('interviewer:') || lowerLine.includes('ai:') || lowerLine.includes('hr:') || lowerLine.includes('recruiter:')) {
                            detectedSpeaker = 'interviewer'
                            const colonIndex = trimmedLine.indexOf(':')
                            if (colonIndex !== -1) {
                              messageText = trimmedLine.substring(colonIndex + 1).trim()
                            }
                          } else if (lowerLine.includes('candidate:') || lowerLine.includes('user:') || lowerLine.includes('applicant:')) {
                            detectedSpeaker = 'candidate'
                            const colonIndex = trimmedLine.indexOf(':')
                            if (colonIndex !== -1) {
                              messageText = trimmedLine.substring(colonIndex + 1).trim()
                            }
                          } else if (lowerLine.includes('question:') || lowerLine.includes('ask:') || lowerLine.includes('tell me')) {
                            detectedSpeaker = 'interviewer'
                          } else if (lowerLine.includes('answer:') || lowerLine.includes('i think') || lowerLine.includes('my experience') || lowerLine.includes('i have')) {
                            detectedSpeaker = 'candidate'
                          }
                          
                          if (detectedSpeaker) {
                            if (currentMessage && currentSpeaker !== detectedSpeaker) {
                              messages.push({ speaker: currentSpeaker!, text: currentMessage.trim() })
                              currentMessage = ''
                            }
                            currentSpeaker = detectedSpeaker
                            currentMessage += (currentMessage ? ' ' : '') + messageText
                          } else if (currentSpeaker) {
                            // Continuation of current message
                            currentMessage += ' ' + trimmedLine
                          } else {
                            // Default to interviewer if no speaker detected
                            currentSpeaker = 'interviewer'
                            currentMessage = trimmedLine
                          }
                        })
                        
                        // Add last message
                        if (currentMessage && currentSpeaker) {
                          messages.push({ speaker: currentSpeaker, text: currentMessage.trim() })
                        }
                        
                        return messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.speaker === 'interviewer' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[70%] ${msg.speaker === 'interviewer' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'} rounded-lg p-3 shadow-sm`}>
                              <div className={`text-[10px] font-semibold mb-1 ${msg.speaker === 'interviewer' ? 'text-blue-700' : 'text-green-700'}`}>
                                {msg.speaker === 'interviewer' ? '👨‍💼 Interviewer' : '👤 Candidate'}
                              </div>
                              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {msg.text}
                              </div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-gray-500 mb-1">No Transcript Available</h3>
                    <p className="text-xs text-gray-400">Interview transcript will appear here once the interview is completed.</p>
                  </div>
                )}
              </div>

                          </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 print:py-2 text-center text-xs text-gray-500 print:text-[10px]">
          Generated by HireGenAI • {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}
