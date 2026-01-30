#!/usr/bin/env node

/**
 * ============================================
 * DEVCAL DEMO SIMULATION SCRIPT
 * ============================================
 *
 * This script simulates a developer coding a
 * To-Do List app with an 8-hour interruption.
 *
 * It creates:
 * - Tasks for building a to-do app
 * - Commits showing work done before interruption
 * - Gap showing no work for X hours
 *
 * USAGE:
 *   node scripts/simulate-demo.js
 *
 * OPTIONS:
 *   --hours=8    Hours since last activity (default: 8)
 *   --reset      Clear existing demo data first
 */

const fs = require('fs')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const hoursAgo = parseInt(args.find(a => a.startsWith('--hours='))?.split('=')[1] || '8')
const shouldReset = args.includes('--reset')

// Configuration
const DATA_FILE = path.join(__dirname, '..', 'demo-data.json')
const API_BASE = 'http://localhost:3000/api'

console.log(`
╔══════════════════════════════════════════════════════════╗
║           DEVCAL DEMO SIMULATION                         ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  This script simulates building a To-Do List app         ║
║  with an interruption ${String(hoursAgo).padStart(2)} hours ago.                      ║
║                                                          ║
║  Tasks before the gap: ✅ Completed                      ║
║  Tasks after the gap:  🔴 STALE (no activity)            ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`)

