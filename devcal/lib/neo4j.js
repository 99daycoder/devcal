// ============================================
// NEO4J GRAPH DATABASE - PROPER IMPLEMENTATION
// ============================================
//
// WHY NEO4J MAKES SENSE FOR DEVCAL:
//
// 1. TASK DEPENDENCIES - "Task B depends on Task A"
//    Graph query: Find ALL tasks blocked if Task A isn't done
//
// 2. FILE DEPENDENCIES - "fileA imports fileB"
//    Graph query: What breaks if I change this file?
//
// 3. SKILL KNOWLEDGE GRAPH - Connect tasks → skills → resources
//    Graph query: What skills am I missing for pending tasks?
//
// 4. MONTHLY PROGRESS TRACKING - Track skill growth over time
//    Graph query: How have my skills improved this month?
//
// 5. IMPACT ANALYSIS - "What's the ripple effect?"
//    Graph query: If I skip this task, what's the downstream impact?
//
// A SQL database CAN'T do these efficiently - Neo4j can!

import neo4j from 'neo4j-driver'

// --------------------------------------------
// DATABASE CONNECTION
// --------------------------------------------

let driver = null

export function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687'
    const username = process.env.NEO4J_USERNAME || 'neo4j'
    const password = process.env.NEO4J_PASSWORD || 'password'

    try {
      driver = neo4j.driver(uri, neo4j.auth.basic(username, password))
      console.log('✅ Neo4j driver created')
    } catch (error) {
      console.error('❌ Neo4j connection failed:', error)
      throw error
    }
  }
  return driver
}

export async function closeDriver() {
  if (driver) {
    await driver.close()
    driver = null
  }
}

export async function runQuery(cypher, params = {}) {
  const driver = getDriver()
  const session = driver.session()

  try {
    const result = await session.run(cypher, params)
    return result.records.map(record => record.toObject())
  } finally {
    await session.close()
  }
}

// ============================================
// GRAPH SCHEMA
// ============================================
//
// NODES:
//   (Task)       - Planned work items
//   (Commit)     - Git commits
//   (File)       - Source code files
//   (Skill)      - Technologies (React, Auth, etc.)
//   (Bug)        - Bugs encountered
//   (Resource)   - Learning resources
//   (Month)      - Monthly snapshots for progress tracking
//
// RELATIONSHIPS (why graphs matter):
//   (Task)-[:DEPENDS_ON]->(Task)
//   (Task)-[:REQUIRES_SKILL]->(Skill)
//   (Commit)-[:IMPLEMENTS]->(Task)
//   (Commit)-[:MODIFIES]->(File)
//   (Commit)-[:DEMONSTRATES]->(Skill)
//   (File)-[:IMPORTS]->(File)
//   (Skill)-[:PREREQUISITE_OF]->(Skill)
//   (Month)-[:HAS_SKILL_LEVEL {level: 5}]->(Skill)
//
// ============================================

// --------------------------------------------
// TASK OPERATIONS WITH DEPENDENCIES
// --------------------------------------------

export async function createTask(task) {
  const cypher = `
    CREATE (t:Task {
      id: $id,
      name: $name,
      description: $description,
      startTime: datetime($startTime),
      endTime: datetime($endTime),
      status: 'pending',
      createdAt: datetime()
    })

    WITH t
    UNWIND $skills AS skillName
    MERGE (s:Skill {name: skillName})
    MERGE (t)-[:REQUIRES_SKILL]->(s)

    RETURN t
  `

  const skills = extractSkills(task.name + ' ' + (task.description || ''))

  const result = await runQuery(cypher, {
    id: task.id || generateId(),
    name: task.name,
    description: task.description || '',
    startTime: task.startTime,
    endTime: task.endTime,
    skills: skills
  })

  return convertTaskProperties(result[0]?.t?.properties)
}

export async function getTasksByDate(date) {
  const cypher = `
    MATCH (t:Task)
    WHERE date(t.startTime) = date($date)
    OPTIONAL MATCH (t)-[:REQUIRES_SKILL]->(s:Skill)
    OPTIONAL MATCH (t)-[:DEPENDS_ON]->(dep:Task)
    RETURN t, collect(DISTINCT s.name) AS skills, collect(DISTINCT dep.id) AS dependencies
    ORDER BY t.startTime
  `

  const result = await runQuery(cypher, { date })
  return result.map(r => ({
    ...convertTaskProperties(r.t.properties),
    skills: r.skills,
    dependencies: r.dependencies
  }))
}

