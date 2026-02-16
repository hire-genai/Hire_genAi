// OpenAI Service Account creation service

export async function createServiceAccount(projectId: string): Promise<{ id: string; apiKey: string } | null> {
  const adminKey = process.env.OPENAI_ADMIN_KEY
  
  if (!adminKey || !projectId) {
    console.log('OPENAI_ADMIN_KEY or projectId not configured, skipping service account creation')
    return null
  }

  try {
    // Create service account via OpenAI Admin API
    // API endpoint: https://api.openai.com/v1/organization/projects/{projectId}/service_accounts
    const response = await fetch(`https://api.openai.com/v1/organization/projects/${projectId}/service_accounts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'HireGenAI Service Account',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI service account creation failed:', error)
      return null
    }

    const serviceAccount = await response.json()
    console.log(`✅ Created OpenAI service account: ${serviceAccount.id} for project: ${projectId}`)
    
    // api_key is an object with { id, object, created_at, name, value }
    // We need the actual key string which is in the 'value' property
    const apiKeyValue = serviceAccount.api_key?.value || null
    
    if (!apiKeyValue) {
      console.error('OpenAI service account created but no API key value returned')
      return null
    }
    
    return {
      id: serviceAccount.id,
      apiKey: apiKeyValue,
    }
  } catch (error: any) {
    console.error('Failed to create OpenAI service account:', error.message)
    return null
  }
}
