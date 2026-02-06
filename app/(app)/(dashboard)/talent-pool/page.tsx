'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Filter, Plus, Mail, Phone, Calendar, X, Send, Briefcase, Target, TrendingUp, Clock, Upload, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

const availableJDs = [
  { id: '1', title: 'Senior Full Stack Developer', department: 'Engineering', location: 'Remote' },
  { id: '2', title: 'Product Manager', department: 'Product', location: 'New York' },
  { id: '3', title: 'UX Designer', department: 'Design', location: 'San Francisco' },
  { id: '4', title: 'DevOps Engineer', department: 'Engineering', location: 'Remote' },
  { id: '5', title: 'Data Scientist', department: 'Analytics', location: 'Boston' },
]

type UserRole = 'recruiter' | 'admin' | 'manager' | 'director'

const recruiters = [
  { id: '1', name: 'Sarah Johnson' },
  { id: '2', name: 'Mike Davis' },
  { id: '3', name: 'Emily Chen' },
  { id: '4', name: 'John Williams' },
]

const emailTemplates = {
  jd: {
    subject: 'Exciting New Opportunity at [Company Name]',
    body: `Hi [Candidate Name],

I hope this email finds you well! I wanted to reach out to share an exciting opportunity that I think would be a great fit for your background and skills.

We're currently hiring for: [Job Title]
Location: [Location]
Department: [Department]

Key Responsibilities:
• Lead technical architecture and implementation
• Collaborate with cross-functional teams
• Mentor junior team members

Required Skills:
• [Skill 1]
• [Skill 2]
• [Skill 3]

This role offers competitive compensation, comprehensive benefits, and the opportunity to work on cutting-edge projects.

Would you be interested in learning more? I'd love to schedule a call to discuss this opportunity in detail.

Best regards,
[Your Name]
[Company Name] Talent Acquisition Team`
  },
  newsletter: {
    subject: '[Company Name] Monthly Newsletter - [Month]',
    body: `Hi [Candidate Name],

Welcome to this month's newsletter from [Company Name]!

🎉 Company Updates:
• Exciting product launches and company milestones
• New office expansion
• Awards and recognition

💼 Career Opportunities:
We're growing! Check out our latest openings:
• Software Engineers
• Product Managers
• Designers

📚 Industry Insights:
• Latest trends in technology
• Professional development resources
• Upcoming webinars and events

🌟 Employee Spotlight:
Meet our talented team members and learn about their journeys

Stay connected with us:
LinkedIn | Twitter | Website

Best regards,
The [Company Name] Team`
  },
  greeting: {
    subject: 'Season\'s Greetings from [Company Name]',
    body: `Hi [Candidate Name],

We hope this message finds you well!

As the year comes to a close, we wanted to take a moment to reach out and wish you all the best. Whether you've recently connected with us or we've been in touch for a while, we truly appreciate your interest in [Company Name].

🎊 What's New:
We've had an incredible year of growth and innovation, and we're excited about what's ahead in the coming year.

🤝 Stay Connected:
We'd love to keep you in the loop about opportunities that match your skills and career goals. Feel free to reach out anytime!

Wishing you and your loved ones a wonderful holiday season and a prosperous new year!

Warm regards,
[Your Name]
[Company Name] Talent Acquisition Team`
  }
}

