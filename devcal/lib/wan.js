// ============================================
// ALIBABA WAN VIDEO GENERATION API
// ============================================
// J.A.R.V.I.S Style AI Assistant for DevCal
// Direct, efficient, no BS - just like Tony Stark's AI

// --------------------------------------------
// CONFIGURATION
// --------------------------------------------

// Region-specific endpoints
const DASHSCOPE_ENDPOINTS = {
  singapore: 'https://dashscope-intl.aliyuncs.com/api/v1',
  beijing: 'https://dashscope.aliyuncs.com/api/v1',
  virginia: 'https://dashscope-us.aliyuncs.com/api/v1',
}

// Get region from environment (default: singapore for international)
const region = process.env.DASHSCOPE_REGION || 'singapore'

const WAN_CONFIG = {
  // Use region-specific endpoint
  baseUrl: DASHSCOPE_ENDPOINTS[region] || DASHSCOPE_ENDPOINTS.singapore,
  // Video synthesis endpoint
  videoEndpoint: '/services/aigc/video-generation/video-synthesis',
  // Task query endpoint
  taskEndpoint: '/tasks',
  // Model to use - wan2.1-t2v-turbo is fast, wan2.6-t2v is latest
  model: 'wan2.1-t2v-turbo',
  // Alternative models: 'wan2.6-t2v', 'wan2.5-t2v-preview', 'wan2.2-t2v-plus', 'wan2.1-t2v-plus'
  region: region,
}

// --------------------------------------------
// J.A.R.V.I.S STYLE VIDEO PROMPTS
// --------------------------------------------

/**
 * Generate J.A.R.V.I.S style video prompt
 * Direct, efficient, no fluff - like Iron Man's AI
 * @param {object} analysis - Gap analysis data
 * @param {string} captainName - User's name (default: Sam)
 */
export function generateVideoPrompt(analysis, captainName = 'Sam') {
  const timeOfDay = getTimeOfDay()
  const completionRate = analysis.totalPlannedTasks > 0
    ? Math.round((analysis.completedTasks / analysis.totalPlannedTasks) * 100)
    : 0

  // Build achievement summary - J.A.R.V.I.S style (concise)
  const achievements = analysis.achievements?.slice(0, 3).map(a =>
    `${a.task}: ${a.commits} commits`
  ).join('. ') || 'None recorded'

  // Build gaps summary
  const gaps = analysis.gaps?.map(g => g.task).join(', ') || 'None'

  // Get stale task count
  const staleTasks = analysis.staleTasks || analysis.pendingTasks || 0

  // Get knowledge gaps
  const knowledgeGaps = analysis.skillGaps?.slice(0, 3).map(g => g.skill || g.area).join(', ') ||
    analysis.knowledgeGaps?.slice(0, 3).join(', ') ||
    'Testing, Documentation'

  // J.A.R.V.I.S STYLE SCRIPT - Direct, efficient, no BS
  const script = `
Good ${timeOfDay}, Captain ${captainName}.

Status report. ${analysis.totalPlannedTasks || 0} tasks scheduled. ${analysis.completedTasks || 0} completed. ${staleTasks} require attention.

${analysis.totalCommits || 0} commits logged. ${analysis.totalFilesModified || 0} files modified.

${staleTasks > 0
      ? `Alert: ${staleTasks} stale tasks detected. No activity for over 2 hours. Immediate action recommended.`
      : 'All systems nominal. No stale tasks detected.'}

Completion rate: ${completionRate} percent.

${analysis.achievements?.length > 0
      ? `Completed: ${achievements}.`
      : ''}

${analysis.gaps?.length > 0
      ? `Outstanding: ${gaps}.`
      : ''}

Monthly skill assessment. Knowledge gaps identified: ${knowledgeGaps}. Recommend focused practice in these areas.

${getJarvisRecommendation(analysis, staleTasks)}

End report. ${getJarvisSignOff(completionRate, staleTasks)}
  `.trim().replace(/\n\n+/g, '\n\n')

  // Full prompt for video generation
  const fullPrompt = {
    // Scene: Holographic AI interface like J.A.R.V.I.S
    scene: `A sleek holographic AI interface in a dark tech command center. Blue and cyan holographic displays float in the air showing code metrics, graphs, and the GitHub octocat logo, Neo4j connected nodes logo, and Alibaba Cloud logo. The atmosphere is like Tony Stark's lab - high tech, minimal, efficient.`,

    // Character: J.A.R.V.I.S style AI avatar
    character: `A sophisticated holographic AI assistant rendered in blue light. Gender-neutral, professional appearance. Speaks with calm authority and precision. No wasted words. Efficient and direct like J.A.R.V.I.S from Iron Man.`,

    // The script
    script: script,

    // Style parameters
    style: 'cinematic, sci-fi, holographic, Iron Man tech aesthetic',
    duration: 15,
    aspectRatio: '16:9',
    voiceType: 'professional, calm, slightly robotic, British accent preferred',
  }

  return fullPrompt
}

/**
 * Get time of day for greeting
 */
function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

/**
 * J.A.R.V.I.S style recommendation - direct and actionable
 */
function getJarvisRecommendation(analysis, staleTasks) {
  if (staleTasks > 0) {
    const firstStale = analysis.gaps?.[0]?.task || 'pending tasks'
    return `Priority action: Address ${firstStale}. Delay compounds technical debt.`
  }

  if (analysis.pendingTasks === 0 && analysis.completedTasks > 0) {
    return 'All objectives achieved. Recommend code review or new task allocation.'
  }

  if (analysis.gaps?.length > 0) {
    return `Next objective: ${analysis.gaps[0].task}. Shall I prepare the development environment?`
  }

  return 'Standing by for new directives, Captain.'
}

/**
 * J.A.R.V.I.S style sign-off
 */
