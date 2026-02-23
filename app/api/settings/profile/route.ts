import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET - Fetch user profile data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const email = searchParams.get("email")

    if (!userId && !email) {
      return NextResponse.json({ error: "User ID or email is required" }, { status: 400 })
    }

    console.log("📋 [SETTINGS] Fetching profile data for:", { userId, email })

    let query: string
    let params: string[]

    // Try to find by email first (more reliable with mock auth), then by userId
    if (email) {
      query = `
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.status,
          u.job_title,
          ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.email = $1
        LIMIT 1
      `
      params = [email.toLowerCase()]
    } else {
      query = `
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.status,
          u.job_title,
          ur.role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = $1::uuid
        LIMIT 1
      `
      params = [userId!]
    }

    const result = await DatabaseService.query(query, params) as any[]

    if (!result || result.length === 0) {
      console.log("📋 [SETTINGS] User not found in database, returning empty profile")
      // Return empty profile instead of 404 - frontend will use auth context data
      return NextResponse.json({ 
        user: null,
        message: "User not found in database" 
      })
    }

    console.log("📋 [SETTINGS] Found user:", result[0].email)
    return NextResponse.json({ user: result[0] })
  } catch (error: any) {
    console.error("❌ [SETTINGS] Error fetching profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile data" },
      { status: 500 }
    )
  }
}

// PUT - Update user profile data
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, ...updateData } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("📋 [SETTINGS] Updating profile for user:", userId)
    console.log("📋 [SETTINGS] Update data:", updateData)

    const updatedUser = await DatabaseService.updateUserProfile(userId, {
      full_name: updateData.full_name,
    })

    return NextResponse.json({ user: updatedUser, success: true })
  } catch (error: any) {
    console.error("❌ [SETTINGS] Error updating profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update profile data" },
      { status: 500 }
    )
  }
}
