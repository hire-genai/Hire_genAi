import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET - Fetch user profile by email
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("👤 [PROFILE] Fetching user profile for:", email)

    // Fetch user with role using existing schema
    const userQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.status,
        u.created_at,
        ur.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.email = $1
      LIMIT 1
    `
    const users = await DatabaseService.query(userQuery, [email.toLowerCase()]) as any[]

    if (users.length === 0) {
      console.log("⚠️ [PROFILE] User not found:", email)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]
    console.log("✅ [PROFILE] Found user with role:", user.role || "no role")

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role || "recruiter", // Default to recruiter if no role found
        status: user.status || "active"
      }
    })
  } catch (error: any) {
    console.error("❌ [PROFILE] Error fetching user profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user profile" },
      { status: 500 }
    )
  }
}