function getJarvisSignOff(completionRate, staleTasks) {
  if (staleTasks > 0) {
    return 'Awaiting your command to resume operations.'
  }
  if (completionRate >= 80) {
    return 'Exceptional performance, Captain. As expected.'
  }
  if (completionRate >= 50) {
    return 'Satisfactory progress. Continuing to monitor.'
  }
  return 'Ready when you are, Captain.'
}

// --------------------------------------------
// VIDEO GENERATION API - Real Implementation
// --------------------------------------------

/**
 * Generate video using Alibaba WAN API
 * @param {object} promptData - The prompt data from generateVideoPrompt
 */
export async function generateVideo(promptData) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.WAN_API_KEY

  console.log('🎬 Video Generation Request')
  console.log('  Region:', WAN_CONFIG.region)
  console.log('  API Key present:', !!apiKey)
  console.log('  API Key starts with:', apiKey?.substring(0, 10) + '...')
  console.log('  Model:', WAN_CONFIG.model)
  console.log('  Endpoint:', WAN_CONFIG.baseUrl + WAN_CONFIG.videoEndpoint)

  if (!apiKey || apiKey === 'your_dashscope_api_key_here') {
    console.log('⚠️ No WAN API key configured, using demo mode')
    return generateDemoVideo(promptData)
  }

  try {
    console.log('🎬 Generating video with Alibaba WAN API...')

    // Create a concise but descriptive prompt for video generation
    const videoPrompt = `Futuristic holographic AI assistant in a dark tech command center. Blue glowing holographic displays showing code metrics and graphs. The AI speaks a developer status report in a calm, professional voice. High-tech Iron Man style aesthetic with floating data visualizations.`

    const requestBody = {
      model: WAN_CONFIG.model,
      input: {
        prompt: videoPrompt,
        negative_prompt: 'blurry, low quality, distorted, amateur, cartoon, anime, ugly, deformed',
      },
      parameters: {
        size: '1280*720',
        duration: 5,
        prompt_extend: true,
      }
    }

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${WAN_CONFIG.baseUrl}${WAN_CONFIG.videoEndpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📥 Response status:', response.status, response.statusText)

    const data = await response.json()
    console.log('📥 WAN API Response:', JSON.stringify(data, null, 2))

    if (data.output?.task_id) {
      console.log('✅ Video generation task created:', data.output.task_id)
      return {
        taskId: data.output.task_id,
        status: 'processing',
        videoUrl: null,
        script: promptData.script,
        message: 'Video is being generated. This may take 1-5 minutes.'
      }
    } else if (data.code) {
      console.error('❌ WAN API error:', data.code, data.message)
      // Return error info but still include the script
      return {
        ...generateDemoVideo(promptData),
        apiError: { code: data.code, message: data.message }
      }
    } else {
      console.log('⚠️ Unexpected response, using demo mode')
      return generateDemoVideo(promptData)
    }
  } catch (error) {
    console.error('❌ WAN API request failed:', error.message)
    return {
      ...generateDemoVideo(promptData),
      apiError: { message: error.message }
    }
  }
}

/**
 * Check video generation status
 * @param {string} taskId - Task ID from generateVideo
 */
export async function checkVideoStatus(taskId) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.WAN_API_KEY

  if (!apiKey || taskId.startsWith('demo_')) {
    return {
      status: 'completed',
      videoUrl: '/videos/demo-briefing.mp4',
      isDemo: true
    }
  }

  try {
    const response = await fetch(`${WAN_CONFIG.baseUrl}${WAN_CONFIG.taskEndpoint}/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    })

    const data = await response.json()
    console.log('Task Status:', data.output?.task_status)

    if (data.output?.task_status === 'SUCCEEDED') {
      return {
        status: 'completed',
        videoUrl: data.output.video_url
      }
    } else if (data.output?.task_status === 'FAILED') {
      return {
        status: 'failed',
        error: data.output.message || 'Video generation failed'
      }
    } else {
      return {
        status: 'processing',
        progress: data.output?.submit_time ? 50 : 10
      }
    }
  } catch (error) {
    console.error('Status check failed:', error)
    return { status: 'error', error: error.message }
  }
}

// --------------------------------------------
// DEMO MODE
// --------------------------------------------

/**
 * Generate demo video response when API is not available
 */
function generateDemoVideo(promptData) {
  console.log('🎬 Demo Mode: J.A.R.V.I.S script generated')
  console.log('📝 Script:', promptData.script)

  return {
    taskId: 'demo_' + Date.now(),
    status: 'completed',
    videoUrl: '/videos/demo-briefing.mp4',
    isDemo: true,
    script: promptData.script
  }
}

// --------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------

/**
 * Format analysis data for display
 */
export function formatAnalysisForDisplay(analysis) {
  return {
    date: analysis.date,
    summary: {
      planned: analysis.totalPlannedTasks,
      completed: analysis.completedTasks,
      pending: analysis.pendingTasks,
      commits: analysis.totalCommits,
      files: analysis.totalFilesModified,
      completionRate: analysis.totalPlannedTasks > 0
        ? Math.round((analysis.completedTasks / analysis.totalPlannedTasks) * 100)
        : 0
    },
    achievements: analysis.achievements,
    gaps: analysis.gaps,
    knowledgeGaps: analysis.skillGaps || []
  }
}

/**
 * Create placeholder video
 */
export function createPlaceholderVideo() {
  return {
    id: 'placeholder_' + Date.now(),
    url: '/videos/demo-briefing.mp4',
    isPlaceholder: true,
    message: 'Video generation requires Alibaba WAN API key.'
  }
}

export default {
  generateVideoPrompt,
  generateVideo,
  checkVideoStatus,
  formatAnalysisForDisplay,
  createPlaceholderVideo
}