const talentPoolData = [
  { name: 'Sarah Martinez', position: 'Senior Developer', addedDate: 'Dec 15, 2023', source: 'Referral', status: 'Active Interest', lastContact: 'Jan 10, 2024', email: 'sarah.m@email.com', phone: '+1 555-0123', skills: ['React', 'Node.js', 'TypeScript'], history: [
    { date: 'Dec 15, 2023', event: 'Added to Talent Pool', description: 'Referred by John Smith from Engineering team. Strong technical background.', source: 'Referral' },
    { date: 'Dec 20, 2023', event: 'Email Sent', description: 'Sent greeting email to establish connection' },
    { date: 'Jan 10, 2024', event: 'Email Sent', description: 'Shared Senior Developer position opening' },
    { date: 'Jan 12, 2024', event: 'Response Received', description: 'Expressed interest in future opportunities' }
  ]},
  { name: 'Kevin Lee', position: 'Product Manager', addedDate: 'Nov 20, 2023', source: 'Past Application', status: 'Passive', lastContact: 'Dec 5, 2023', email: 'kevin.l@email.com', phone: '+1 555-0124', skills: ['Product Strategy', 'Agile', 'Analytics'],
    cvScore: '85/100', interviewScore: '88/100', rejectionStage: 'HM Review', rejectionReason: 'Position filled by internal candidate',
    history: [
      { date: 'Oct 15, 2023', event: 'Application Submitted', description: 'Applied for Senior Product Manager position', stage: 'New Applications' },
      { date: 'Oct 18, 2023', event: 'CV Screening', description: 'CV Score: 85/100 - Strong product strategy experience', stage: 'Screening' },
      { date: 'Oct 25, 2023', event: 'AI Interview', description: 'Interview Score: 88/100 - Excellent communication and leadership skills', stage: 'Shortlisted' },
      { date: 'Nov 5, 2023', event: 'Hiring Manager Review', description: 'HM provided positive feedback but position was filled internally', stage: 'HM Review' },
      { date: 'Nov 20, 2023', event: 'Moved to Talent Pool', description: 'Strong candidate for future PM opportunities. Rejected from current role due to internal hire.', stage: 'Talent Pool' }
    ]
  },
  { name: 'Nina Patel', position: 'UX Designer', addedDate: 'Jan 5, 2024', source: 'LinkedIn', status: 'Active Interest', lastContact: 'Jan 20, 2024', email: 'nina.p@email.com', phone: '+1 555-0125', skills: ['Figma', 'UI/UX', 'Prototyping'] },
  { name: 'Marcus Johnson', position: 'Data Scientist', addedDate: 'Dec 1, 2023', source: 'Referral', status: 'Active Interest', lastContact: 'Jan 15, 2024', email: 'marcus.j@email.com', phone: '+1 555-0126', skills: ['Python', 'ML', 'SQL'] },
  { name: 'Elena Rodriguez', position: 'DevOps Engineer', addedDate: 'Nov 15, 2023', source: 'Past Application', status: 'Passive', lastContact: 'Dec 20, 2023', email: 'elena.r@email.com', phone: '+1 555-0127', skills: ['AWS', 'Docker', 'Kubernetes'],
    cvScore: '92/100', interviewScore: '90/100', rejectionStage: 'Offer Stage', rejectionReason: 'Candidate declined offer - salary expectations not met',
    history: [
      { date: 'Sep 10, 2023', event: 'Application Submitted', description: 'Applied for Senior DevOps Engineer position', stage: 'New Applications' },
      { date: 'Sep 12, 2023', event: 'CV Screening', description: 'CV Score: 92/100 - Exceptional AWS and container orchestration experience', stage: 'Screening' },
      { date: 'Sep 20, 2023', event: 'AI Interview', description: 'Interview Score: 90/100 - Strong technical knowledge and problem-solving', stage: 'Shortlisted' },
      { date: 'Oct 15, 2023', event: 'Offer Extended', description: 'Offer: $115,000 + benefits', stage: 'Offer Stage' },
      { date: 'Nov 1, 2023', event: 'Offer Declined', description: 'Candidate seeking $130,000+ compensation', stage: 'Offer Stage' },
      { date: 'Nov 15, 2023', event: 'Moved to Talent Pool', description: 'Excellent candidate for future senior roles with appropriate compensation', stage: 'Talent Pool' }
    ]
  },
  { name: 'James Wilson', position: 'Full Stack Developer', addedDate: 'Jan 10, 2024', source: 'LinkedIn', status: 'Active Interest', lastContact: 'Jan 25, 2024', email: 'james.w@email.com', phone: '+1 555-0128', skills: ['JavaScript', 'Python', 'MongoDB'] },
  { name: 'Olivia Chen', position: 'Marketing Manager', addedDate: 'Dec 10, 2023', source: 'Referral', status: 'Passive', lastContact: 'Jan 5, 2024', email: 'olivia.c@email.com', phone: '+1 555-0129', skills: ['Digital Marketing', 'SEO', 'Content Strategy'] },
  { name: 'Daniel Kim', position: 'Backend Engineer', addedDate: 'Nov 25, 2023', source: 'Past Application', status: 'Active Interest', lastContact: 'Jan 18, 2024', email: 'daniel.k@email.com', phone: '+1 555-0130', skills: ['Java', 'Spring Boot', 'PostgreSQL'],
    cvScore: '88/100', interviewScore: '87/100', rejectionStage: 'Shortlisted', rejectionReason: 'Timeline mismatch - candidate had 3-month notice period',
    history: [
      { date: 'Oct 1, 2023', event: 'Application Submitted', description: 'Applied for Backend Engineer position', stage: 'New Applications' },
      { date: 'Oct 5, 2023', event: 'CV Screening', description: 'CV Score: 88/100 - Solid Java and Spring Boot experience', stage: 'Screening' },
      { date: 'Oct 20, 2023', event: 'AI Interview', description: 'Interview Score: 87/100 - Good technical skills and system design knowledge', stage: 'Shortlisted' },
      { date: 'Nov 10, 2023', event: 'Application Withdrawn', description: 'Candidate has 3-month notice period, position needed immediate start', stage: 'Shortlisted' },
      { date: 'Nov 25, 2023', event: 'Moved to Talent Pool', description: 'Strong technical candidate, good fit for roles with flexible start dates', stage: 'Talent Pool' },
      { date: 'Jan 18, 2024', event: 'Email Sent', description: 'Reached out about new Backend Engineer openings' }
    ]
  },
  { name: 'Sophia Brown', position: 'Product Designer', addedDate: 'Jan 1, 2024', source: 'LinkedIn', status: 'Active Interest', lastContact: 'Jan 22, 2024', email: 'sophia.b@email.com', phone: '+1 555-0131', skills: ['Sketch', 'Design Systems', 'User Research'] },
  { name: 'Ryan Thompson', position: 'QA Engineer', addedDate: 'Dec 5, 2023', source: 'Referral', status: 'Passive', lastContact: 'Dec 28, 2023', email: 'ryan.t@email.com', phone: '+1 555-0132', skills: ['Automation Testing', 'Selenium', 'Cypress'] },
  { name: 'Aisha Patel', position: 'Frontend Developer', addedDate: 'Jan 8, 2024', source: 'LinkedIn', status: 'Active Interest', lastContact: 'Jan 26, 2024', email: 'aisha.p@email.com', phone: '+1 555-0133', skills: ['Vue.js', 'CSS', 'Responsive Design'] },
  { name: 'Michael Zhang', position: 'Security Engineer', addedDate: 'Nov 30, 2023', source: 'Past Application', status: 'Passive', lastContact: 'Jan 2, 2024', email: 'michael.z@email.com', phone: '+1 555-0134', skills: ['Cybersecurity', 'Penetration Testing', 'Network Security'],
    cvScore: '91/100', interviewScore: 'N/A', rejectionStage: 'Screening', rejectionReason: 'Overqualified for the position level',
    history: [
      { date: 'Nov 1, 2023', event: 'Application Submitted', description: 'Applied for Security Engineer (Mid-level) position', stage: 'New Applications' },
      { date: 'Nov 5, 2023', event: 'CV Screening', description: 'CV Score: 91/100 - Extensive senior-level security experience', stage: 'Screening' },
      { date: 'Nov 10, 2023', event: 'Screening Review', description: 'Candidate experience exceeds position requirements significantly', stage: 'Screening' },
      { date: 'Nov 30, 2023', event: 'Moved to Talent Pool', description: 'Overqualified for mid-level role. Perfect candidate for senior security positions.', stage: 'Talent Pool' }
    ]
  }
]

