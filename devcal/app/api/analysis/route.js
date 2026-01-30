// ============================================
// ANALYSIS API ROUTES
// ============================================
// Performs gap analysis between planned tasks
// and actual commits using Neo4j

import { NextResponse } from 'next/server'
import { formatAnalysisForDisplay } from '../../../lib/wan.js'

// Import Neo4j with fallback
let neo4j = null
try {
  neo4j = await import('../../../lib/neo4j.js')
} catch (e) {
  console.log('Neo4j module not loaded')
}

// --------------------------------------------
// GET /api/analysis
// Returns gap analysis for a specific date
// --------------------------------------------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      const analysis = createMockAnalysis(date)
      return NextResponse.json({
        success: true,
        analysis: formatAnalysisForDisplay(analysis),
        raw: analysis,
        isDemo: true
      })
    }

    // Get analysis from Neo4j
    const analysis = await neo4j.analyzeGaps(date)

    return NextResponse.json({
      success: true,
      analysis: formatAnalysisForDisplay(analysis),
      raw: analysis
    })
  } catch (error) {
    console.error('Error performing analysis:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/analysis
// Triggers a full re-analysis and generates report
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()
    const date = body.date || new Date().toISOString().split('T')[0]
    const includeReport = body.includeReport !== false

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    let analysis
    if (demoMode) {
      analysis = createMockAnalysis(date)
    } else {
      // Re-link commits to tasks
      await neo4j.linkCommitsToTasks()

      // Perform analysis
      analysis = await neo4j.analyzeGaps(date)
    }

    // Generate comprehensive report if requested
    let report = null
    if (includeReport) {
      report = generateReport(analysis)
    }

    return NextResponse.json({
      success: true,
      analysis: formatAnalysisForDisplay(analysis),
      report: report,
      isDemo: demoMode
    })
  } catch (error) {
    console.error('Error generating analysis:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// Helper: Create mock analysis for demo
// --------------------------------------------
function createMockAnalysis(date) {
  return {
    date: date,
    tasks: [
      {
        task: {
          id: 'demo_1',
          name: 'Build authentication module',
          description: 'Implement user login and registration',
          startTime: `${date}T09:00:00`,
          endTime: `${date}T12:00:00`,
          status: 'completed'
        },
        commits: [
          {
            hash: 'abc123',
            message: 'Add login form component',
            timestamp: `${date}T09:30:00`,
            filesChanged: ['src/auth/LoginForm.js', 'src/auth/styles.css']
          },
          {
            hash: 'def456',
            message: 'Implement authentication service',
            timestamp: `${date}T10:15:00`,
            filesChanged: ['src/services/auth.js', 'src/api/auth.js']
          },
          {
            hash: 'ghi789',
            message: 'Add password validation',
            timestamp: `${date}T11:45:00`,
            filesChanged: ['src/utils/validation.js']
          }
        ],
        matchingCommits: [
          { hash: 'abc123', message: 'Add login form component' },
          { hash: 'def456', message: 'Implement authentication service' },
          { hash: 'ghi789', message: 'Add password validation' }
        ],
        totalCommits: 3,
        hasActivity: true,
        isCompleted: true
      },
      {
        task: {
          id: 'demo_2',
          name: 'Design database schema',
          description: 'Create Neo4j schema for tasks and commits',
          startTime: `${date}T13:00:00`,
          endTime: `${date}T15:00:00`,
          status: 'in_progress'
        },
        commits: [
          {
            hash: 'jkl012',
            message: 'Create Neo4j task schema',
            timestamp: `${date}T13:30:00`,
            filesChanged: ['schema/tasks.cypher']
          },
          {
            hash: 'mno345',
            message: 'Add database indexes',
            timestamp: `${date}T14:30:00`,
            filesChanged: ['schema/indexes.cypher', 'lib/neo4j.js']
          }
        ],
        matchingCommits: [
          { hash: 'jkl012', message: 'Create Neo4j task schema' },
          { hash: 'mno345', message: 'Add database indexes' }
        ],
        totalCommits: 2,
        hasActivity: true,
        isCompleted: true
      },
      {
        task: {
          id: 'demo_3',
          name: 'Write unit tests',
          description: 'Add tests for auth module',
          startTime: `${date}T15:30:00`,
          endTime: `${date}T17:00:00`,
          status: 'pending'
        },
        commits: [],
        matchingCommits: [],
        totalCommits: 0,
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
        files: ['src/auth/LoginForm.js', 'src/auth/styles.css', 'src/services/auth.js', 'src/api/auth.js', 'src/utils/validation.js']
      },
      {
        task: 'Design database schema',
        commits: 2,
        files: ['schema/tasks.cypher', 'schema/indexes.cypher', 'lib/neo4j.js']
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

// --------------------------------------------
// Helper: Generate comprehensive report
// --------------------------------------------
function generateReport(analysis) {
  const completionRate = analysis.totalPlannedTasks > 0
    ? Math.round((analysis.completedTasks / analysis.totalPlannedTasks) * 100)
    : 0

  return {
    summary: {
      date: analysis.date,
      totalTasks: analysis.totalPlannedTasks,
      completed: analysis.completedTasks,
      pending: analysis.pendingTasks,
      completionRate: completionRate,
      totalCommits: analysis.totalCommits,
      filesModified: analysis.totalFilesModified
    },

    performance: {
      rating: completionRate >= 80 ? 'Excellent' :
              completionRate >= 60 ? 'Good' :
              completionRate >= 40 ? 'Fair' : 'Needs Improvement',
      score: completionRate,
      trend: 'stable' // Would track over time with more data
    },

    insights: generateInsights(analysis),

    knowledgeGaps: generateKnowledgeGaps(analysis),

    recommendations: generateRecommendations(analysis),

    timeline: analysis.tasks.map(t => ({
      name: t.task.name,
      planned: {
        start: t.task.startTime,
        end: t.task.endTime
      },
      actual: t.commits.length > 0 ? {
        firstCommit: t.commits[0]?.timestamp,
        lastCommit: t.commits[t.commits.length - 1]?.timestamp,
        commitCount: t.commits.length
      } : null,
      status: t.isCompleted ? 'completed' : t.hasActivity ? 'partial' : 'not_started'
    }))
  }
}

// --------------------------------------------
// Helper: Generate insights from analysis
// --------------------------------------------
function generateInsights(analysis) {
  const insights = []

  // Productivity insight
  if (analysis.totalCommits > 10) {
    insights.push({
      type: 'positive',
      title: 'High Commit Frequency',
      description: `You made ${analysis.totalCommits} commits today, showing consistent progress.`
    })
  } else if (analysis.totalCommits < 3 && analysis.totalPlannedTasks > 0) {
    insights.push({
      type: 'attention',
      title: 'Low Commit Frequency',
      description: 'Consider committing more frequently to track progress better.'
    })
  }

  // Completion insight
  if (analysis.completedTasks === analysis.totalPlannedTasks && analysis.totalPlannedTasks > 0) {
    insights.push({
      type: 'positive',
      title: 'All Tasks Completed',
      description: 'Excellent work! You completed everything you planned.'
    })
  }

  // Gap insight
  if (analysis.gaps.length > 0) {
    insights.push({
      type: 'attention',
      title: 'Incomplete Tasks Detected',
      description: `${analysis.gaps.length} task(s) need attention: ${analysis.gaps.map(g => g.task).join(', ')}`
    })
  }

  return insights
}

// --------------------------------------------
// Helper: Generate knowledge gap analysis
// --------------------------------------------
function generateKnowledgeGaps(analysis) {
  const gaps = []

  // Check for testing gaps
  const allFiles = analysis.tasks.flatMap(t =>
    t.commits.flatMap(c => c.filesChanged || [])
  )
  const hasTests = allFiles.some(f =>
    f.includes('test') || f.includes('spec')
  )

  if (!hasTests && analysis.totalCommits > 3) {
    gaps.push({
      area: 'Testing',
      severity: 'medium',
      description: 'No test files were modified. Consider adding unit tests.',
      resources: ['Jest documentation', 'Testing best practices']
    })
  }

  // Check for documentation gaps
  const hasDocs = allFiles.some(f =>
    f.endsWith('.md') || f.includes('README')
  )

  if (!hasDocs && analysis.totalCommits > 5) {
    gaps.push({
      area: 'Documentation',
      severity: 'low',
      description: 'No documentation updates detected.',
      resources: ['README templates', 'Documentation guidelines']
    })
  }

  // Incomplete tasks indicate potential skill gaps
  analysis.gaps.forEach(gap => {
    gaps.push({
      area: gap.task,
      severity: 'high',
      description: gap.reason,
      resources: ['Break into smaller tasks', 'Review requirements']
    })
  })

  return gaps
}

// --------------------------------------------
// Helper: Generate recommendations
// --------------------------------------------
function generateRecommendations(analysis) {
  const recommendations = []

  if (analysis.pendingTasks > 0) {
    recommendations.push({
      priority: 'high',
      action: `Focus on completing: ${analysis.gaps[0]?.task || 'pending tasks'}`,
      reason: 'Unfinished tasks carry cognitive overhead'
    })
  }

  if (analysis.totalCommits < analysis.totalPlannedTasks * 2) {
    recommendations.push({
      priority: 'medium',
      action: 'Increase commit frequency',
      reason: 'More commits = better tracking + easier debugging'
    })
  }

  recommendations.push({
    priority: 'low',
    action: 'Review and update task estimates',
    reason: 'Accurate estimates improve future planning'
  })

  return recommendations
}
