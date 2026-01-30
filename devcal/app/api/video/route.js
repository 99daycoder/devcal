// ============================================
// VIDEO GENERATION API ROUTES
// ============================================
// Handles video generation using Alibaba WAN
// and retrieves video history

import { NextResponse } from 'next/server'
import { generateVideoPrompt, generateVideo, formatAnalysisForDisplay } from '../../../lib/wan.js'

// Import Neo4j functions (with fallback)
let neo4j = null
try {
  neo4j = await import('../../../lib/neo4j.js')
} catch (e) {
  console.log('Neo4j module not loaded, using mock data')
}

// In-memory storage for video history (demo mode)
let mockVideos = []

// --------------------------------------------
// GET /api/video
// Returns video history or latest video
// --------------------------------------------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const latest = searchParams.get('latest') === 'true'

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      if (latest) {
        // Return latest mock video or generate one
        if (mockVideos.length === 0) {
          // Generate a demo video
          const demoVideo = createDemoVideo()
          mockVideos.unshift(demoVideo)
        }
        return NextResponse.json({
          success: true,
          video: mockVideos[0],
          isDemo: true
        })
      }

      return NextResponse.json({
        success: true,
        videos: mockVideos,
        isDemo: true
      })
    }

    // Use Neo4j
    if (latest) {
      const video = await neo4j.getLatestVideo()
      return NextResponse.json({
        success: true,
        video: video
      })
    }

    const videos = await neo4j.getVideoHistory()
    return NextResponse.json({
      success: true,
      videos: videos
    })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/video