export async function getAllTasks() {
  const cypher = `
    MATCH (t:Task)
    RETURN t
    ORDER BY t.startTime DESC
    LIMIT 100
  `

  const result = await runQuery(cypher)
  return result.map(r => convertTaskProperties(r.t.properties))
}

export async function updateTaskStatus(taskId, status) {
  const cypher = `
    MATCH (t:Task {id: $taskId})
    SET t.status = $status, t.updatedAt = datetime()
    RETURN t
  `

  const result = await runQuery(cypher, { taskId, status })
  return convertTaskProperties(result[0]?.t?.properties)
}

export async function deleteTask(taskId) {
  const cypher = `
    MATCH (t:Task {id: $taskId})
    DETACH DELETE t
    RETURN count(*) as deleted
  `

  const result = await runQuery(cypher, { taskId })
  return result[0]?.deleted > 0
}

/**
 * Add dependency between tasks
 * KEY GRAPH FEATURE: "Task B can't start until Task A is done"
 */
export async function addTaskDependency(taskId, dependsOnTaskId) {
  const cypher = `
    MATCH (t1:Task {id: $taskId})
    MATCH (t2:Task {id: $dependsOnTaskId})
    MERGE (t1)-[:DEPENDS_ON]->(t2)
    RETURN t1, t2
  `

  return runQuery(cypher, { taskId, dependsOnTaskId })
}

/**
 * GRAPH TRAVERSAL: Get all tasks blocked if this task isn't completed
 * This is why Neo4j exists - SQL can't do this efficiently!
 */
export async function getBlockedTasks(taskId) {
  const cypher = `
    MATCH (t:Task {id: $taskId})
    // Traverse ALL paths of any length
    MATCH (blocked:Task)-[:DEPENDS_ON*]->(t)
    WHERE blocked.status <> 'completed'
    RETURN DISTINCT blocked
    ORDER BY blocked.startTime
  `

  const result = await runQuery(cypher, { taskId })
  return result.map(r => convertTaskProperties(r.blocked.properties))
}

/**
 * Find the CRITICAL PATH - tasks that block the most others
 */
export async function getCriticalPath() {
  const cypher = `
    MATCH (t:Task)
    WHERE t.status <> 'completed'
    OPTIONAL MATCH path = (downstream:Task)-[:DEPENDS_ON*]->(t)
    WHERE downstream.status <> 'completed'
    WITH t, count(DISTINCT downstream) AS blockCount
    RETURN t, blockCount
    ORDER BY blockCount DESC
    LIMIT 10
  `

  const result = await runQuery(cypher)
  return result.map(r => ({
    task: convertTaskProperties(r.t.properties),
    blocksCount: r.blockCount?.low ?? r.blockCount ?? 0
  }))
}

// --------------------------------------------
// COMMIT OPERATIONS
// --------------------------------------------

export async function storeCommit(commit) {
  const cypher = `
    MERGE (c:Commit {hash: $hash})
    ON CREATE SET
      c.message = $message,
      c.timestamp = datetime($timestamp),
      c.branch = $branch,
      c.additions = $additions,
      c.deletions = $deletions,
      c.createdAt = datetime()

    WITH c
    UNWIND $filesChanged AS fileName
    MERGE (f:File {name: fileName})
    MERGE (c)-[:MODIFIES]->(f)

    WITH c
    UNWIND $skills AS skillName
    MERGE (s:Skill {name: skillName})
    MERGE (c)-[:DEMONSTRATES]->(s)

    RETURN c
  `

  const skills = extractSkills(commit.message)
  commit.filesChanged?.forEach(f => {
    skills.push(...detectSkillsFromFile(f))
  })

  return runQuery(cypher, {
    hash: commit.hash,
    message: commit.message,
    timestamp: commit.timestamp,
    branch: commit.branch || 'pending',
    additions: commit.additions || 0,
    deletions: commit.deletions || 0,
    filesChanged: commit.filesChanged || [],
    skills: [...new Set(skills)]
  })
}

