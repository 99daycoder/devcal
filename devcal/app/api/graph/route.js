// ============================================
// GRAPH API ROUTES
// ============================================
// Exposes Neo4j graph features: dependencies,
// impact analysis, and skill relationships

import { NextResponse } from 'next/server'

// Import Neo4j with fallback
let neo4j = null
try {
  neo4j = await import('../../../lib/neo4j.js')
} catch (e) {
  console.log('Neo4j module not loaded')
}

// --------------------------------------------
// GET /api/graph
// Returns graph data based on query type
// --------------------------------------------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const taskId = searchParams.get('taskId')
    const fileId = searchParams.get('fileId')
    const skill = searchParams.get('skill')

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    let data = {}

    switch (type) {
      case 'blocked':
        // Get tasks blocked by a specific task
        data = demoMode
          ? createMockBlockedTasks(taskId)
          : await neo4j.getBlockedTasks(taskId)
        break

      case 'critical-path':
        // Get the critical path through tasks
        data = demoMode
          ? createMockCriticalPath()
          : await neo4j.getCriticalPath()
        break

      case 'file-impact':
        // Get impact of changing a file
        data = demoMode
          ? createMockFileImpact(fileId)
          : await neo4j.getFileImpact(fileId)
        break

      case 'knowledge-gaps':
        // Find skills that need improvement
        data = demoMode
          ? createMockKnowledgeGaps()
          : await neo4j.findKnowledgeGaps()
        break

      case 'skill-path':
        // Get prerequisites for a skill
        data = demoMode
          ? createMockSkillPath(skill)
          : await neo4j.getSkillPath(skill)
        break

      case 'dependencies':
        // Get task dependencies
        data = demoMode
          ? createMockDependencies(taskId)
          : await neo4j.getTaskDependencies(taskId)
        break

      case 'overview':
      default:
        // Get graph overview stats
        data = demoMode
          ? createMockGraphOverview()
          : await neo4j.getGraphOverview?.() || createMockGraphOverview()
        break
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      isDemo: demoMode
    })
  } catch (error) {
    console.error('Error fetching graph data:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/graph
// Create or update graph relationships
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      return NextResponse.json({
        success: true,
        message: `Graph ${action} completed (demo mode)`,
        isDemo: true
      })
    }

    let result = {}

    switch (action) {
      case 'link-skill':
        // Link a task to a skill
        result = await neo4j.linkTaskToSkill?.(params.taskId, params.skill, params.level)
        break

      case 'add-dependency':
        // Add task dependency
        result = await neo4j.addTaskDependency?.(params.taskId, params.dependsOn)
        break

      case 'link-file':
        // Link a commit to files
        result = await neo4j.linkCommitToFiles?.(params.commitHash, params.files)
        break

      case 'track-skill':
        // Track skill demonstration
        result = await neo4j.trackSkillDemonstration?.(params.skill, params.level, params.commitHash)
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      result
    })
  } catch (error) {
    console.error('Error updating graph:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// ============================================
// MOCK DATA GENERATORS FOR DEMO MODE
// ============================================

function createMockBlockedTasks(taskId) {
  return {
    blockedBy: taskId,
    blockedTasks: [
      {
        id: 'blocked_1',
        name: 'Deploy to production',
        status: 'pending',
        reason: 'Waiting for tests to pass'
      },
      {
        id: 'blocked_2',
        name: 'User acceptance testing',
        status: 'pending',
        reason: 'Waiting for deployment'
      }
    ],
    chainLength: 2,
    estimatedDelay: '4 hours'
  }
}

function createMockCriticalPath() {
  return {
    path: [
      { id: 'task_1', name: 'Set up project', duration: 2, status: 'completed' },
      { id: 'task_2', name: 'Build API endpoints', duration: 4, status: 'completed' },
      { id: 'task_3', name: 'Create frontend', duration: 3, status: 'in_progress' },
      { id: 'task_4', name: 'Write tests', duration: 2, status: 'pending' },
      { id: 'task_5', name: 'Deploy', duration: 1, status: 'pending' }
    ],
    totalDuration: 12,
    completedDuration: 6,
    remainingDuration: 6,
    bottlenecks: ['Write tests - requires API and frontend completion']
  }
}

function createMockFileImpact(fileId) {
  const fileName = fileId || 'src/lib/api.js'
  return {
    file: fileName,
    directImpact: {
      tasksAffected: 3,
      commitsInvolved: 8
    },
    dependentFiles: [
      { file: 'src/components/TaskList.js', importType: 'direct' },
      { file: 'src/pages/index.js', importType: 'transitive' },
      { file: 'src/hooks/useTasks.js', importType: 'direct' }
    ],
    riskLevel: 'medium',
    recommendation: 'Changes to this file affect 3 other modules. Consider writing tests first.'
  }
}

function createMockKnowledgeGaps() {
  return {
    gaps: [
      {
        skill: 'Testing',
        currentLevel: 35,
        requiredLevel: 70,
        gap: 35,
        relatedTasks: ['Write unit tests', 'Add integration tests'],
        resources: [
          { type: 'documentation', title: 'Jest Getting Started', url: 'https://jestjs.io' },
          { type: 'tutorial', title: 'Testing React Apps', url: 'https://testing-library.com' }
        ]
      },
      {
        skill: 'TypeScript Advanced',
        currentLevel: 40,
        requiredLevel: 60,
        gap: 20,
        relatedTasks: ['Refactor to TypeScript', 'Add type definitions'],
        resources: [
          { type: 'documentation', title: 'TypeScript Handbook', url: 'https://typescriptlang.org' }
        ]
      },
      {
        skill: 'Neo4j/Cypher',
        currentLevel: 25,
        requiredLevel: 50,
        gap: 25,
        relatedTasks: ['Optimize graph queries', 'Add new relationships'],
        resources: [
          { type: 'documentation', title: 'Neo4j Cypher Manual', url: 'https://neo4j.com/docs/cypher-manual' }
        ]
      }
    ],
    prioritizedLearning: ['Testing', 'Neo4j/Cypher', 'TypeScript Advanced'],
    estimatedImprovementTime: '2-3 weeks focused learning'
  }
}

function createMockSkillPath(skill) {
  const skillName = skill || 'React'
  const paths = {
    'React': {
      skill: 'React',
      currentLevel: 65,
      prerequisites: [
        { skill: 'JavaScript', level: 80, status: 'completed' },
        { skill: 'HTML/CSS', level: 75, status: 'completed' }
      ],
      unlocks: [
        { skill: 'Next.js', requiredLevel: 70, currentProgress: 93 },
        { skill: 'React Native', requiredLevel: 75, currentProgress: 87 }
      ],
      learningPath: [
        { stage: 1, topic: 'Components & Props', status: 'completed' },
        { stage: 2, topic: 'State & Hooks', status: 'completed' },
        { stage: 3, topic: 'Context & Reducers', status: 'in_progress' },
        { stage: 4, topic: 'Performance Optimization', status: 'pending' },
        { stage: 5, topic: 'Advanced Patterns', status: 'pending' }
      ]
    },
    'default': {
      skill: skillName,
      currentLevel: 50,
      prerequisites: [],
      unlocks: [],
      learningPath: []
    }
  }
  return paths[skillName] || paths['default']
}

function createMockDependencies(taskId) {
  return {
    task: taskId || 'task_main',
    dependsOn: [
      { id: 'dep_1', name: 'Set up database', status: 'completed' },
      { id: 'dep_2', name: 'Create API routes', status: 'completed' }
    ],
    blockedBy: [],
    blocks: [
      { id: 'blocked_1', name: 'Write integration tests', status: 'pending' },
      { id: 'blocked_2', name: 'Deploy to staging', status: 'pending' }
    ],
    canStart: true,
    allDependenciesMet: true
  }
}

function createMockGraphOverview() {
  return {
    nodes: {
      tasks: 45,
      commits: 156,
      files: 89,
      skills: 12,
      bugs: 8
    },
    relationships: {
      dependencies: 23,
      skillLinks: 67,
      fileImports: 134,
      commitModifications: 312
    },
    insights: [
      { type: 'info', message: 'Your graph has 45 tasks connected through 23 dependencies' },
      { type: 'tip', message: 'React is your most demonstrated skill with 67 related commits' },
      { type: 'warning', message: 'Testing has the largest knowledge gap' }
    ],
    healthScore: 78,
    lastUpdated: new Date().toISOString()
  }
}
