// ============================================
// CHECK VIDEO GENERATION STATUS
// ============================================
// Run: node scripts/check-video-status.js <task_id>

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
const taskId = process.argv[2]

if (!taskId) {
  console.log('Usage: node scripts/check-video-status.js <task_id>')
  process.exit(1)
}

console.log('============================================')
console.log('CHECK VIDEO STATUS')
console.log('============================================')
console.log('')
console.log('Task ID:', taskId)
console.log('Region:', region)
console.log('')

async function checkStatus() {
  const endpoint = `${DASHSCOPE_ENDPOINTS[region]}/tasks/${taskId}`

  console.log('Checking:', endpoint)
  console.log('')

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    })

    const data = await response.json()
    console.log('Response:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')

    if (data.output?.task_status === 'SUCCEEDED') {
      console.log('VIDEO READY!')
      console.log('Download URL:', data.output.video_url)
    } else if (data.output?.task_status === 'FAILED') {
      console.log('VIDEO FAILED')
      console.log('Error:', data.output.message)
    } else if (data.output?.task_status === 'PENDING' || data.output?.task_status === 'RUNNING') {
      console.log('Still processing... Check again in a minute.')
    }
  } catch (error) {
    console.error('Request failed:', error.message)
  }
}

checkStatus()