export async function getCommitsByTimeRange(startTime, endTime) {
  const cypher = `
    MATCH (c:Commit)
    WHERE c.timestamp >= datetime($startTime) AND c.timestamp <= datetime($endTime)
    RETURN c
    ORDER BY c.timestamp
  `

  const result = await runQuery(cypher, { startTime, endTime })
  return result.map(r => convertCommitProperties(r.c.properties))
}

export async function getPendingBranchCommits() {
  const cypher = `
    MATCH (c:Commit {branch: 'pending'})
    RETURN c
    ORDER BY c.timestamp DESC
    LIMIT 50
  `

  const result = await runQuery(cypher)
  return result.map(r => convertCommitProperties(r.c.properties))
}

/**
 * Auto-link commits to tasks based on skill matching + time window
 */
export async function linkCommitsToTasks() {
  const cypher = `
    MATCH (c:Commit)-[:DEMONSTRATES]->(s:Skill)<-[:REQUIRES_SKILL]-(t:Task)
    WHERE c.timestamp >= t.startTime AND c.timestamp <= t.endTime
    MERGE (c)-[:IMPLEMENTS]->(t)
    RETURN count(*) AS relationships
  `

  const result = await runQuery(cypher)
  return result[0]?.relationships?.low ?? result[0]?.relationships ?? 0
}

// --------------------------------------------
// SKILL KNOWLEDGE GRAPH - KEY GRAPH FEATURE
// --------------------------------------------

/**
 * Get developer's skill graph
 * Shows what skills they've worked on and how much
 */
export async function getSkillGraph() {
  const cypher = `
    MATCH (s:Skill)
    OPTIONAL MATCH (c:Commit)-[:DEMONSTRATES]->(s)
    OPTIONAL MATCH (t:Task)-[:REQUIRES_SKILL]->(s)
    OPTIONAL MATCH (f:File)-[:USES_SKILL]->(s)
    OPTIONAL MATCH (prereq:Skill)-[:PREREQUISITE_OF]->(s)
    OPTIONAL MATCH (s)-[:PREREQUISITE_OF]->(advanced:Skill)

    RETURN
      s.name AS skill,
      count(DISTINCT c) AS commitCount,
      count(DISTINCT t) AS taskCount,
      count(DISTINCT f) AS fileCount,
      collect(DISTINCT prereq.name) AS prerequisites,
      collect(DISTINCT advanced.name) AS enables
    ORDER BY commitCount DESC
  `

  return runQuery(cypher)
}

/**
 * KNOWLEDGE GAP ANALYSIS - Key graph feature!
 * Find skills required by pending tasks but not demonstrated in commits
 */
export async function findKnowledgeGaps() {
  const cypher = `
    // Skills required by pending tasks
    MATCH (t:Task {status: 'pending'})-[:REQUIRES_SKILL]->(required:Skill)

    // Skills I've demonstrated in commits
    OPTIONAL MATCH (c:Commit)-[:DEMONSTRATES]->(required)

    WITH required, count(DISTINCT c) AS demonstrationCount
    WHERE demonstrationCount < 3  // Low demonstration = gap

    // Find resources to learn this skill
    OPTIONAL MATCH (required)<-[:TEACHES]-(r:Resource)

    RETURN
      required.name AS skill,
      demonstrationCount AS currentLevel,
      collect(DISTINCT r.name) AS learningResources
    ORDER BY demonstrationCount ASC
  `

  return runQuery(cypher)
}

/**
 * Get learning path for a skill
 * "What do I need to learn before React?"
 */
export async function getSkillPath(skillName) {
  const cypher = `
    MATCH (target:Skill {name: $skillName})
    OPTIONAL MATCH path = (prereq:Skill)-[:PREREQUISITE_OF*]->(target)
    RETURN
      target.name AS skill,
      [node in nodes(path) | node.name] AS learningPath
  `

  return runQuery(cypher, { skillName })
}

// --------------------------------------------
// MONTHLY PROGRESS TRACKING - User requested!
// --------------------------------------------

/**
 * Get or create a month node for tracking
 */
export async function getOrCreateMonth(yearMonth) {
  // yearMonth format: "2024-01"
  const cypher = `
    MERGE (m:Month {id: $yearMonth})
    ON CREATE SET m.createdAt = datetime()
    RETURN m
  `

  return runQuery(cypher, { yearMonth })
}

