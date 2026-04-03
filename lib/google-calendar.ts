import { google } from 'googleapis'
import { DatabaseService } from './database'

const INTEGRATION_NAME = 'google_calendar'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
]

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env.local')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export class GoogleCalendarService {
  /**
   * Generate the Google OAuth consent URL
   */
  static getAuthUrl(): string {
    const oauth2Client = getOAuth2Client()
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    })
  }

  /**
   * Exchange authorization code for tokens and store them
   */
  static async handleCallback(code: string) {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('No access token received from Google')
    }

    const tokenExpiry = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null

    await DatabaseService.upsertIntegrationSettings({
      integrationName: INTEGRATION_NAME,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      tokenExpiry,
      calendarConnected: true,
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    })

    console.log('✅ [GOOGLE] Calendar connected successfully')
    return tokens
  }

  /**
   * Get an authenticated OAuth2 client with auto-refresh
   */
  static async getAuthenticatedClient() {
    const settings = await DatabaseService.getIntegrationSettings(INTEGRATION_NAME)

    if (!settings || !settings.calendar_connected || !settings.access_token) {
      return null
    }

    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({
      access_token: settings.access_token,
      refresh_token: settings.refresh_token,
    })

    // Check if token is expired and refresh
    if (settings.token_expiry) {
      const expiryDate = new Date(settings.token_expiry)
      const now = new Date()
      // Refresh 5 minutes before expiry
      if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken()
          const newExpiry = credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null

          await DatabaseService.updateIntegrationTokens(
            INTEGRATION_NAME,
            credentials.access_token || settings.access_token,
            newExpiry
          )

          oauth2Client.setCredentials(credentials)
          console.log('🔄 [GOOGLE] Access token refreshed')
        } catch (error) {
          console.error('❌ [GOOGLE] Failed to refresh token:', error)
          return null
        }
      }
    }

    return oauth2Client
  }

  /**
   * Check if Google Calendar is connected
   */
  static async isConnected(): Promise<boolean> {
    try {
      const settings = await DatabaseService.getIntegrationSettings(INTEGRATION_NAME)
      return !!(settings && settings.calendar_connected && settings.access_token)
    } catch {
      return false
    }
  }

  /**
   * Get connection status details
   */
  static async getStatus() {
    try {
      const settings = await DatabaseService.getIntegrationSettings(INTEGRATION_NAME)
      if (!settings) {
        return { connected: false, calendarId: null }
      }
      return {
        connected: settings.calendar_connected && !!settings.access_token,
        calendarId: settings.calendar_id,
        connectedAt: settings.updated_at,
      }
    } catch {
      return { connected: false, calendarId: null }
    }
  }

  /**
   * Disconnect Google Calendar
   */
  static async disconnect() {
    await DatabaseService.disconnectIntegration(INTEGRATION_NAME)
    console.log('🔌 [GOOGLE] Calendar disconnected')
  }

  /**
   * Create a Google Calendar event with Google Meet link
   */
  static async createMeetingEvent(data: {
    summary: string
    description: string
    meetingDate: string // YYYY-MM-DD
    meetingTime: string // e.g. "9:00am"
    meetingEndTime: string // e.g. "9:30am"
    attendeeEmail: string
    attendeeName: string
    timezone?: string
  }): Promise<{ eventId: string; meetLink: string | null } | null> {
    const oauth2Client = await this.getAuthenticatedClient()
    if (!oauth2Client) {
      console.warn('⚠️ [GOOGLE] Calendar not connected, skipping event creation')
      return null
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'
    const tz = data.timezone || 'Asia/Kolkata'

    // Parse time strings to build ISO datetime
    const startDateTime = this.buildDateTime(data.meetingDate, data.meetingTime, tz)
    const endDateTime = this.buildDateTime(data.meetingDate, data.meetingEndTime, tz)

    try {
      const event = await calendar.events.insert({
        calendarId,
        conferenceDataVersion: 1,
        requestBody: {
          summary: data.summary || 'HireGenAI Meeting',
          description: data.description,
          start: {
            dateTime: startDateTime,
            timeZone: tz,
          },
          end: {
            dateTime: endDateTime,
            timeZone: tz,
          },
          attendees: [
            { email: data.attendeeEmail, displayName: data.attendeeName },
          ],
          conferenceData: {
            createRequest: {
              requestId: `hiregenai-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 30 },
              { method: 'popup', minutes: 10 },
            ],
          },
        },
      })

      const meetLink = event.data.hangoutLink || event.data.conferenceData?.entryPoints?.[0]?.uri || null

      console.log('✅ [GOOGLE] Calendar event created:', event.data.id, 'Meet link:', meetLink)

      return {
        eventId: event.data.id || '',
        meetLink,
      }
    } catch (error: any) {
      console.error('❌ [GOOGLE] Failed to create calendar event:', error.message)
      return null
    }
  }

  /**
   * Build an ISO datetime string from date + time string
   * e.g. "2026-03-15" + "9:00am" → "2026-03-15T09:00:00"
   */
  private static buildDateTime(dateStr: string, timeStr: string, _timezone: string): string {
    const match = timeStr.match(/(\d+):(\d+)(am|pm)/i)
    if (!match) {
      // Fallback: just append T00:00:00
      return `${dateStr}T00:00:00`
    }

    let hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    const period = match[3].toLowerCase()

    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0

    const hh = String(hours).padStart(2, '0')
    const mm = String(minutes).padStart(2, '0')

    return `${dateStr}T${hh}:${mm}:00`
  }
}
