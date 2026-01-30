// ============================================
// TASKS API ROUTES
// ============================================
// Handles CRUD operations for calendar tasks
// Stores tasks in Neo4j database

import { NextResponse } from 'next/server'

// Import Neo4j functions (with fallback for demo mode)
let neo4j = null
try {
  neo4j = await import('../../../lib/neo4j.js')
} catch (e) {
  console.log('Neo4j module not loaded, using mock data')
}

// In-memory storage for demo mode (when Neo4j is not available)
// Pre-populated with demo data showing stale tasks (for impressive demo)
let mockTasks = [
  {
    id: 'demo_1',
    name: 'Set up Next.js project',
    description: 'Initialize project with TypeScript and Tailwind',
    startTime: getTodayAt(9, 0),
    endTime: getTodayAt(10, 0),
    status: 'completed',
    lastActivity: getHoursAgo(8),
    keywords: ['nextjs', 'setup', 'typescript', 'tailwind']
  },
  {
    id: 'demo_2',
    name: 'Build authentication module',
    description: 'Implement user login and registration',
    startTime: getTodayAt(10, 0),
    endTime: getTodayAt(12, 0),
    status: 'completed',
    lastActivity: getHoursAgo(6),
    keywords: ['authentication', 'login', 'registration', 'user']
  },
  {
    id: 'demo_3',
    name: 'Design Neo4j graph schema',
    description: 'Create schema for tasks, skills, and dependencies',
    startTime: getTodayAt(13, 0),
    endTime: getTodayAt(14, 0),
    status: 'completed',
    lastActivity: getHoursAgo(5),
    keywords: ['database', 'schema', 'neo4j', 'graph']
  },
  {
    id: 'demo_4',
    name: 'Build API endpoints',
    description: 'Create CRUD routes for tasks and commits',
    startTime: getTodayAt(14, 0),
    endTime: getTodayAt(16, 0),
    status: 'in_progress',
    lastActivity: getHoursAgo(4),
    isStale: true,
    keywords: ['api', 'routes', 'crud', 'endpoints']
  },
  {
    id: 'demo_5',
    name: 'Create TodoList component',
    description: 'Build React component to display tasks',
    startTime: getTodayAt(16, 0),
    endTime: getTodayAt(17, 0),
    status: 'pending',
    isStale: true,
    keywords: ['react', 'component', 'frontend', 'ui']
  },
  {
    id: 'demo_6',
    name: 'Write unit tests',
    description: 'Add tests for auth and API modules',
    startTime: getTodayAt(17, 0),
    endTime: getTodayAt(18, 0),
    status: 'pending',
    isStale: true,
    keywords: ['tests', 'unit', 'jest', 'testing']
  },
  {
    id: 'demo_7',
    name: 'Deploy to production',
    description: 'Deploy app to Vercel',
    startTime: getTodayAt(18, 0),
    endTime: getTodayAt(19, 0),
    status: 'pending',
    keywords: ['deploy', 'vercel', 'production']
  }
]

// Helper to get timestamp hours ago
function getHoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

// Helper to get today's date at specific time
function getTodayAt(hours, minutes) {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

// --------------------------------------------
// GET /api/tasks
// Returns all tasks or tasks for a specific date
// --------------------------------------------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      // Return mock tasks
      let tasks = mockTasks

      if (date) {
        tasks = tasks.filter(task => {
          const taskDate = task.startTime.split('T')[0]
          return taskDate === date
        })
      }

      return NextResponse.json({
        success: true,
        tasks: tasks,
        isDemo: true
      })
    }

    // Use Neo4j
    let tasks
    if (date) {
      tasks = await neo4j.getTasksByDate(date)
    } else {
      tasks = await neo4j.getAllTasks()
    }

    return NextResponse.json({
      success: true,
      tasks: tasks
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/tasks
// Creates a new task
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, startTime, endTime' },
        { status: 400 }
      )
    }

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      // Add to mock tasks
      const newTask = {
        id: 'task_' + Date.now(),
        name: body.name,
        description: body.description || '',
        startTime: body.startTime,
        endTime: body.endTime,
        status: body.status || 'pending',
        keywords: extractKeywords(body.name + ' ' + (body.description || '')),
        createdAt: new Date().toISOString()
      }

      mockTasks.push(newTask)

      return NextResponse.json({
        success: true,
        task: newTask,
        isDemo: true
      })
    }

    // Use Neo4j
    const task = await neo4j.createTask({
      id: body.id || 'task_' + Date.now(),
      name: body.name,
      description: body.description || '',
      startTime: body.startTime,
      endTime: body.endTime
    })

    return NextResponse.json({
      success: true,
      task: task
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// PUT /api/tasks
// Updates an existing task
// --------------------------------------------
export async function PUT(request) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Missing task id' },
        { status: 400 }
      )
    }

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      // Update mock task
      const index = mockTasks.findIndex(t => t.id === body.id)
      if (index === -1) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }

      mockTasks[index] = {
        ...mockTasks[index],
        ...body,
        updatedAt: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        task: mockTasks[index],
        isDemo: true
      })
    }

    // Use Neo4j
    if (body.status) {
      const task = await neo4j.updateTaskStatus(body.id, body.status)
      return NextResponse.json({
        success: true,
        task: task
      })
    }

    return NextResponse.json(
      { success: false, error: 'No update fields provided' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// DELETE /api/tasks
// Deletes a task
// --------------------------------------------
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'Missing task id' },
        { status: 400 }
      )
    }

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      // Remove from mock tasks
      const index = mockTasks.findIndex(t => t.id === taskId)
      if (index === -1) {
        return NextResponse.json(
          { success: false, error: 'Task not found' },
          { status: 404 }
        )
      }

      mockTasks.splice(index, 1)

      return NextResponse.json({
        success: true,
        deleted: true,
        isDemo: true
      })
    }

    // Use Neo4j
    const deleted = await neo4j.deleteTask(taskId)

    return NextResponse.json({
      success: true,
      deleted: deleted
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// Helper function to extract keywords
// --------------------------------------------
function extractKeywords(text) {
  if (!text) return []

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'this', 'that', 'these', 'those'
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
}