/**
 * Record skill level for a month
 * Creates historical skill progression
 */
export async function recordMonthlySkillLevel(yearMonth, skillName, level, commits, tasksCompleted) {
  const cypher = `
    MERGE (m:Month {id: $yearMonth})
    MERGE (s:Skill {name: $skillName})
    MERGE (m)-[r:HAS_SKILL_LEVEL]->(s)
    SET r.level = $level,
        r.commits = $commits,
        r.tasksCompleted = $tasksCompleted,
        r.recordedAt = datetime()
    RETURN m, s, r
  `

  return runQuery(cypher, { yearMonth, skillName, level, commits, tasksCompleted })
}

/**
 * GET MONTHLY SKILL PROGRESS - Key graph feature!
 * Track how skills have improved over months
 */
export async function getMonthlyProgress(months = 6) {
  const cypher = `
    // Get all months and their skill levels
    MATCH (m:Month)-[r:HAS_SKILL_LEVEL]->(s:Skill)
    WITH m, s, r
    ORDER BY m.id DESC
    LIMIT $limit

    RETURN
      m.id AS month,
      collect({
        skill: s.name,
        level: r.level,
        commits: r.commits,
        tasksCompleted: r.tasksCompleted
      }) AS skills
    ORDER BY m.id ASC
  `

  return runQuery(cypher, { limit: months * 10 }) // Approximate
}

/**
 * Calculate and store this month's skill levels
 */
export async function calculateMonthlySnapshot() {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const startOfMonth = `${yearMonth}-01T00:00:00Z`

  const cypher = `
    // Get all skills with activity this month
    MATCH (s:Skill)
    OPTIONAL MATCH (c:Commit)-[:DEMONSTRATES]->(s)
    WHERE c.timestamp >= datetime($startOfMonth)

    OPTIONAL MATCH (t:Task {status: 'completed'})-[:REQUIRES_SKILL]->(s)
    WHERE t.updatedAt >= datetime($startOfMonth)

    WITH s,
      count(DISTINCT c) AS monthlyCommits,
      count(DISTINCT t) AS monthlyTasks

    // Calculate skill level (1-10 based on activity)
    WITH s, monthlyCommits, monthlyTasks,
      CASE
        WHEN monthlyCommits >= 20 THEN 10
        WHEN monthlyCommits >= 15 THEN 9
        WHEN monthlyCommits >= 10 THEN 8
        WHEN monthlyCommits >= 7 THEN 7
        WHEN monthlyCommits >= 5 THEN 6
        WHEN monthlyCommits >= 3 THEN 5
        WHEN monthlyCommits >= 2 THEN 4
        WHEN monthlyCommits >= 1 THEN 3
        ELSE 1
      END AS level

    WHERE monthlyCommits > 0 OR monthlyTasks > 0

    // Store in monthly snapshot
    MERGE (m:Month {id: $yearMonth})
    MERGE (m)-[r:HAS_SKILL_LEVEL]->(s)
    SET r.level = level,
        r.commits = monthlyCommits,
        r.tasksCompleted = monthlyTasks,
        r.recordedAt = datetime()

    RETURN s.name AS skill, level, monthlyCommits, monthlyTasks
  `

  return runQuery(cypher, { yearMonth, startOfMonth })
}

/**
 * Compare current month to previous months
 * Shows improvement trends
 */
export async function getSkillImprovementTrend(skillName) {
  const cypher = `
    MATCH (m:Month)-[r:HAS_SKILL_LEVEL]->(s:Skill {name: $skillName})
    RETURN m.id AS month, r.level AS level, r.commits AS commits
    ORDER BY m.id ASC
    LIMIT 12
  `

  const result = await runQuery(cypher, { skillName })

  // Calculate trend
  if (result.length >= 2) {
    const first = result[0].level
    const last = result[result.length - 1].level
    const trend = last > first ? 'improving' : last < first ? 'declining' : 'stable'
    return { data: result, trend, change: last - first }
  }

  return { data: result, trend: 'insufficient_data', change: 0 }
}

/**
 * Get full monthly report for dashboard
 */
