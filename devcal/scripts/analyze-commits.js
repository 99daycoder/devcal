#!/usr/bin/env node

/**
 * ============================================
 * GIT COMMIT ANALYSIS SCRIPT
 * ============================================
 *
 * This script reads git commits from the
 * pending branch and syncs them to Neo4j.
 *
 * USAGE:
 *   npm run analyze-commits
 *
 * OR:
 *   node scripts/analyze-commits.js
 */

const { execSync } = require('child_process')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const neo4j = require('neo4j-driver')

// Configuration
const config = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  branch: process.env.PENDING_BRANCH || 'pending',
  repoPath: process.env.GIT_REPO_PATH || process.cwd()
}

console.log(`
╔══════════════════════════════════════════╗
║     COMMIT ANALYSIS SCRIPT               ║
╠══════════════════════════════════════════╣
║  Branch: ${config.branch.padEnd(30)}  ║
║  Repo: ${config.repoPath.substring(0, 30).padEnd(32)}  ║
╚══════════════════════════════════════════╝
`)

// Check if in git repo
function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: config.repoPath,
      stdio: 'pipe'
    })
    return true
  } catch {
    return false
  }
}

// Get git commits
function getCommits() {
  try {
    // Check if branch exists
    const branches = execSync('git branch --list', {
      cwd: config.repoPath,
      encoding: 'utf8'
    })

    const branchExists = branches.includes(config.branch)

    // Build git log command
    let command = 'git log'
    if (branchExists) {
      command += ` ${config.branch}`
    }
    command += ' -n 50 --pretty=format:"%H|%aI|%an|%s" --name-only'

    const output = execSync(command, {
      cwd: config.repoPath,
      encoding: 'utf8'
    })

    // Parse output
    const commits = []
    const entries = output.split('\n\n')

    for (const entry of entries) {
      if (!entry.trim()) continue

      const lines = entry.trim().split('\n')
      const [firstLine, ...fileLines] = lines
      const parts = firstLine.split('|')

      if (parts.length >= 4) {
        commits.push({
          hash: parts[0],
          timestamp: parts[1],
          author: parts[2],
          message: parts[3],
          filesChanged: fileLines.filter(f => f.trim() !== ''),
          branch: config.branch
        })
      }
    }

    return commits
  } catch (error) {
    console.error('Error getting commits:', error.message)
    return []
  }
}

// Extract keywords from text
function extractKeywords(text) {
  if (!text) return []

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been'
  ])

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
}

// Store commit in Neo4j
async function storeCommit(session, commit) {
  const query = `
    MERGE (c:Commit {hash: $hash})
    ON CREATE SET
      c.message = $message,
      c.timestamp = datetime($timestamp),
      c.author = $author,
      c.filesChanged = $filesChanged,
      c.branch = $branch,
      c.keywords = $keywords,
      c.createdAt = datetime()
    ON MATCH SET
      c.message = $message,
      c.filesChanged = $filesChanged
    RETURN c
  `

  const keywords = extractKeywords(commit.message)

  await session.run(query, {
    hash: commit.hash,
    message: commit.message,
    timestamp: commit.timestamp,
    author: commit.author,
    filesChanged: commit.filesChanged,
    branch: commit.branch,
    keywords: keywords
  })

  // Create file nodes and relationships
  for (const file of commit.filesChanged) {
    await session.run(`
      MERGE (f:File {name: $fileName})
      WITH f
      MATCH (c:Commit {hash: $hash})
      MERGE (c)-[:MODIFIED]->(f)
    `, { fileName: file, hash: commit.hash })
  }
}

// Link commits to tasks
async function linkCommitsToTasks(session) {
  const query = `
    MATCH (t:Task), (c:Commit)
    WHERE any(tk IN t.keywords WHERE any(ck IN c.keywords WHERE
      toLower(ck) CONTAINS toLower(tk) OR toLower(tk) CONTAINS toLower(ck)
    ))
    AND c.timestamp >= t.startTime AND c.timestamp <= t.endTime
    MERGE (c)-[:RELATES_TO]->(t)
    RETURN count(*) as relationships
  `

  const result = await session.run(query)
  return result.records[0]?.get('relationships')?.low || 0
}

// Main function
async function analyze() {
  // Check git repo
  if (!isGitRepo()) {
    console.log('❌ Not in a git repository')
    console.log('   Run this script from your project directory')
    process.exit(1)
  }

  console.log('✅ Git repository found\n')

  // Get commits
  console.log('📖 Reading commits...')
  const commits = getCommits()
  console.log(`   Found ${commits.length} commits\n`)

  if (commits.length === 0) {
    console.log('⚠️  No commits found on branch:', config.branch)
    return
  }

  // Connect to Neo4j
  let driver = null
  let session = null

  try {
    console.log('🔌 Connecting to Neo4j...')
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    )
    await driver.verifyConnectivity()
    console.log('✅ Connected!\n')

    session = driver.session()

    // Store commits
    console.log('💾 Storing commits in Neo4j...\n')
    let stored = 0

    for (const commit of commits) {
      try {
        await storeCommit(session, commit)
        stored++
        console.log(`  ✅ ${commit.hash.substring(0, 7)}: ${commit.message.substring(0, 50)}`)
      } catch (error) {
        console.log(`  ❌ ${commit.hash.substring(0, 7)}: ${error.message}`)
      }
    }

    // Link commits to tasks
    console.log('\n🔗 Linking commits to tasks...')
    const relationships = await linkCommitsToTasks(session)
    console.log(`   Created ${relationships} relationship(s)\n`)

    // Summary
    console.log('╔══════════════════════════════════════════╗')
    console.log('║     ANALYSIS COMPLETE! ✨                 ║')
    console.log('╠══════════════════════════════════════════╣')
    console.log(`║  Commits stored: ${String(stored).padEnd(22)}  ║`)
    console.log(`║  Relationships: ${String(relationships).padEnd(23)}  ║`)
    console.log('╚══════════════════════════════════════════╝')
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)

    if (error.message.includes('authentication')) {
      console.log('\nCheck your Neo4j credentials in .env.local')
    }
  } finally {
    if (session) await session.close()
    if (driver) await driver.close()
  }
}

// Run
analyze()
