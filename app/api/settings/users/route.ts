import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { sendMail } from "@/lib/smtp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET - Fetch users for a company
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 })
    }

    console.log("👥 [USERS] Fetching users for company:", companyId)

    // Fetch users with their roles using existing schema
    const usersQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.status,
        u.created_at,
        ur.role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.company_id = $1::uuid
      ORDER BY u.created_at DESC
    `
    const users = await DatabaseService.query(usersQuery, [companyId]) as any[]

    console.log("👥 [USERS] Found", users.length, "users")

    // Map to UI format
    const mappedUsers = users.map(user => ({
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role || 'recruiter',
      status: user.status || 'active',
      addedDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : ''
    }))

    return NextResponse.json({ users: mappedUsers })
  } catch (error: any) {
    console.error("❌ [USERS] Error fetching users:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

// POST - Add new user to company
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, role, companyId, adminUserId } = body

    // Validate required fields
    if (!name || !email || !role || !companyId) {
      return NextResponse.json(
        { error: "Name, email, role, and company ID are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    console.log("👥 [USERS] Adding new user:", { name, email, role, companyId })

    // Check if user with this email already exists globally
    const existingUserQuery = `
      SELECT id, email, company_id FROM users WHERE email = $1 LIMIT 1
    `
    const existingUsers = await DatabaseService.query(existingUserQuery, [email.toLowerCase()]) as any[]

    if (existingUsers.length > 0) {
      console.log("⚠️ [USERS] User with email already exists:", email)
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    // Get company name for email
    const companyQuery = `SELECT name FROM companies WHERE id = $1::uuid LIMIT 1`
    const companyResult = await DatabaseService.query(companyQuery, [companyId]) as any[]
    const companyName = companyResult[0]?.name || 'the platform'

    // Create new user using existing schema pattern
    const insertUserQuery = `
      INSERT INTO users (
        company_id,
        email,
        full_name,
        status,
        created_at,
        updated_at
      )
      VALUES ($1::uuid, $2, $3, 'active', NOW(), NOW())
      RETURNING id, email, full_name, status, created_at
    `
    const newUserResult = await DatabaseService.query(insertUserQuery, [
      companyId,
      email.toLowerCase(),
      name
    ]) as any[]

    if (newUserResult.length === 0) {
      throw new Error("Failed to create user")
    }

    const newUser = newUserResult[0]
    console.log("✅ [USERS] User created:", newUser.id)

    // Assign role to user using existing schema pattern
    // First verify if adminUserId exists in database (mock auth IDs may not exist)
    let validAdminId: string | null = null
    if (adminUserId) {
      try {
        const adminCheck = await DatabaseService.query(
          `SELECT id FROM users WHERE id = $1::uuid LIMIT 1`,
          [adminUserId]
        ) as any[]
        if (adminCheck.length > 0) {
          validAdminId = adminUserId
        } else {
          console.log("⚠️ [USERS] Admin user ID not found in database, skipping granted_by")
        }
      } catch (e) {
        console.log("⚠️ [USERS] Invalid admin user ID format, skipping granted_by")
      }
    }

    // Insert role with or without granted_by based on validation
    let insertRoleQuery: string
    let roleParams: any[]
    
    if (validAdminId) {
      insertRoleQuery = `
        INSERT INTO user_roles (user_id, role, granted_at, granted_by)
        VALUES ($1::uuid, $2, NOW(), $3::uuid)
        ON CONFLICT (user_id, role) DO NOTHING
        RETURNING id
      `
      roleParams = [newUser.id, role, validAdminId]
    } else {
      insertRoleQuery = `
        INSERT INTO user_roles (user_id, role, granted_at)
        VALUES ($1::uuid, $2, NOW())
        ON CONFLICT (user_id, role) DO NOTHING
        RETURNING id
      `
      roleParams = [newUser.id, role]
    }
    
    const roleResult = await DatabaseService.query(insertRoleQuery, roleParams) as any[]
    console.log("✅ [USERS] Role assigned:", role, "Result:", roleResult)

    // Create email identity for the user
    try {
      const insertIdentityQuery = `
        INSERT INTO email_identities (principal_type, principal_id, email, is_verified, created_at)
        VALUES ('user', $1::uuid, $2, false, NOW())
        ON CONFLICT (email) DO NOTHING
      `
      await DatabaseService.query(insertIdentityQuery, [newUser.id, email.toLowerCase()])
      console.log("✅ [USERS] Email identity created")
    } catch (e) {
      console.log("⚠️ [USERS] Could not create email identity (non-critical):", e)
    }

    // Send notification email to new user
    try {
      const loginUrl = process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/login`
        : 'http://localhost:3000/login'

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Hire<span style="color: #a7f3d0;">GenAI</span></h1>
                      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">AI-Powered Recruitment Platform</p>
                    </td>
                  </tr>
                  
                  <!-- Main Content -->
                  <tr>
                    <td style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                      <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${name}! 👋</h2>
                      
                      <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 25px 0;">
                        You have been added to <strong>${companyName}</strong> on HireGenAI.
                      </p>
                      
                      <!-- Role Box -->
                      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">🎯 Your Account Details</h3>
                        <table style="width: 100%;">
                          <tr>
                            <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Role:</td>
                            <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 600; text-transform: capitalize;">${role}</td>
                          </tr>
                          <tr>
                            <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Email:</td>
                            <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${email}</td>
                          </tr>
                          <tr>
                            <td style="color: #6b7280; font-size: 14px; padding: 5px 0;">Company:</td>
                            <td style="color: #1f2937; font-size: 14px; padding: 5px 0; font-weight: 500;">${companyName}</td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Login Button -->
                      <div style="text-align: center; margin: 35px 0;">
                        <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">Login to HireGenAI</a>
                      </div>
                      
                      <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                        Or copy this link: <a href="${loginUrl}" style="color: #10b981;">${loginUrl}</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      const text = `
Hello ${name}!

You have been added to ${companyName} on HireGenAI.

Your Account Details:
- Role: ${role}
- Email: ${email}
- Company: ${companyName}

You can login here: ${loginUrl}

---
© ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
      `

      await sendMail({
        to: email,
        subject: `You have been added to ${companyName} - HireGenAI`,
        html,
        text,
        from: 'HireGenAI <no-reply@hire-genai.com>',
      })

      console.log("✅ [USERS] Notification email sent to:", email)
    } catch (emailError: any) {
      console.error("⚠️ [USERS] Failed to send notification email:", emailError.message)
      // Don't fail the request if email fails - user is already created
    }

    // Return created user
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        role: role,
        status: newUser.status,
        addedDate: new Date(newUser.created_at).toISOString().split('T')[0]
      },
      message: `User ${name} has been added successfully. A login email has been sent to ${email}.`
    })

  } catch (error: any) {
    console.error("❌ [USERS] Error adding user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add user" },
      { status: 500 }
    )
  }
}

// DELETE - Remove user from company
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log("🗑️ [USERS] Deleting user:", userId)

    // Get user info before deletion for response message
    const userQuery = `SELECT full_name, email FROM users WHERE id = $1::uuid LIMIT 1`
    const userResult = await DatabaseService.query(userQuery, [userId]) as any[]

    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userName = userResult[0].full_name

    // Delete user_roles first (cascade should handle it, but be explicit)
    await DatabaseService.query(
      `DELETE FROM user_roles WHERE user_id = $1::uuid`,
      [userId]
    )

    // Delete the user (CASCADE will handle related records)
    await DatabaseService.query(
      `DELETE FROM users WHERE id = $1::uuid`,
      [userId]
    )

    console.log("✅ [USERS] User deleted:", userId)

    return NextResponse.json({
      success: true,
      message: `${userName} has been removed from the team.`
    })

  } catch (error: any) {
    console.error("❌ [USERS] Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    )
  }
}