export default function TalentPoolPage() {
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'Active Interest' | 'Passive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [showJDDialog, setShowJDDialog] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailType, setEmailType] = useState<'jd' | 'newsletter' | 'greeting' | ''>('')
  const [selectedJD, setSelectedJD] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [viewAsRole, setViewAsRole] = useState<UserRole>('recruiter')
  const [viewAsRecruiter, setViewAsRecruiter] = useState('1')
  const [showAddCandidateDialog, setShowAddCandidateDialog] = useState(false)
  const [showCandidateDetailsDialog, setShowCandidateDetailsDialog] = useState(false)
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState<any>(null)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    source: 'Manual Entry',
    status: 'Passive',
    skills: '',
    experience: '',
    location: '',
    currentCompany: '',
    linkedIn: '',
    notes: ''
  })
  const [showBulkEmail, setShowBulkEmail] = useState(false) // Declare setShowBulkEmail here

  // Permission check - only recruiters can modify
  const canModify = viewAsRole === 'recruiter'

  // Extract unique values for filters
  const allPositions = [...new Set(talentPoolData.map(c => c.position))]
  const allSources = [...new Set(talentPoolData.map(c => c.source))]

  const filteredCandidates = talentPoolData.filter(candidate => {
    const matchesStatus = selectedStatus === 'all' || candidate.status === selectedStatus
    const matchesSearch = searchQuery === '' || 
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSkill = skillFilter === '' || 
      candidate.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase()))
    const matchesPosition = positionFilter === 'all' || candidate.position === positionFilter
    const matchesSource = sourceFilter === 'all' || candidate.source === sourceFilter
    
    return matchesStatus && matchesSearch && matchesSkill && matchesPosition && matchesSource
  })

  const stats = {
    total: talentPoolData.length,
    activeInterest: talentPoolData.filter(c => c.status === 'Active Interest').length,
    passive: talentPoolData.filter(c => c.status === 'Passive').length,
    byPosition: [...new Set(talentPoolData.map(c => c.position))].length,
    bySource: {
      referral: talentPoolData.filter(c => c.source === 'Referral').length,
      linkedin: talentPoolData.filter(c => c.source === 'LinkedIn').length,
      pastApplication: talentPoolData.filter(c => c.source === 'Past Application').length,
    },
    recentlyContacted: talentPoolData.filter(c => {
      const contactDate = new Date(c.lastContact)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 7
    }).length,
    avgSkillsPerCandidate: (talentPoolData.reduce((sum, c) => sum + c.skills.length, 0) / talentPoolData.length).toFixed(1),
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Talent Pool</h1>
          <p className="text-xs text-gray-600 mt-0.5">Manage and engage with potential candidates</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* View As Filter */}
          <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-blue-50">
            <span className="text-xs font-medium text-gray-700">View as:</span>
            <select
              value={viewAsRole}
              onChange={(e) => setViewAsRole(e.target.value as UserRole)}
              className="text-xs border-0 bg-transparent focus:outline-none font-medium"
            >
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
              <option value="manager">TA Manager</option>
              <option value="director">Director</option>
            </select>
            {viewAsRole === 'recruiter' && (
              <>
                <span className="text-xs text-gray-400">|</span>
                <select
                  value={viewAsRecruiter}
                  onChange={(e) => setViewAsRecruiter(e.target.value)}
                  className="text-xs border-0 bg-transparent focus:outline-none font-medium"
                >
                  {recruiters.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          {!canModify && (
            <Badge variant="secondary" className="text-xs">View Only</Badge>
          )}
          <Button 
            className="gap-2 w-full sm:w-auto" 
            size="sm"
            disabled={!canModify}
            title={!canModify ? 'View-only mode: Only recruiters can add candidates' : 'Add candidate to pool'}
            onClick={() => setShowAddCandidateDialog(true)}
          >
            <Plus className="h-3 w-3" />
            Add to Pool
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Total Pool</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{stats.byPosition} positions</p>
            </div>
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Active Interest</p>
              <p className="text-xl font-bold text-green-600">{stats.activeInterest}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{((stats.activeInterest/stats.total)*100).toFixed(0)}% of pool</p>
            </div>
            <Target className="h-6 w-6 text-green-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Passive</p>
              <p className="text-xl font-bold text-gray-600">{stats.passive}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{((stats.passive/stats.total)*100).toFixed(0)}% of pool</p>
            </div>
            <Users className="h-6 w-6 text-gray-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Referrals</p>
              <p className="text-xl font-bold text-purple-600">{stats.bySource.referral}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">High quality source</p>
            </div>
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Recent Contact</p>
              <p className="text-xl font-bold text-orange-600">{stats.recentlyContacted}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Last 7 days</p>
            </div>
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
        </Card>
        <Card className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Avg Skills</p>
              <p className="text-xl font-bold text-indigo-600">{stats.avgSkillsPerCandidate}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Per candidate</p>
            </div>
            <Briefcase className="h-6 w-6 text-indigo-600" />
          </div>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="p-2">
        <div className="space-y-2">
          {/* Search and Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-[200px]"
            />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'Active Interest' | 'Passive')}
              className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Active Interest">Active Interest</option>
              <option value="Passive">Passive</option>
            </select>
            <input
              type="text"
              placeholder="Filter by skill..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
            />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Positions</option>
              {allPositions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              {allSources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setSkillFilter('')
                setPositionFilter('all')
                setSourceFilter('all')
                setSelectedStatus('all')
              }}
              className="bg-transparent"
            >
              Clear All
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
              <span className="text-sm font-medium text-gray-700">
                {selectedCandidates.length} selected
              </span>
              {canModify ? (
                <>
                  <Button 
                    size="sm"
                    onClick={() => setShowEmailDialog(true)}
                    className="bg-transparent"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Send Email
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setShowJDDialog(true)}
                    variant="outline"
                    className="bg-transparent"
                  >
                    Send JD
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="text-xs">View-only mode: Cannot send emails</Badge>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSelectedCandidates([])}
                className="bg-transparent"
              >
                Clear Selection
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Talent Pool Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input 
                      type="checkbox"
                      checked={selectedCandidates.length === filteredCandidates.length && filteredCandidates.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCandidates(filteredCandidates.map(c => c.email))
                        } else {
                          setSelectedCandidates([])
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">CV Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Interview Score</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Last Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors border-b">
                    <td className="px-3 py-4">
                      <input 
                        type="checkbox"
                        checked={selectedCandidates.includes(candidate.email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCandidates([...selectedCandidates, candidate.email])
                          } else {
                            setSelectedCandidates(selectedCandidates.filter(email => email !== candidate.email))
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {candidate.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <button 
                            onClick={() => {
                              setSelectedCandidateDetails(candidate)
                              setShowCandidateDetailsDialog(true)
                            }}
                            className="font-medium text-blue-600 hover:text-blue-800 text-sm underline decoration-dotted cursor-pointer transition-colors text-left"
                          >
                            {candidate.name}
                          </button>
                          <div className="text-xs text-gray-500">{candidate.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{candidate.position}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 2).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{candidate.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {candidate.cvScore ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                          {candidate.cvScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {candidate.interviewScore ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                          {candidate.interviewScore}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={candidate.status === 'Active Interest' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {candidate.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{candidate.source}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{candidate.lastContact}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 group relative">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          title={`Email: ${candidate.email}`}
                          className="bg-transparent"
                          disabled={!canModify}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          title={`Call: ${candidate.phone}`}
                          className="bg-transparent"
                          disabled={!canModify}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        {/* Hover Tooltip */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          <div>{candidate.email}</div>
                          <div>{candidate.phone}</div>
                          {!canModify && <div className="text-yellow-400 mt-1">View-only mode</div>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Send Email Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50 sticky top-0 z-10">
              <h3 className="text-lg font-semibold">Send Email to Candidates</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowEmailDialog(false)
                  setEmailType('')
                  setSelectedJD('')
                  setEmailSubject('')
                  setEmailBody('')
                }}
                className="bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {/* Recipients */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Recipients: {selectedCandidates.length} candidate(s)
                </p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {filteredCandidates
                    .filter(c => selectedCandidates.includes(c.email))
                    .slice(0, 10)
                    .map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                  {selectedCandidates.length > 10 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedCandidates.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Email Type Selection */}
              {!emailType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Email Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all text-center"
                      onClick={() => {
                        setEmailType('jd')
                        setEmailSubject(emailTemplates.jd.subject)
                        setEmailBody(emailTemplates.jd.body)
                      }}
                    >
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-semibold text-sm">New Job Opening</div>
                      <div className="text-xs text-gray-600 mt-1">Share exciting opportunities</div>
                    </div>
                    <div
                      className="p-4 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 cursor-pointer transition-all text-center"
                      onClick={() => {
                        setEmailType('newsletter')
                        setEmailSubject(emailTemplates.newsletter.subject)
                        setEmailBody(emailTemplates.newsletter.body)
                      }}
                    >
                      <Mail className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="font-semibold text-sm">Newsletter</div>
                      <div className="text-xs text-gray-600 mt-1">Company updates & insights</div>
                    </div>
                    <div
                      className="p-4 border-2 rounded-lg hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all text-center"
                      onClick={() => {
                        setEmailType('greeting')
                        setEmailSubject(emailTemplates.greeting.subject)
                        setEmailBody(emailTemplates.greeting.body)
                      }}
                    >
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <div className="font-semibold text-sm">Greeting</div>
                      <div className="text-xs text-gray-600 mt-1">Holiday wishes & check-ins</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Selection for JD emails */}
              {emailType === 'jd' && !selectedJD && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Job Opening
                    </label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEmailType('')
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                      className="bg-transparent text-xs"
                    >
                      Back
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {availableJDs.map(jd => (
                      <div
                        key={jd.id}
                        className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedJD(jd.id)
                          const updatedBody = emailBody
                            .replace('[Job Title]', jd.title)
                            .replace('[Location]', jd.location)
                            .replace('[Department]', jd.department)
                          setEmailBody(updatedBody)
                          setEmailSubject(`Exciting Opportunity: ${jd.title} at [Company Name]`)
                        }}
                      >
                        <div className="font-medium text-sm">{jd.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {jd.department} • {jd.location}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Editor */}
              {emailType && (emailType !== 'jd' || selectedJD) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Compose Email
                    </label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setEmailType('')
                        setSelectedJD('')
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                      className="bg-transparent text-xs"
                    >
                      Change Template
                    </Button>
                  </div>
                  
                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Email subject..."
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Email body..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tip: [Candidate Name], [Company Name], and [Your Name] will be automatically replaced
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowEmailDialog(false)
                        setEmailType('')
                        setSelectedJD('')
                        setEmailSubject('')
                        setEmailBody('')
                      }}
                      className="bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        alert(`Email sent to ${selectedCandidates.length} candidate(s)!\n\nSubject: ${emailSubject}\n\nCandidates have been marked as contacted.`)
                        setShowEmailDialog(false)
                        setEmailType('')
                        setSelectedJD('')
                        setEmailSubject('')
                        setEmailBody('')
                        setSelectedCandidates([])
                      }}
                      disabled={!emailSubject || !emailBody}
                      className="bg-transparent"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send Email
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Send JD Dialog */}
      {showJDDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold">Send Job Description</h3>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowJDDialog(false)}
                className="bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Sending to {selectedCandidates.length} candidate(s)
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {filteredCandidates
                    .filter(c => selectedCandidates.includes(c.email))
                    .map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Job Description
                </label>
                <div className="space-y-2">
                  {availableJDs.map(jd => (
                    <div
                      key={jd.id}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        // Mark candidates as contacted for this JD
                        alert(`JD "${jd.title}" sent to ${selectedCandidates.length} candidate(s) and marked as contacted`)
                        setShowJDDialog(false)
                        setSelectedCandidates([])
                      }}
                    >
                      <div className="font-medium text-sm">{jd.title}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {jd.department} • {jd.location}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setShowJDDialog(false)}
                  className="bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Candidate Dialog */}
      <Dialog open={showAddCandidateDialog} onOpenChange={setShowAddCandidateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Candidate to Talent Pool</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Import Button */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-blue-900">Import from Excel</h4>
                  <p className="text-xs text-gray-600 mt-1">Upload an Excel file with candidate data in the required format</p>
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.xlsx,.xls,.csv'
                        input.onchange = (e: any) => {
                          const file = e.target.files[0]
                          console.log('[v0] Importing file:', file.name)
                          alert(`Importing candidates from ${file.name}`)
                        }
                        input.click()
                      }}
                      className="bg-transparent"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Excel File
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        console.log('[v0] Downloading template')
                        alert('Downloading Excel template with required columns:\nName, Position, Email, Phone, Skills, Experience, Location, Current Company, LinkedIn, Source, Status, Notes')
                      }}
                      className="bg-transparent"
                    >
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-4">Or Enter Candidate Details Manually</h4>
              
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-name">Full Name *</Label>
                    <Input 
                      id="candidate-name"
                      placeholder="e.g., John Doe"
                      value={newCandidate.name}
                      onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-position">Position/Role *</Label>
                    <Input 
                      id="candidate-position"
                      placeholder="e.g., Senior Developer"
                      value={newCandidate.position}
                      onChange={(e) => setNewCandidate({...newCandidate, position: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-email">Email Address *</Label>
                    <Input 
                      id="candidate-email"
                      type="email"
                      placeholder="candidate@email.com"
                      value={newCandidate.email}
                      onChange={(e) => setNewCandidate({...newCandidate, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-phone">Phone Number</Label>
                    <Input 
                      id="candidate-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={newCandidate.phone}
                      onChange={(e) => setNewCandidate({...newCandidate, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-experience">Years of Experience</Label>
                    <Input 
                      id="candidate-experience"
                      type="number"
                      placeholder="e.g., 5"
                      value={newCandidate.experience}
                      onChange={(e) => setNewCandidate({...newCandidate, experience: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-location">Location</Label>
                    <Input 
                      id="candidate-location"
                      placeholder="e.g., San Francisco, CA"
                      value={newCandidate.location}
                      onChange={(e) => setNewCandidate({...newCandidate, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-company">Current Company</Label>
                    <Input 
                      id="candidate-company"
                      placeholder="e.g., Tech Corp"
                      value={newCandidate.currentCompany}
                      onChange={(e) => setNewCandidate({...newCandidate, currentCompany: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-linkedin">LinkedIn Profile</Label>
                    <Input 
                      id="candidate-linkedin"
                      placeholder="https://linkedin.com/in/..."
                      value={newCandidate.linkedIn}
                      onChange={(e) => setNewCandidate({...newCandidate, linkedIn: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="candidate-skills">Skills (comma-separated)</Label>
                  <Input 
                    id="candidate-skills"
                    placeholder="e.g., React, Node.js, TypeScript, Python"
                    value={newCandidate.skills}
                    onChange={(e) => setNewCandidate({...newCandidate, skills: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-source">Source</Label>
                    <Select 
                      value={newCandidate.source} 
                      onValueChange={(value) => setNewCandidate({...newCandidate, source: value})}
                    >
                      <SelectTrigger id="candidate-source">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Past Application">Past Application</SelectItem>
                        <SelectItem value="Job Board">Job Board</SelectItem>
                        <SelectItem value="Event/Conference">Event/Conference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-status">Interest Status</Label>
                    <Select 
                      value={newCandidate.status} 
                      onValueChange={(value) => setNewCandidate({...newCandidate, status: value})}
                    >
                      <SelectTrigger id="candidate-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active Interest">Active Interest</SelectItem>
                        <SelectItem value="Passive">Passive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="candidate-notes">Additional Notes</Label>
                  <Textarea 
                    id="candidate-notes"
                    placeholder="Any additional information about the candidate..."
                    rows={3}
                    value={newCandidate.notes}
                    onChange={(e) => setNewCandidate({...newCandidate, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => {
                  if (!newCandidate.name || !newCandidate.position || !newCandidate.email) {
                    alert('Please fill in required fields: Name, Position, and Email')
                    return
                  }
                  console.log('[v0] Adding candidate to pool:', newCandidate)
                  alert(`Successfully added ${newCandidate.name} to talent pool!`)
                  setShowAddCandidateDialog(false)
                  setNewCandidate({
                    name: '',
                    position: '',
                    email: '',
                    phone: '',
                    source: 'Manual Entry',
                    status: 'Passive',
                    skills: '',
                    experience: '',
                    location: '',
                    currentCompany: '',
                    linkedIn: '',
                    notes: ''
                  })
                }} 
                className="flex-1"
              >
                Add to Talent Pool
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddCandidateDialog(false)
                  setNewCandidate({
                    name: '',
                    position: '',
                    email: '',
                    phone: '',
                    source: 'Manual Entry',
                    status: 'Passive',
                    skills: '',
                    experience: '',
                    location: '',
                    currentCompany: '',
                    linkedIn: '',
                    notes: ''
                  })
                }} 
                className="flex-1 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Details Dialog */}
      <Dialog open={showCandidateDetailsDialog} onOpenChange={setShowCandidateDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Candidate Profile</DialogTitle>
          </DialogHeader>
          
          {selectedCandidateDetails && (
            <div className="space-y-6 py-4">
              {/* Header with Avatar */}
              <div className="flex items-start gap-4 pb-6 border-b">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl">
                  {selectedCandidateDetails.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{selectedCandidateDetails.name}</h3>
                  <p className="text-gray-600 mt-1">{selectedCandidateDetails.position}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Mail className="h-4 w-4" />
                      {selectedCandidateDetails.email}
                    </span>
                    <span className="flex items-center gap-1 text-gray-600">
                      <Phone className="h-4 w-4" />
                      {selectedCandidateDetails.phone}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Badge className={selectedCandidateDetails.status === 'Active Interest' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {selectedCandidateDetails.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Source Information */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  How They Joined Our Talent Pool
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Source:</span>
                    <span className="text-gray-900">{selectedCandidateDetails.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 font-medium">Date Added:</span>
                    <span className="text-gray-900">{selectedCandidateDetails.addedDate}</span>
                  </div>
                  
                  {/* Past Application Details */}
                  {selectedCandidateDetails.source === 'Past Application' && (
                    <>
                      <div className="mt-3 pt-3 border-t border-blue-300">
                        <h5 className="font-semibold text-blue-900 mb-2">Previous Application Details</h5>
                        <div className="space-y-2">
                          {selectedCandidateDetails.cvScore && (
                            <div className="flex justify-between">
                              <span className="text-gray-700 font-medium">CV Score:</span>
                              <span className="font-semibold text-blue-700">{selectedCandidateDetails.cvScore}</span>
                            </div>
                          )}
                          {selectedCandidateDetails.interviewScore && (
                            <div className="flex justify-between">
                              <span className="text-gray-700 font-medium">Interview Score:</span>
                              <span className="font-semibold text-purple-700">{selectedCandidateDetails.interviewScore}</span>
                            </div>
                          )}
                          {selectedCandidateDetails.rejectionStage && (
                            <div className="flex justify-between">
                              <span className="text-gray-700 font-medium">Last Stage:</span>
                              <Badge className="bg-amber-100 text-amber-800">{selectedCandidateDetails.rejectionStage}</Badge>
                            </div>
                          )}
                          {selectedCandidateDetails.rejectionReason && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                              <span className="text-xs font-semibold text-amber-900">Reason for Moving to Talent Pool:</span>
                              <p className="text-xs text-gray-700 mt-1">{selectedCandidateDetails.rejectionReason}</p>
                            </div>
                          )}
                          <div className="mt-3">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                console.log('[v0] Viewing CV & Interview Report for:', selectedCandidateDetails.name)
                                alert('Opening detailed CV and Interview Report...')
                              }}
                              className="w-full bg-transparent"
                            >
                              <Briefcase className="h-3 w-3 mr-1" />
                              View CV & Interview Report
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {selectedCandidateDetails.history && selectedCandidateDetails.history[0] && !selectedCandidateDetails.source.includes('Past Application') && (
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <p className="text-gray-700">{selectedCandidateDetails.history[0].description}</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Skills */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Skills & Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidateDetails.skills.map((skill: string, i: number) => (
                    <Badge key={i} className="bg-purple-100 text-purple-800">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Activity History */}
              {selectedCandidateDetails.history && selectedCandidateDetails.history.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Activity Timeline
                  </h4>
                  <div className="space-y-4">
                    {selectedCandidateDetails.history.map((item: any, index: number) => (
                      <div key={index} className="relative pl-8 pb-4 border-l-2 border-gray-200 last:border-0 last:pb-0">
                        <div className="absolute left-0 top-0 -translate-x-1/2">
                          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-semibold text-sm text-gray-900">{item.event}</span>
                            <span className="text-xs text-gray-500">{item.date}</span>
                          </div>
                          <p className="text-sm text-gray-700">{item.description}</p>
                          {item.source && (
                            <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {item.source}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Contact */}
              <Card className="p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Last Contact</h4>
                    <p className="text-sm text-gray-600 mt-1">{selectedCandidateDetails.lastContact}</p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setShowCandidateDetailsDialog(false)
                      setShowBulkEmail(true)
                      setSelectedCandidates([selectedCandidateDetails.email])
                    }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Send Email
                  </Button>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => setShowCandidateDetailsDialog(false)} 
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
