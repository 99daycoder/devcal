// ============================================
// COMMITS API ROUTES
// ============================================
// Handles git commit analysis and storage
// Reads from git log and stores in Neo4j

import { NextResponse } from 'next/server'

// Import modules with error handling
let gitLib = null
let neo4j = null

try {
  gitLib = await import('../../../lib/git.js')
} catch (e) {
  console.log('Git module not loaded')
}

try {
  neo4j = await import('../../../lib/neo4j.js')
} catch (e) {
  console.log('Neo4j module not loaded')
}

// In-memory storage for commits (demo mode)
let mockCommits = generateMockCommits()

// --------------------------------------------
// GET /api/commits
// Returns commits for a date or all recent commits
// --------------------------------------------
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const branch = searchParams.get('branch') || 'pending'

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !gitLib

    if (demoMode) {
      let commits = mockCommits

      if (date) {
        commits = commits.filter(c => c.timestamp.startsWith(date))
      }

      return NextResponse.json({
        success: true,
        commits: commits,
        isDemo: true,
        stats: analyzeCommitStats(commits)
      })
    }

    // Check if in a git repo
    const isRepo = await gitLib.isGitRepo()
    if (!isRepo) {
      return NextResponse.json({
        success: true,
        commits: mockCommits,
        isDemo: true,
        message: 'Not in a git repository, using demo data'
      })
    }

    // Get commits from git
    let commits
    if (date) {
      commits = await gitLib.getCommitsByDate(date)
    } else {
      commits = await gitLib.getCommitLog({ branch })
    }

    return NextResponse.json({
      success: true,
      commits: commits,
      stats: analyzeCommitStats(commits)
    })
  } catch (error) {
    console.error('Error fetching commits:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// POST /api/commits
// Syncs commits from git to Neo4j
// --------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json()
    const date = body.date
    const branch = body.branch || 'pending'

    // Check if using demo mode
    const demoMode = process.env.DEMO_MODE === 'true' || !gitLib || !neo4j

    if (demoMode) {
      return NextResponse.json({
        success: true,
        synced: mockCommits.length,
        message: 'Demo mode - no actual sync performed',
        isDemo: true
      })
    }

    // Get commits from git
    let commits
    if (date) {
      commits = await gitLib.getCommitsByDate(date)
    } else {
      commits = await gitLib.getCommitLog({ branch })
    }

    // Store each commit in Neo4j
    let syncedCount = 0
    for (const commit of commits) {
      try {
        // Get additional stats
        const stats = await gitLib.getCommitStats(commit.hash)

        await neo4j.storeCommit({
          ...commit,
          ...stats,
          branch: branch
        })
        syncedCount++
      } catch (e) {
        console.error('Failed to store commit:', commit.hash, e)
      }
    }

    // Link commits to tasks
    const relationships = await neo4j.linkCommitsToTasks()

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: commits.length,
      relationships: relationships
    })
  } catch (error) {
    console.error('Error syncing commits:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// --------------------------------------------
// Helper: Generate mock commits for demo
// --------------------------------------------
function generateMockCommits() {
  const today = new Date()
  const commits = []

  const messages = [
    { msg: 'Add user authentication module', type: 'feature' },
    { msg: 'Fix login form validation bug', type: 'bugfix' },
    { msg: 'Update database schema for tasks', type: 'update' },
    { msg: 'Implement task CRUD operations', type: 'feature' },
    { msg: 'Add Neo4j connection pooling', type: 'feature' },
    { msg: 'Fix memory leak in git watcher', type: 'bugfix' },
    { msg: 'Refactor API error handling', type: 'refactor' },
    { msg: 'Add commit analysis endpoint', type: 'feature' },
    { msg: 'Update README with setup instructions', type: 'docs' },
    { msg: 'Fix timezone issue in calendar', type: 'bugfix' }
  ]

  const files = [
    ['src/auth/login.js', 'src/auth/register.js'],
    ['src/components/LoginForm.js', 'src/utils/validation.js'],
    ['schema/tasks.cypher', 'lib/neo4j.js'],
    ['app/api/tasks/route.js', 'lib/neo4j.js'],
    ['lib/neo4j.js'],
    ['scripts/autocommit.ps1', 'lib/git.js'],
    ['app/api/tasks/route.js', 'app/api/video/route.js', 'app/api/commits/route.js'],
    ['app/api/commits/route.js', 'lib/git.js'],
    ['README.md', 'SETUP.md'],
    ['components/Calendar.js', 'lib/dates.js']
  ]

  for (let i = 0; i < messages.length; i++) {
    const timestamp = new Date(today)
    timestamp.setMinutes(timestamp.getMinutes() - (i * 15))

    commits.push({
      hash: generateHash(),
      timestamp: timestamp.toISOString(),
      author: 'Developer',
      message: messages[i].msg,
      filesChanged: files[i],
      type: messages[i].type,
      additions: Math.floor(Math.random() * 100) + 10,
      deletions: Math.floor(Math.random() * 30)
    })
  }

  return commits
}

// --------------------------------------------
// Helper: Generate fake hash
// --------------------------------------------
function generateHash() {
  const chars = 'abcdef0123456789'
  let hash = ''
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

// --------------------------------------------
// Helper: Analyze commit statistics
// --------------------------------------------
function analyzeCommitStats(commits) {
  const stats = {
    total: commits.length,
    byType: {
      feature: 0,
      bugfix: 0,
      refactor: 0,
      docs: 0,
      other: 0
    },
    filesModified: new Set(),
    byHour: {},
    totalAdditions: 0,
    totalDeletions: 0
  }

  commits.forEach(commit => {
    // Count by type
    if (/add|feature|implement|create/i.test(commit.message)) {
      stats.byType.feature++
    } else if (/fix|bug|error|issue/i.test(commit.message)) {
      stats.byType.bugfix++
    } else if (/refactor|clean|improve/i.test(commit.message)) {
      stats.byType.refactor++
    } else if (/doc|readme|comment/i.test(commit.message)) {
      stats.byType.docs++
    } else {
      stats.byType.other++
    }

    // Track files
    (commit.filesChanged || []).forEach(f => stats.filesModified.add(f))

    // Track by hour
    const hour = new Date(commit.timestamp).getHours()
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1

    // Track additions/deletions
    stats.totalAdditions += commit.additions || 0
    stats.totalDeletions += commit.deletions || 0
  })

  stats.uniqueFiles = stats.filesModified.size
  stats.filesModified = [...stats.filesModified]

  return stats
}