// Generates a new briefing video
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()
    const date = body.date || new Date().toISOString().split('T')[0]
    const captainName = process.env.CAPTAIN_NAME || 'Sam'

    // Check if using demo mode
    const videoDemoMode = process.env.VIDEO_DEMO_MODE === 'true'
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    console.log('🎬 Video Generation Request')
    console.log('  VIDEO_DEMO_MODE:', videoDemoMode)
    console.log('  DEMO_MODE:', demoMode)
    console.log('  Neo4j available:', !!neo4j)

    let analysis

    // Use mock analysis for video (simpler data structure)
    // Real Neo4j analysis can have complex datetime formats
    analysis = createMockAnalysis(date)

    // Generate video prompt
    const promptData = generateVideoPrompt(analysis, captainName)

    // Generate video (or mock in demo mode)
    const videoResult = await generateVideo(promptData)

    // Create video record
    const videoRecord = {
      id: 'video_' + Date.now(),
      url: videoResult.videoUrl || '/videos/demo-briefing.mp4',
      date: date,
      analysis: formatAnalysisForDisplay(analysis),
      prompt: promptData.script,
      script: promptData.script,
      isDemo: videoResult.isDemo || false,
      isProcessing: videoResult.status === 'processing',
      taskId: videoResult.taskId,
      apiError: videoResult.apiError || null,
      message: videoResult.message || null,
      createdAt: new Date().toISOString()
    }

    console.log('📹 Video record created:', {
      id: videoRecord.id,
      isDemo: videoRecord.isDemo,
      isProcessing: videoRecord.isProcessing,
      taskId: videoRecord.taskId,
      hasError: !!videoRecord.apiError
    })

    // Store video record
    if (demoMode) {
      mockVideos.unshift(videoRecord)
    } else {
      try {
        await neo4j.storeVideo(videoRecord)
      } catch (e) {
        console.log('Could not store video in Neo4j:', e)
      }
    }

    return NextResponse.json({
      success: true,
      video: videoRecord,
      analysis: formatAnalysisForDisplay(analysis),
      isDemo: videoRecord.isDemo,
      isProcessing: videoRecord.isProcessing,
      taskId: videoRecord.taskId,
      apiError: videoRecord.apiError
    })
  } catch (error) {
    console.error('Error generating video:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// Helper: Create demo video
// --------------------------------------------
function createDemoVideo() {
  const today = new Date().toISOString().split('T')[0]
  const analysis = createMockAnalysis(today)
  const captainName = process.env.CAPTAIN_NAME || 'Sam'

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const script = `Good ${timeOfDay}, Captain ${captainName}.

Status report. 7 tasks scheduled. 3 completed. 3 require attention.

12 commits logged. 24 files modified.

Alert: 3 stale tasks detected. No activity for over 2 hours. Immediate action recommended.

Completion rate: 43 percent.

Completed: Set up Next.js project: 4 commits. Build authentication module: 5 commits. Design Neo4j graph schema: 3 commits.

Outstanding: Build API endpoints, Create TodoList component, Write unit tests.

Monthly skill assessment. Knowledge gaps identified: Testing, Documentation, CI/CD Pipelines. Recommend focused practice in these areas.

Priority action: Address Build API endpoints. Delay compounds technical debt.

End report. Ready when you are, Captain.`

  return {
    id: 'demo_video_' + Date.now(),
    url: '/videos/demo-briefing.mp4',
    date: today,
    analysis: formatAnalysisForDisplay(analysis),
    script: script,
    isDemo: true,
    createdAt: new Date().toISOString()
  }
}

// --------------------------------------------
// Helper: Create mock analysis
// --------------------------------------------
function createMockAnalysis(date) {
  return {
    date: date,
    tasks: [
      {
        task: {
          id: 'demo_1',
          name: 'Build authentication module',
          startTime: `${date}T09:00:00`,
          endTime: `${date}T12:00:00`
        },
        commits: [
          { hash: 'abc123', message: 'Add login form', timestamp: `${date}T09:30:00` },
          { hash: 'def456', message: 'Implement auth service', timestamp: `${date}T10:15:00` },
          { hash: 'ghi789', message: 'Add password validation', timestamp: `${date}T11:45:00` }
        ],
        matchingCommits: 3,
        hasActivity: true,
        isCompleted: true
      },
      {
        task: {
          id: 'demo_2',
          name: 'Design database schema',
          startTime: `${date}T13:00:00`,
          endTime: `${date}T15:00:00`
        },
        commits: [
          { hash: 'jkl012', message: 'Create Neo4j schema', timestamp: `${date}T13:30:00` },
          { hash: 'mno345', message: 'Add indexes', timestamp: `${date}T14:30:00` }
        ],
        matchingCommits: 2,
        hasActivity: true,
        isCompleted: true
      },
      {
        task: {
          id: 'demo_3',
          name: 'Write unit tests',
          startTime: `${date}T15:30:00`,
          endTime: `${date}T17:00:00`
        },
        commits: [],
        matchingCommits: 0,
        hasActivity: false,
        isCompleted: false
      }
    ],
    totalPlannedTasks: 3,
    completedTasks: 2,
    pendingTasks: 1,
    totalCommits: 5,
    totalFilesModified: 8,
    gaps: [
      {
        task: 'Write unit tests',
        reason: 'No commits found during planned time window'
      }
    ],
    achievements: [
      {
        task: 'Build authentication module',
        commits: 3,
        files: ['src/auth/login.js', 'src/services/auth.js', 'src/utils/validation.js', 'src/components/LoginForm.js']
      },
      {
        task: 'Design database schema',
        commits: 2,
        files: ['schema/tasks.cypher', 'schema/commits.cypher', 'lib/neo4j.js', 'scripts/setup-neo4j.js']
      }
    ],
    // Stale tasks - no activity for 2+ hours
    staleTasks: 3,
    // Monthly skill gaps for J.A.R.V.I.S briefing
    skillGaps: [
      { skill: 'Testing', level: 'beginner', hoursNeeded: 10 },
      { skill: 'Documentation', level: 'intermediate', hoursNeeded: 5 },
      { skill: 'CI/CD Pipelines', level: 'beginner', hoursNeeded: 8 }
    ]
  }
}