export async function getMonthlyReport(yearMonth) {
  const cypher = `
    MATCH (m:Month {id: $yearMonth})

    // Get all skill levels for this month
    OPTIONAL MATCH (m)-[r:HAS_SKILL_LEVEL]->(s:Skill)

    // Compare to previous month
    WITH m, collect({skill: s.name, level: r.level, commits: r.commits}) AS currentSkills

    OPTIONAL MATCH (prevMonth:Month)-[pr:HAS_SKILL_LEVEL]->(ps:Skill)
    WHERE prevMonth.id < m.id
    WITH m, currentSkills, max(prevMonth.id) AS prevMonthId

    OPTIONAL MATCH (pm:Month {id: prevMonthId})-[pmr:HAS_SKILL_LEVEL]->(pms:Skill)

    RETURN
      m.id AS month,
      currentSkills,
      collect({skill: pms.name, level: pmr.level}) AS previousSkills
  `

  const result = await runQuery(cypher, { yearMonth })
  return result[0] || null
}

// --------------------------------------------
// FILE IMPACT ANALYSIS - Key graph feature!
// --------------------------------------------

export async function storeFileWithDependencies(fileName, imports = []) {
  const cypher = `
    MERGE (f:File {name: $fileName})

    WITH f
    UNWIND $imports AS importName
    MERGE (imported:File {name: importName})
    MERGE (f)-[:IMPORTS]->(imported)

    WITH f
    UNWIND $skills AS skillName
    MERGE (s:Skill {name: skillName})
    MERGE (f)-[:USES_SKILL]->(s)

    RETURN f
  `

  const skills = detectSkillsFromFile(fileName)
  return runQuery(cypher, { fileName, imports, skills })
}

/**
 * IMPACT ANALYSIS - What might break if this file changes?
 * Graph traversal to find all dependent files
 */
export async function getFileImpact(fileName) {
  const cypher = `
    MATCH (f:File {name: $fileName})

    // Files that import this file (any depth)
    OPTIONAL MATCH (dependent:File)-[:IMPORTS*]->(f)

    // Recent commits to this file
    OPTIONAL MATCH (c:Commit)-[:MODIFIES]->(f)
    WHERE c.timestamp > datetime() - duration('P30D')

    // Tasks related through commits
    OPTIONAL MATCH (c)-[:IMPLEMENTS]->(t:Task)

    RETURN
      f.name AS file,
      collect(DISTINCT dependent.name) AS affectedFiles,
      count(DISTINCT c) AS recentCommits,
      collect(DISTINCT t.name) AS relatedTasks
  `

  const result = await runQuery(cypher, { fileName })
  return result[0] || { affectedFiles: [], recentCommits: 0, relatedTasks: [] }
}

// --------------------------------------------
// GAP ANALYSIS
// --------------------------------------------

export async function analyzeGaps(date) {
  const tasks = await getTasksByDate(date)

  const analysis = {
    date,
    tasks: [],
    totalPlannedTasks: tasks.length,
    completedTasks: 0,
    pendingTasks: 0,
    totalCommits: 0,
    totalFilesModified: 0,
    gaps: [],
    achievements: [],
    skillGaps: []
  }

  for (const task of tasks) {
    const commits = await getCommitsByTimeRange(
      task.startTime?.toString?.() || task.startTime,
      task.endTime?.toString?.() || task.endTime
    )

    const taskAnalysis = {
      task,
      commits,
      totalCommits: commits.length,
      hasActivity: commits.length > 0,
      isCompleted: commits.length > 0
    }

    analysis.tasks.push(taskAnalysis)
    analysis.totalCommits += commits.length

    if (taskAnalysis.isCompleted) {
      analysis.completedTasks++
      analysis.achievements.push({
        task: task.name,
        commits: commits.length,
        files: commits.flatMap(c => c.filesChanged || [])
      })
    } else {
      analysis.pendingTasks++
      analysis.gaps.push({
        task: task.name,
        reason: 'No commits found during planned time window',
        skills: task.skills || []
      })
    }
  }

  // Get skill gaps
  const knowledgeGaps = await findKnowledgeGaps()
  analysis.skillGaps = knowledgeGaps

  return analysis
}

// --------------------------------------------
// GRAPH VISUALIZATION DATA
// --------------------------------------------

