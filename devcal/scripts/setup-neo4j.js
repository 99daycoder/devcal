#!/usr/bin/env node

/**
 * ============================================
 * NEO4J DATABASE SETUP SCRIPT
 * ============================================
 *
 * This script initializes the Neo4j database
 * with the required schema for DevCal.
 *
 * USAGE:
 *   npm run setup-neo4j
 *
 * OR:
 *   node scripts/setup-neo4j.js
 *
 * REQUIREMENTS:
 *   - Neo4j database running
 *   - .env.local configured with Neo4j credentials
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const neo4j = require('neo4j-driver')

// Configuration from environment
const config = {
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
}

console.log(`
╔══════════════════════════════════════════╗
║     DEVCAL NEO4J SETUP SCRIPT            ║
╠══════════════════════════════════════════╣
║  Connecting to: ${config.uri.padEnd(23)}  ║
║  Username: ${config.username.padEnd(29)}  ║
╚══════════════════════════════════════════╝
`)

// Cypher queries for schema setup
const schemaQueries = [
  // ==========================================
  // CONSTRAINTS (ensure uniqueness)
  // ==========================================
  {
    name: 'Task ID Constraint',
    query: 'CREATE CONSTRAINT task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE'
  },
  {
    name: 'Commit Hash Constraint',
    query: 'CREATE CONSTRAINT commit_hash IF NOT EXISTS FOR (c:Commit) REQUIRE c.hash IS UNIQUE'
  },
  {
    name: 'Video ID Constraint',
    query: 'CREATE CONSTRAINT video_id IF NOT EXISTS FOR (v:Video) REQUIRE v.id IS UNIQUE'
  },
  {
    name: 'File Name Constraint',
    query: 'CREATE CONSTRAINT file_name IF NOT EXISTS FOR (f:File) REQUIRE f.name IS UNIQUE'
  },

  // ==========================================
  // INDEXES (improve query performance)
  // ==========================================
  {
    name: 'Task Start Time Index',
    query: 'CREATE INDEX task_start_time IF NOT EXISTS FOR (t:Task) ON (t.startTime)'
  },
  {
    name: 'Task Status Index',
    query: 'CREATE INDEX task_status IF NOT EXISTS FOR (t:Task) ON (t.status)'
  },
  {
    name: 'Commit Timestamp Index',
    query: 'CREATE INDEX commit_timestamp IF NOT EXISTS FOR (c:Commit) ON (c.timestamp)'
  },
  {
    name: 'Commit Branch Index',
    query: 'CREATE INDEX commit_branch IF NOT EXISTS FOR (c:Commit) ON (c.branch)'
  },
  {
    name: 'Video Date Index',
    query: 'CREATE INDEX video_date IF NOT EXISTS FOR (v:Video) ON (v.date)'
  },
  {
    name: 'Video Created Index',
    query: 'CREATE INDEX video_created IF NOT EXISTS FOR (v:Video) ON (v.createdAt)'
  }
]

// Sample data for demo/testing
const sampleDataQueries = [
  // Sample tasks
  {
    name: 'Sample Task 1',
    query: `
      MERGE (t:Task {id: 'sample_1'})
      ON CREATE SET
        t.name = 'Build authentication module',
        t.description = 'Implement user login and registration',
        t.startTime = datetime('${getTodayAt(9, 0)}'),
        t.endTime = datetime('${getTodayAt(12, 0)}'),
        t.status = 'completed',
        t.keywords = ['authentication', 'login', 'registration', 'user'],
        t.createdAt = datetime()
    `
  },
  {
    name: 'Sample Task 2',
    query: `
      MERGE (t:Task {id: 'sample_2'})
      ON CREATE SET
        t.name = 'Design database schema',
        t.description = 'Create Neo4j schema for tasks and commits',
        t.startTime = datetime('${getTodayAt(13, 0)}'),
        t.endTime = datetime('${getTodayAt(15, 0)}'),
        t.status = 'in_progress',
        t.keywords = ['database', 'schema', 'neo4j', 'design'],
        t.createdAt = datetime()
    `
  },
  {
    name: 'Sample Task 3',
    query: `
      MERGE (t:Task {id: 'sample_3'})
      ON CREATE SET
        t.name = 'Write unit tests',
        t.description = 'Add tests for auth module',
        t.startTime = datetime('${getTodayAt(15, 30)}'),
        t.endTime = datetime('${getTodayAt(17, 0)}'),
        t.status = 'pending',
        t.keywords = ['tests', 'unit', 'auth', 'testing'],
        t.createdAt = datetime()
    `
  },

  // Sample commits
  {
    name: 'Sample Commit 1',
    query: `
      MERGE (c:Commit {hash: 'abc123def456'})
      ON CREATE SET
        c.message = 'Add login form component',
        c.timestamp = datetime('${getTodayAt(9, 30)}'),
        c.filesChanged = ['src/auth/LoginForm.js', 'src/auth/styles.css'],
        c.additions = 120,
        c.deletions = 5,
        c.branch = 'pending',
        c.keywords = ['login', 'form', 'component'],
        c.createdAt = datetime()
    `
  },
  {
    name: 'Sample Commit 2',
    query: `
      MERGE (c:Commit {hash: 'def456ghi789'})
      ON CREATE SET
        c.message = 'Implement authentication service',
        c.timestamp = datetime('${getTodayAt(10, 15)}'),
        c.filesChanged = ['src/services/auth.js', 'src/api/auth.js'],
        c.additions = 85,
        c.deletions = 10,
        c.branch = 'pending',
        c.keywords = ['authentication', 'service', 'implement'],
        c.createdAt = datetime()
    `
  },
  {
    name: 'Sample Commit 3',
    query: `
      MERGE (c:Commit {hash: 'ghi789jkl012'})
      ON CREATE SET
        c.message = 'Add password validation',
        c.timestamp = datetime('${getTodayAt(11, 45)}'),
        c.filesChanged = ['src/utils/validation.js'],
        c.additions = 45,
        c.deletions = 2,
        c.branch = 'pending',
        c.keywords = ['password', 'validation', 'add'],
        c.createdAt = datetime()
    `
  },

  // Link commits to tasks
  {
    name: 'Link Commits to Task 1',
    query: `
      MATCH (t:Task {id: 'sample_1'})
      MATCH (c:Commit) WHERE c.hash IN ['abc123def456', 'def456ghi789', 'ghi789jkl012']
      MERGE (c)-[:RELATES_TO]->(t)
    `
  },

  // Create file nodes
  {
    name: 'Create File Nodes',
    query: `
      UNWIND ['src/auth/LoginForm.js', 'src/auth/styles.css', 'src/services/auth.js', 'src/api/auth.js', 'src/utils/validation.js'] AS fileName
      MERGE (f:File {name: fileName})
    `
  },

  // Link commits to files
  {
    name: 'Link Commits to Files',
    query: `
      MATCH (c:Commit {hash: 'abc123def456'})
      MATCH (f:File) WHERE f.name IN ['src/auth/LoginForm.js', 'src/auth/styles.css']
      MERGE (c)-[:MODIFIED]->(f)
    `
  }
]

// Helper to get ISO timestamp for today
function getTodayAt(hours, minutes) {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

// Main setup function
async function setupDatabase() {
  let driver = null
  let session = null

  try {
    // Connect to Neo4j
    console.log('🔌 Connecting to Neo4j...')
    driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password)
    )

    // Verify connection
    await driver.verifyConnectivity()
    console.log('✅ Connected successfully!\n')

    session = driver.session()

    // Create schema
    console.log('📋 Creating schema...\n')
    for (const item of schemaQueries) {
      try {
        await session.run(item.query)
        console.log(`  ✅ ${item.name}`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  ${item.name} (already exists)`)
        } else {
          console.log(`  ❌ ${item.name}: ${error.message}`)
        }
      }
    }

    // Ask about sample data
    console.log('\n📦 Creating sample data...\n')
    for (const item of sampleDataQueries) {
      try {
        await session.run(item.query)
        console.log(`  ✅ ${item.name}`)
      } catch (error) {
        console.log(`  ❌ ${item.name}: ${error.message}`)
      }
    }

    // Show summary
    console.log('\n')
    console.log('╔══════════════════════════════════════════╗')
    console.log('║     SETUP COMPLETE! ✨                    ║')
    console.log('╠══════════════════════════════════════════╣')
    console.log('║                                          ║')
    console.log('║  Database is ready for DevCal            ║')
    console.log('║                                          ║')
    console.log('║  To view your data:                      ║')
    console.log('║  1. Open Neo4j Browser                   ║')
    console.log('║  2. Run: MATCH (n) RETURN n              ║')
    console.log('║                                          ║')
    console.log('╚══════════════════════════════════════════╝')
    console.log('')

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.log('\nTroubleshooting:')
    console.log('  1. Make sure Neo4j is running')
    console.log('  2. Check your credentials in .env.local')
    console.log('  3. Verify the connection URI is correct')
    console.log('')
    process.exit(1)
  } finally {
    if (session) await session.close()
    if (driver) await driver.close()
  }
}

// Run setup
setupDatabase()
