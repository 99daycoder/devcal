// ============================================
// GIT ANALYSIS LIBRARY
// ============================================
// This file handles reading and parsing git
// commit history for comparison with tasks

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// --------------------------------------------
// CONFIGURATION
// --------------------------------------------

const GIT_CONFIG = {
  // Default branch to analyze
  defaultBranch: process.env.PENDING_BRANCH || 'pending',
  // Maximum commits to fetch
  maxCommits: 100,
  // Repository path
  repoPath: process.env.GIT_REPO_PATH || process.cwd()
}

// --------------------------------------------
// GIT OPERATIONS
// --------------------------------------------

/**
 * Check if a directory is a git repository
 * @param {string} path - Directory path to check
 */
export async function isGitRepo(path = GIT_CONFIG.repoPath) {
  try {
    await execAsync('git rev-parse --is-inside-work-tree', { cwd: path })
    return true
  } catch {
    return false
  }
}

/**
 * Get the current branch name
 * @param {string} path - Repository path
 */
export async function getCurrentBranch(path = GIT_CONFIG.repoPath) {
  try {
    const { stdout } = await execAsync('git branch --show-current', { cwd: path })
    return stdout.trim()
  } catch (error) {
    console.error('Failed to get current branch:', error)
    return null
  }
}

/**
 * Check if a branch exists
 * @param {string} branchName - Branch to check
 * @param {string} path - Repository path
 */
export async function branchExists(branchName, path = GIT_CONFIG.repoPath) {
  try {
    await execAsync(`git show-ref --verify --quiet refs/heads/${branchName}`, { cwd: path })
    return true
  } catch {
    return false
  }
}

/**
 * Get git log with detailed commit information
 * @param {object} options - Options for git log
 */
export async function getCommitLog(options = {}) {
  const {
    branch = GIT_CONFIG.defaultBranch,
    since = null,
    until = null,
    maxCount = GIT_CONFIG.maxCommits,
    path = GIT_CONFIG.repoPath
  } = options

  try {
    // Build the git log command
    // Format: hash|author|timestamp|message|files
    let command = `git log`

    // Add branch if it exists
    const hasBranch = await branchExists(branch, path)
    if (hasBranch) {
      command += ` ${branch}`
    }

    // Add time filters
    if (since) {
      command += ` --since="${since}"`
    }
    if (until) {
      command += ` --until="${until}"`
    }

    // Limit number of commits
    command += ` -n ${maxCount}`

    // Format: hash|timestamp|author|subject
    command += ` --pretty=format:"%H|%aI|%an|%s"`

    // Add --name-only to get changed files
    command += ` --name-only`

    const { stdout } = await execAsync(command, { cwd: path })

    // Parse the output
    const commits = parseGitLog(stdout)
    return commits
  } catch (error) {
    console.error('Failed to get commit log:', error)
    return []
  }
}

/**
 * Parse git log output into structured data
 * @param {string} logOutput - Raw git log output
 */
function parseGitLog(logOutput) {
  if (!logOutput || !logOutput.trim()) {
    return []
  }

  const commits = []
  const entries = logOutput.split('\n\n') // Commits are separated by blank lines

  for (const entry of entries) {
    if (!entry.trim()) continue

    const lines = entry.trim().split('\n')
    if (lines.length === 0) continue

    // First line is the formatted commit info
    const [firstLine, ...fileLines] = lines
    const parts = firstLine.split('|')

    if (parts.length >= 4) {
      const commit = {
        hash: parts[0],
        timestamp: parts[1],
        author: parts[2],
        message: parts[3],
        filesChanged: fileLines.filter(f => f.trim() !== '')
      }
      commits.push(commit)
    }
  }

  return commits
}

/**
 * Get detailed stats for a specific commit
 * @param {string} hash - Commit hash
 * @param {string} path - Repository path
 */
export async function getCommitStats(hash, path = GIT_CONFIG.repoPath) {
  try {
    const { stdout } = await execAsync(
      `git show --stat --format="" ${hash}`,
      { cwd: path }
    )

    // Parse stats
    const lines = stdout.trim().split('\n')
    let additions = 0
    let deletions = 0

    // Last line has summary like: "3 files changed, 10 insertions(+), 5 deletions(-)"
    const summaryLine = lines[lines.length - 1]
    const insertMatch = summaryLine.match(/(\d+) insertion/)
    const deleteMatch = summaryLine.match(/(\d+) deletion/)

    if (insertMatch) additions = parseInt(insertMatch[1])
    if (deleteMatch) deletions = parseInt(deleteMatch[1])

    return { additions, deletions }
  } catch (error) {
    console.error('Failed to get commit stats:', error)
    return { additions: 0, deletions: 0 }
  }
}

/**
 * Get commits for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} path - Repository path
 */
export async function getCommitsByDate(date, path = GIT_CONFIG.repoPath) {
  // Create time range for the date (midnight to midnight)
  const startOfDay = `${date}T00:00:00`
  const endOfDay = `${date}T23:59:59`

  return getCommitLog({
    since: startOfDay,
    until: endOfDay,
    path
  })
}