export async function getFullGraph() {
  const cypher = `
    MATCH (n)
    WHERE n:Task OR n:Commit OR n:Skill OR n:File OR n:Month
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN
      labels(n)[0] AS sourceType,
      coalesce(n.name, n.id, n.hash) AS sourceName,
      type(r) AS relationship,
      labels(m)[0] AS targetType,
      coalesce(m.name, m.id, m.hash) AS targetName
    LIMIT 300
  `

  const result = await runQuery(cypher)

  const nodes = new Map()
  const edges = []

  result.forEach(r => {
    if (r.sourceName && !nodes.has(r.sourceName)) {
      nodes.set(r.sourceName, {
        id: r.sourceName,
        label: r.sourceName,
        type: r.sourceType
      })
    }

    if (r.targetName && !nodes.has(r.targetName)) {
      nodes.set(r.targetName, {
        id: r.targetName,
        label: r.targetName,
        type: r.targetType
      })
    }

    if (r.relationship && r.sourceName && r.targetName) {
      edges.push({
        source: r.sourceName,
        target: r.targetName,
        type: r.relationship
      })
    }
  })

  return {
    nodes: [...nodes.values()],
    edges
  }
}

// --------------------------------------------
// VIDEO STORAGE
// --------------------------------------------

export async function storeVideo(video) {
  const cypher = `
    CREATE (v:Video {
      id: $id,
      url: $url,
      date: date($date),
      analysis: $analysis,
      prompt: $prompt,
      createdAt: datetime()
    })
    RETURN v
  `

  return runQuery(cypher, {
    id: video.id || generateId(),
    url: video.url,
    date: video.date,
    analysis: JSON.stringify(video.analysis),
    prompt: video.prompt || ''
  })
}

export async function getVideoHistory() {
  const cypher = `
    MATCH (v:Video)
    RETURN v
    ORDER BY v.createdAt DESC
    LIMIT 20
  `

  const result = await runQuery(cypher)
  return result.map(r => {
    const video = r.v.properties
    if (typeof video.analysis === 'string') {
      try { video.analysis = JSON.parse(video.analysis) } catch (e) {}
    }
    return video
  })
}

export async function getLatestVideo() {
  const videos = await getVideoHistory()
  return videos[0] || null
}

// --------------------------------------------
// DATABASE INITIALIZATION
// --------------------------------------------

export async function initializeDatabase() {
  const queries = [
    // Constraints
    'CREATE CONSTRAINT task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE',
    'CREATE CONSTRAINT commit_hash IF NOT EXISTS FOR (c:Commit) REQUIRE c.hash IS UNIQUE',
    'CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE',
    'CREATE CONSTRAINT file_name IF NOT EXISTS FOR (f:File) REQUIRE f.name IS UNIQUE',
    'CREATE CONSTRAINT month_id IF NOT EXISTS FOR (m:Month) REQUIRE m.id IS UNIQUE',
    'CREATE CONSTRAINT video_id IF NOT EXISTS FOR (v:Video) REQUIRE v.id IS UNIQUE',

    // Indexes
    'CREATE INDEX task_status IF NOT EXISTS FOR (t:Task) ON (t.status)',
    'CREATE INDEX task_time IF NOT EXISTS FOR (t:Task) ON (t.startTime)',
    'CREATE INDEX commit_time IF NOT EXISTS FOR (c:Commit) ON (c.timestamp)',

    // Base skills with prerequisites (demonstrates graph relationships!)
    `
    MERGE (js:Skill {name: 'javascript'})
    MERGE (ts:Skill {name: 'typescript'})
    MERGE (react:Skill {name: 'react'})
    MERGE (node:Skill {name: 'nodejs'})
    MERGE (api:Skill {name: 'api'})
    MERGE (db:Skill {name: 'database'})
    MERGE (neo:Skill {name: 'neo4j'})
    MERGE (auth:Skill {name: 'authentication'})
    MERGE (test:Skill {name: 'testing'})
    MERGE (css:Skill {name: 'css'})

    // Skill prerequisites - this is WHY we use a graph!
    MERGE (js)-[:PREREQUISITE_OF]->(ts)
    MERGE (js)-[:PREREQUISITE_OF]->(react)
    MERGE (js)-[:PREREQUISITE_OF]->(node)
    MERGE (db)-[:PREREQUISITE_OF]->(neo)
    MERGE (node)-[:PREREQUISITE_OF]->(api)
    MERGE (api)-[:PREREQUISITE_OF]->(auth)
    MERGE (react)-[:PREREQUISITE_OF]->(test)
    `
  ]

  for (const query of queries) {
    try {
      await runQuery(query)
    } catch (error) {
      // Constraints may already exist
    }
  }

  console.log('✅ Neo4j database initialized with graph schema')
}

