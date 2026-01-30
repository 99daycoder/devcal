// ============================================
// TEST ALIBABA WAN VIDEO API
// ============================================
// Run: node scripts/test-wan-api.js

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const DASHSCOPE_ENDPOINTS = {
  singapore: 'https://dashscope-intl.aliyuncs.com/api/v1',
  beijing: 'https://dashscope.aliyuncs.com/api/v1',
  virginia: 'https://dashscope-us.aliyuncs.com/api/v1',
}

const region = process.env.DASHSCOPE_REGION || 'singapore'
const apiKey = process.env.DASHSCOPE_API_KEY || process.env.WAN_API_KEY

console.log('============================================')
console.log('ALIBABA WAN VIDEO API TEST')
console.log('============================================')
console.log('')
console.log('Configuration:')
console.log('  Region:', region)
console.log('  Endpoint:', DASHSCOPE_ENDPOINTS[region])
console.log('  API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET')
console.log('')

if (!apiKey) {
  console.error('ERROR: No API key found!')
  console.log('Set DASHSCOPE_API_KEY in your .env.local file')
  process.exit(1)
}

// Simple test prompt
const testPrompt = 'A futuristic holographic display showing blue glowing data visualizations in a dark room'

const requestBody = {
  model: 'wan2.1-t2v-turbo',
  input: {
    prompt: testPrompt,
    negative_prompt: 'blurry, low quality, distorted',
  },
  parameters: {
    size: '1280*720',
    duration: 5,
    prompt_extend: true,
  }
}

console.log('Request:')
console.log('  Model:', requestBody.model)
console.log('  Prompt:', testPrompt)
console.log('  Size:', requestBody.parameters.size)
console.log('  Duration:', requestBody.parameters.duration, 'seconds')
console.log('')

async function testVideoGeneration() {
  const endpoint = `${DASHSCOPE_ENDPOINTS[region]}/services/aigc/video-generation/video-synthesis`

  console.log('Sending request to:', endpoint)
  console.log('')

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response Status:', response.status, response.statusText)

    const data = await response.json()
    console.log('')
    console.log('Response Body:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    if (data.output?.task_id) {
      console.log('SUCCESS! Task ID:', data.output.task_id)
      console.log('')
      console.log('To check status, run:')
      console.log(`  node scripts/check-video-status.js ${data.output.task_id}`)
      return data.output.task_id
    } else if (data.code) {
      console.log('API ERROR:')
      console.log('  Code:', data.code)
      console.log('  Message:', data.message)

      if (data.code === 'InvalidApiKey') {
        console.log('')
        console.log('Your API key is invalid. Get a new one from:')
        console.log('  https://dashscope.console.aliyun.com/')
      }
    } else {
      console.log('Unexpected response format')
    }
  } catch (error) {
    console.error('Request failed:', error.message)
  }
}

testVideoGeneration()
