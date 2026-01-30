// ============================================
// DIRECT VIDEO GENERATION API
// ============================================
// Simple API to test Alibaba WAN video generation
// with custom prompts

import { NextResponse } from 'next/server'

const DASHSCOPE_ENDPOINTS = {
  singapore: 'https://dashscope-intl.aliyuncs.com/api/v1',
  beijing: 'https://dashscope.aliyuncs.com/api/v1',
  virginia: 'https://dashscope-us.aliyuncs.com/api/v1',
}

const region = process.env.DASHSCOPE_REGION || 'singapore'
const baseUrl = DASHSCOPE_ENDPOINTS[region] || DASHSCOPE_ENDPOINTS.singapore

// --------------------------------------------
// GET /api/generate-video?taskId=xxx
// Check video generation status
// --------------------------------------------
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json(
      { success: false, error: 'taskId required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.WAN_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    const endpoint = `${baseUrl}/tasks/${taskId}`
    console.log('Checking status:', endpoint)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    })

    const data = await response.json()
    console.log('Status response:', JSON.stringify(data, null, 2))

    if (data.output?.task_status === 'SUCCEEDED') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: data.output.video_url,
        taskId: taskId,
        apiResponse: data
      })
    } else if (data.output?.task_status === 'FAILED') {
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: data.output.message || 'Video generation failed',
        taskId: taskId,
        apiResponse: data
      })
    } else {
      return NextResponse.json({
        success: true,
        status: 'processing',
        taskStatus: data.output?.task_status,
        taskId: taskId,
        apiResponse: data
      })
    }
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/generate-video
// Generate a video from a text prompt
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'prompt required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.WAN_API_KEY

    console.log('============================================')
    console.log('VIDEO GENERATION REQUEST')
    console.log('============================================')
    console.log('Region:', region)
    console.log('Base URL:', baseUrl)
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET')
    console.log('Prompt:', prompt)
    console.log('')

    if (!apiKey || apiKey === 'your_dashscope_api_key_here') {
      return NextResponse.json({
        success: false,
        error: 'DASHSCOPE_API_KEY not configured in .env.local'
      }, { status: 500 })
    }

    const requestBody = {
      model: 'wan2.1-t2v-turbo',
      input: {
        prompt: prompt,
        negative_prompt: 'blurry, low quality, distorted, amateur, cartoon, anime, ugly, deformed',
      },
      parameters: {
        size: '1280*720',
        duration: 5,
        prompt_extend: true,
      }
    }

    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    const endpoint = `${baseUrl}/services/aigc/video-generation/video-synthesis`
    console.log('Endpoint:', endpoint)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status, response.statusText)

    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))

    if (data.output?.task_id) {
      console.log('SUCCESS - Task ID:', data.output.task_id)
      return NextResponse.json({
        success: true,
        status: 'processing',
        taskId: data.output.task_id,
        message: 'Video generation started. This may take 1-5 minutes.',
        apiResponse: data
      })
    } else if (data.code) {
      console.log('API Error:', data.code, data.message)
      return NextResponse.json({
        success: false,
        error: `${data.code}: ${data.message}`,
        apiResponse: data
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unexpected API response',
        apiResponse: data
      })
    }
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