// --------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}

/**
 * Convert Neo4j DateTime to ISO string
 * Neo4j returns datetime as objects with year, month, day, hour, etc.
 */
function convertNeo4jDateTime(dt) {
  if (!dt) return null
  if (typeof dt === 'string') return dt

  // Handle Neo4j DateTime object
  if (dt.year && dt.month && dt.day) {
    const year = dt.year.low ?? dt.year
    const month = String(dt.month.low ?? dt.month).padStart(2, '0')
    const day = String(dt.day.low ?? dt.day).padStart(2, '0')
    const hour = String(dt.hour?.low ?? dt.hour ?? 0).padStart(2, '0')
    const minute = String(dt.minute?.low ?? dt.minute ?? 0).padStart(2, '0')
    const second = String(dt.second?.low ?? dt.second ?? 0).padStart(2, '0')

    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
  }

  // Try to convert if it has toString
  if (dt.toString) return dt.toString()

  return null
}

/**
 * Convert all Neo4j DateTime fields in task properties
 */
function convertTaskProperties(props) {
  if (!props) return null

  return {
    ...props,
    id: props.id,
    name: props.name,
    description: props.description,
    status: props.status,
    startTime: convertNeo4jDateTime(props.startTime),
    endTime: convertNeo4jDateTime(props.endTime),
    createdAt: convertNeo4jDateTime(props.createdAt),
    updatedAt: convertNeo4jDateTime(props.updatedAt),
    lastActivity: convertNeo4jDateTime(props.lastActivity),
    keywords: props.keywords || []
  }
}

/**
 * Convert all Neo4j DateTime fields in commit properties
 */
function convertCommitProperties(props) {
  if (!props) return null

  return {
    ...props,
    hash: props.hash,
    message: props.message,
    branch: props.branch,
    timestamp: convertNeo4jDateTime(props.timestamp),
    createdAt: convertNeo4jDateTime(props.createdAt),
    filesChanged: props.filesChanged || [],
    additions: props.additions?.low ?? props.additions ?? 0,
    deletions: props.deletions?.low ?? props.deletions ?? 0
  }
}

function extractSkills(text) {
  if (!text) return []

  const skillPatterns = {
    'react': /react|jsx|component|hook|useState|useEffect/i,
    'css': /css|style|tailwind|sass|scss/i,
    'typescript': /typescript|\.ts|type\s|interface\s/i,
    'javascript': /javascript|\.js|function|const|let|var/i,
    'nodejs': /node|express|api|server|endpoint/i,
    'database': /database|db|sql|query|schema|model/i,
    'neo4j': /neo4j|cypher|graph|relationship/i,
    'authentication': /auth|login|password|jwt|token|session/i,
    'testing': /test|spec|jest|mocha|assert|expect/i,
    'api': /api|rest|graphql|fetch|axios|endpoint/i,
  }

  const skills = []
  for (const [skill, pattern] of Object.entries(skillPatterns)) {
    if (pattern.test(text)) skills.push(skill)
  }

  return skills
}

function detectSkillsFromFile(fileName) {
  const skills = []

  if (/\.(jsx?|tsx?)$/.test(fileName)) skills.push('javascript')
  if (/\.tsx?$/.test(fileName)) skills.push('typescript')
  if (/\.(jsx|tsx)$/.test(fileName)) skills.push('react')
  if (/\.css$/.test(fileName)) skills.push('css')
  if (/\.(test|spec)\./i.test(fileName)) skills.push('testing')
  if (/api/i.test(fileName)) skills.push('api')
  if (/auth/i.test(fileName)) skills.push('authentication')
  if (/\.cypher$/.test(fileName)) skills.push('neo4j')

  return skills
}

export { generateId, extractSkills, detectSkillsFromFile, convertNeo4jDateTime, convertTaskProperties, convertCommitProperties }