// Helper functions
function getTimeAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function setTimeToday(hours, minutes = 0) {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Generate demo data
function generateDemoData() {
  const now = new Date()
  const interruptionTime = getTimeAgo(hoursAgo)

  console.log(`\n📅 Current time: ${formatTime(now)}`)
  console.log(`⏰ Interruption happened at: ${formatTime(interruptionTime)} (${hoursAgo} hours ago)`)
  console.log('\n')

  // Define the to-do app tasks
  const taskDefinitions = [
    { name: 'Set up Next.js project', hour: 9, duration: 1, description: 'Initialize project with TypeScript' },
    { name: 'Create Todo data model', hour: 10, duration: 1, description: 'Define schema for todos' },
    { name: 'Build API endpoints', hour: 11, duration: 2, description: 'Create CRUD routes' },
    { name: 'Create TodoList component', hour: 13, duration: 1, description: 'Display list of todos' },
    { name: 'Add create todo form', hour: 14, duration: 1, description: 'Form to add new todos' },
    { name: 'Implement edit functionality', hour: 15, duration: 1, description: 'Edit existing todos' },
    { name: 'Add delete with confirmation', hour: 16, duration: 1, description: 'Delete todos safely' },
    { name: 'Style with Tailwind CSS', hour: 17, duration: 1, description: 'Make it look good' },
    { name: 'Write unit tests', hour: 18, duration: 1, description: 'Test all components' },
    { name: 'Deploy to production', hour: 19, duration: 1, description: 'Ship it!' },
  ]

  // Define corresponding commits
  const commitDefinitions = [
    { message: 'Initial commit: Set up Next.js with TypeScript', hour: 9, minute: 30, files: ['package.json', 'tsconfig.json', 'next.config.js'] },
    { message: 'Add Todo model with Prisma schema', hour: 10, minute: 15, files: ['prisma/schema.prisma', 'lib/db.ts'] },
    { message: 'Create Todo API routes (GET, POST)', hour: 11, minute: 20, files: ['app/api/todos/route.ts'] },
    { message: 'Add PUT and DELETE endpoints', hour: 12, minute: 10, files: ['app/api/todos/[id]/route.ts'] },
    { message: 'Build TodoList component with React', hour: 13, minute: 30, files: ['components/TodoList.tsx', 'components/TodoItem.tsx'] },
    { message: 'Add CreateTodo form component', hour: 14, minute: 45, files: ['components/CreateTodo.tsx', 'hooks/useTodos.ts'] },
    { message: 'Implement inline editing for todos', hour: 15, minute: 20, files: ['components/TodoItem.tsx', 'components/EditTodo.tsx'] },
    // After this point, the "interruption" happens
    // These commits WON'T exist, showing the gap
  ]

  // Process tasks
  const tasks = []
  const commits = []

  console.log('📋 TASKS STATUS:\n')
  console.log('─'.repeat(70))

  taskDefinitions.forEach((def, index) => {
    const startTime = setTimeToday(def.hour)
    const endTime = setTimeToday(def.hour + def.duration)

    // Determine status based on interruption time
    let status = 'pending'
    let lastActivity = null
    let isStale = false
    let indicator = ''

    if (endTime <= interruptionTime) {
      // Task was completed before interruption
      status = 'completed'
      lastActivity = endTime.toISOString()
      indicator = '✅'
    } else if (startTime < interruptionTime && endTime > interruptionTime) {
      // Task was in progress when interruption happened
      status = 'in_progress'
      lastActivity = interruptionTime.toISOString()
      indicator = '🟡'
    } else if (startTime >= interruptionTime && startTime < now) {
      // Task should have started but no activity (STALE)
      status = 'pending'
      isStale = true
      indicator = '🔴'
    } else {
      // Future task
      status = 'pending'
      indicator = '⬜'
    }

    const task = {
      id: `demo_task_${index}`,
      name: def.name,
      description: def.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status,
      lastActivity,
      isStale,
      keywords: def.name.toLowerCase().split(' ')
    }

    tasks.push(task)

    // Print task status
    const timeRange = `${formatTime(startTime)}-${formatTime(endTime)}`
    const staleMark = isStale ? ' [NO ACTIVITY - STALE]' : ''
    console.log(`${indicator} ${timeRange.padEnd(15)} ${def.name.padEnd(35)} ${status.toUpperCase()}${staleMark}`)
  })

  console.log('─'.repeat(70))

  // Process commits (only those before interruption)
  console.log('\n\n💾 COMMITS (before interruption):\n')
  console.log('─'.repeat(70))

  commitDefinitions.forEach((def, index) => {
    const commitTime = setTimeToday(def.hour, def.minute)

    if (commitTime <= interruptionTime) {
      const commit = {
        hash: generateHash(),
        message: def.message,
        timestamp: commitTime.toISOString(),
        author: 'Developer',
        filesChanged: def.files,
        additions: Math.floor(Math.random() * 100) + 20,
        deletions: Math.floor(Math.random() * 20),
        branch: 'pending'
      }
      commits.push(commit)

      console.log(`✅ ${formatTime(commitTime)} - ${def.message}`)
      console.log(`   Files: ${def.files.join(', ')}`)
      console.log('')
    }
  })

  console.log('─'.repeat(70))

  // Show gap analysis
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const staleTasks = tasks.filter(t => t.isStale).length
  const pendingTasks = tasks.filter(t => t.status === 'pending' && !t.isStale).length

  console.log(`\n\n📊 GAP ANALYSIS:\n`)
  console.log('─'.repeat(70))
  console.log(`  Completed before interruption:  ${completedTasks} tasks`)
  console.log(`  🔴 STALE (no activity):         ${staleTasks} tasks`)
  console.log(`  Pending (future):               ${pendingTasks} tasks`)
  console.log(`  Total commits made:             ${commits.length}`)
  console.log(`  Gap duration:                   ${hoursAgo} hours`)
  console.log('─'.repeat(70))

  // Save demo data
  const demoData = {
    generatedAt: now.toISOString(),
    interruptionTime: interruptionTime.toISOString(),
    hoursAgo,
    tasks,
    commits,
    analysis: {
      completedTasks,
      staleTasks,
      pendingTasks,
      totalCommits: commits.length,
      gapHours: hoursAgo
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(demoData, null, 2))
  console.log(`\n✅ Demo data saved to: ${DATA_FILE}`)

  // Print next steps
  console.log(`

╔══════════════════════════════════════════════════════════╗
║                    NEXT STEPS                            ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  1. Start the DevCal app:                                ║
║     npm run dev                                          ║
║                                                          ║
║  2. Open http://localhost:3000                           ║
║                                                          ║
║  3. Click "Generate Template" → Select "To-Do List App"  ║
║     Enable "Simulate Interruption" with ${String(hoursAgo).padStart(2)} hours         ║
║                                                          ║
║  4. The calendar will show:                              ║
║     ✅ Green tasks = completed before interruption       ║
║     🔴 RED tasks = stale (no activity for ${String(hoursAgo).padStart(2)} hours)      ║
║                                                          ║
║  5. Click "Generate Briefing" to see the catchup video   ║
║                                                          ║
║  6. Use "Reschedule Tasks" to push stale tasks forward   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`)

  return demoData
}

// Generate random hash
function generateHash() {
  const chars = 'abcdef0123456789'
  let hash = ''
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

// Run the simulation
generateDemoData()
