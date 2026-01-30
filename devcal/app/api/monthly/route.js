// ============================================
// MONTHLY PROGRESS API ROUTES
// ============================================
// Provides monthly skill tracking and progress
// data using Neo4j graph relationships

import { NextResponse } from 'next/server'

// Import Neo4j with fallback
let neo4j = null
try {
  neo4j = await import('../../../lib/neo4j.js')
} catch (e) {
  console.log('Neo4j module not loaded')
}

// --------------------------------------------
// GET /api/monthly
// Returns monthly progress and skill tracking
// --------------------------------------------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
    const months = parseInt(searchParams.get('months') || '6')

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      const data = createMockMonthlyData(month, months)
      return NextResponse.json({
        success: true,
        ...data,
        isDemo: true
      })
    }

    // Get data from Neo4j
    const monthlyProgress = await neo4j.getMonthlyProgress(months)
    const skillProgress = await neo4j.getSkillProgress?.() || []

    return NextResponse.json({
      success: true,
      monthlyProgress,
      skillProgress,
      currentMonth: month
    })
  } catch (error) {
    console.error('Error fetching monthly progress:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/monthly
// Generates monthly snapshot and calculates
// skill improvements
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()
    const month = body.month || new Date().toISOString().slice(0, 7)

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !neo4j

    if (demoMode) {
      return NextResponse.json({
        success: true,
        message: 'Monthly snapshot created (demo mode)',
        month,
        isDemo: true
      })
    }

    // Calculate and store monthly snapshot in Neo4j
    const snapshot = await neo4j.calculateMonthlySnapshot(month)

    return NextResponse.json({
      success: true,
      snapshot,
      month
    })
  } catch (error) {
    console.error('Error creating monthly snapshot:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// Helper: Create mock monthly data for demo
// --------------------------------------------
function createMockMonthlyData(currentMonth, monthCount) {
  const skills = [
    { name: 'React', category: 'frontend', icon: '⚛️' },
    { name: 'TypeScript', category: 'language', icon: '📘' },
    { name: 'Node.js', category: 'backend', icon: '🟢' },
    { name: 'Testing', category: 'quality', icon: '🧪' },
    { name: 'Neo4j', category: 'database', icon: '🔷' },
    { name: 'Git', category: 'tools', icon: '📦' },
    { name: 'API Design', category: 'architecture', icon: '🔌' },
    { name: 'CSS/Styling', category: 'frontend', icon: '🎨' }
  ]

  // Generate month labels
  const months = []
  const date = new Date(currentMonth + '-01')
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(date)
    d.setMonth(d.getMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }

  // Generate skill progress data
  const skillProgress = skills.map(skill => {
    const history = months.map((month, idx) => {
      // Simulate gradual improvement with some variation
      const baseLevel = 40 + Math.random() * 20
      const growth = idx * (3 + Math.random() * 5)
      const variation = (Math.random() - 0.5) * 10
      const level = Math.min(100, Math.max(0, baseLevel + growth + variation))

      return {
        month,
        level: Math.round(level),
        commits: Math.floor(Math.random() * 30) + 5,
        hoursSpent: Math.floor(Math.random() * 40) + 10
      }
    })

    const currentLevel = history[history.length - 1]?.level || 50
    const previousLevel = history[history.length - 2]?.level || 50
    const trend = currentLevel > previousLevel + 3 ? 'improving' :
                  currentLevel < previousLevel - 3 ? 'declining' : 'stable'

    return {
      ...skill,
      currentLevel,
      previousLevel,
      trend,
      history,
      prerequisites: getSkillPrerequisites(skill.name),
      unlocks: getSkillUnlocks(skill.name)
    }
  })

  // Generate monthly summaries
  const monthlyProgress = months.map((month, idx) => {
    const tasksCompleted = Math.floor(Math.random() * 30) + 20
    const totalTasks = tasksCompleted + Math.floor(Math.random() * 10)
    const commits = Math.floor(Math.random() * 100) + 50

    return {
      month,
      tasksCompleted,
      totalTasks,
      completionRate: Math.round((tasksCompleted / totalTasks) * 100),
      commits,
      filesChanged: commits * 2 + Math.floor(Math.random() * 50),
      hoursLogged: Math.floor(Math.random() * 80) + 40,
      topSkills: skillProgress
        .slice()
        .sort((a, b) => (b.history[idx]?.commits || 0) - (a.history[idx]?.commits || 0))
        .slice(0, 3)
        .map(s => s.name),
      achievements: generateAchievements(idx)
    }
  })

  // Knowledge gaps
  const knowledgeGaps = [
    {
      skill: 'Testing',
      gap: 'Unit test coverage below 60%',
      recommendation: 'Practice writing Jest tests for React components',
      resources: ['Jest documentation', 'React Testing Library']
    },
    {
      skill: 'TypeScript',
      gap: 'Advanced types underutilized',
      recommendation: 'Learn utility types and generics',
      resources: ['TypeScript Handbook', 'Type Challenges']
    }
  ]

  return {
    currentMonth,
    months,
    monthlyProgress,
    skillProgress,
    knowledgeGaps,
    overallTrend: 'improving',
    totalCommitsAllTime: monthlyProgress.reduce((sum, m) => sum + m.commits, 0),
    averageCompletionRate: Math.round(
      monthlyProgress.reduce((sum, m) => sum + m.completionRate, 0) / monthlyProgress.length
    )
  }
}

// Helper: Get skill prerequisites
function getSkillPrerequisites(skillName) {
  const prereqs = {
    'React': ['JavaScript', 'HTML/CSS'],
    'TypeScript': ['JavaScript'],
    'Node.js': ['JavaScript'],
    'Testing': ['JavaScript', 'React'],
    'Neo4j': ['Database basics', 'Graph theory'],
    'Git': ['Command line'],
    'API Design': ['HTTP basics', 'REST concepts'],
    'CSS/Styling': ['HTML']
  }
  return prereqs[skillName] || []
}

// Helper: Get what skills this unlocks
function getSkillUnlocks(skillName) {
  const unlocks = {
    'React': ['Next.js', 'React Native'],
    'TypeScript': ['Advanced patterns', 'Type-safe APIs'],
    'Node.js': ['Express', 'NestJS', 'Backend architecture'],
    'Testing': ['TDD', 'CI/CD', 'E2E testing'],
    'Neo4j': ['Graph algorithms', 'Knowledge graphs'],
    'Git': ['Git workflows', 'Collaboration'],
    'API Design': ['Microservices', 'GraphQL'],
    'CSS/Styling': ['Tailwind', 'CSS-in-JS', 'Animations']
  }
  return unlocks[skillName] || []
}

// Helper: Generate achievements
function generateAchievements(monthIndex) {
  const allAchievements = [
    { icon: '🏆', title: 'Task Master', description: 'Completed 50+ tasks' },
    { icon: '⚡', title: 'Speed Demon', description: '10+ tasks in one day' },
    { icon: '📚', title: 'Learner', description: 'New skill acquired' },
    { icon: '🔥', title: 'Streak', description: '7-day commit streak' },
    { icon: '💪', title: 'Consistency', description: 'Logged every day' },
    { icon: '🎯', title: 'Focus', description: '100% completion rate' }
  ]

  // Return 1-3 random achievements
  const count = Math.floor(Math.random() * 3) + 1
  return allAchievements
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
}