/**
 * Get all commits from today
 * @param {string} path - Repository path
 */
export async function getTodaysCommits(path = GIT_CONFIG.repoPath) {
  const today = new Date().toISOString().split('T')[0]
  return getCommitsByDate(today, path)
}

/**
 * Analyze commits and return structured data for Neo4j
 * @param {array} commits - Array of parsed commits
 */
export function analyzeCommits(commits) {
  const analysis = {
    totalCommits: commits.length,
    totalFiles: new Set(),
    commitsByHour: {},
    fileTypes: {},
    keywords: new Set()
  }

  for (const commit of commits) {
    // Track files
    commit.filesChanged.forEach(f => analysis.totalFiles.add(f))

    // Track by hour
    const hour = new Date(commit.timestamp).getHours()
    analysis.commitsByHour[hour] = (analysis.commitsByHour[hour] || 0) + 1

    // Track file types
    commit.filesChanged.forEach(file => {
      const ext = file.split('.').pop()
      analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1
    })

    // Extract keywords from message
    const words = commit.message.toLowerCase().split(/\s+/)
    words.forEach(w => {
      if (w.length > 3) analysis.keywords.add(w)
    })
  }

  return {
    ...analysis,
    totalFiles: analysis.totalFiles.size,
    uniqueFiles: [...analysis.totalFiles],
    keywords: [...analysis.keywords]
  }
}

// --------------------------------------------
// BRANCH MANAGEMENT (for auto-commit script)
// --------------------------------------------

/**
 * Create the pending branch if it doesn't exist
 * @param {string} path - Repository path
 */
export async function createPendingBranch(path = GIT_CONFIG.repoPath) {
  const branchName = GIT_CONFIG.defaultBranch

  try {
    // Check if branch exists
    const exists = await branchExists(branchName, path)

    if (!exists) {
      // Create branch from current HEAD
      await execAsync(`git branch ${branchName}`, { cwd: path })
      console.log(`✅ Created branch: ${branchName}`)
    }

    return true
  } catch (error) {
    console.error('Failed to create pending branch:', error)
    return false
  }
}

/**
 * Get the status of the working directory
 * @param {string} path - Repository path
 */
export async function getGitStatus(path = GIT_CONFIG.repoPath) {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: path })

    const files = stdout.trim().split('\n').filter(f => f.trim())
    const status = {
      hasChanges: files.length > 0,
      modified: [],
      added: [],
      deleted: [],
      untracked: []
    }

    files.forEach(line => {
      const statusCode = line.substring(0, 2)
      const fileName = line.substring(3)

      if (statusCode.includes('M')) status.modified.push(fileName)
      if (statusCode.includes('A')) status.added.push(fileName)
      if (statusCode.includes('D')) status.deleted.push(fileName)
      if (statusCode.includes('?')) status.untracked.push(fileName)
    })

    return status
  } catch (error) {
    console.error('Failed to get git status:', error)
    return { hasChanges: false, modified: [], added: [], deleted: [], untracked: [] }
  }
}

// --------------------------------------------
// DEMO DATA GENERATOR
// --------------------------------------------

/**
 * Generate sample commit data for demos
 * Used when not in a real git repo or for testing
 */
export function generateDemoCommits(count = 5) {
  const sampleMessages = [
    'Add user authentication module',
    'Fix login form validation',
    'Update database schema',
    'Implement API endpoint for users',
    'Refactor error handling',
    'Add unit tests for auth',
    'Update README documentation',
    'Fix bug in password reset',
    'Add email notification service',
    'Optimize database queries'
  ]

  const sampleFiles = [
    'src/auth/login.js',
    'src/api/users.js',
    'src/database/schema.sql',
    'tests/auth.test.js',
    'src/utils/validation.js',
    'README.md',
    'package.json',
    'src/services/email.js'
  ]

  const commits = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (i * 15 * 60 * 1000)) // 15 min apart

    commits.push({
      hash: generateHash(),
      timestamp: timestamp.toISOString(),
      author: 'Developer',
      message: sampleMessages[i % sampleMessages.length],
      filesChanged: [
        sampleFiles[Math.floor(Math.random() * sampleFiles.length)],
        sampleFiles[Math.floor(Math.random() * sampleFiles.length)]
      ].filter((f, i, arr) => arr.indexOf(f) === i) // Remove duplicates
    })
  }

  return commits
}

/**
 * Generate a fake commit hash
 */
function generateHash() {
  const chars = 'abcdef0123456789'
  let hash = ''
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

// --------------------------------------------
// EXPORTS
// --------------------------------------------

export default {
  isGitRepo,
  getCurrentBranch,
  branchExists,
  getCommitLog,
  getCommitStats,
  getCommitsByDate,
  getTodaysCommits,
  analyzeCommits,
  createPendingBranch,
  getGitStatus,
  generateDemoCommits
}
