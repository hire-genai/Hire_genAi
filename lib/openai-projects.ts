// OpenAI Project creation service

export async function createOpenAIProject(companyName: string): Promise<{ id: string; name: string } | null> {
  const adminKey = process.env.OPENAI_ADMIN_KEY
  
  if (!adminKey) {
    console.log('OPENAI_ADMIN_KEY not configured, skipping project creation')
    return null
  }

  try {
    // Create project via OpenAI Admin API
    // API endpoint: https://api.openai.com/v1/organization/projects
    const response = await fetch('https://api.openai.com/v1/organization/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${companyName} - HireGenAI`,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI project creation failed:', error)
      return null
    }

    const project = await response.json()
    console.log(`✅ Created OpenAI project: ${project.id} for ${companyName}`)
    
    return {
      id: project.id,
      name: project.name,
    }
  } catch (error: any) {
    console.error('Failed to create OpenAI project:', error.message)
    return null
  }
}
