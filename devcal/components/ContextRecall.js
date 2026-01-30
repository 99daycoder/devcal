'use client'

// ============================================
// CONTEXT RECALL COMPONENT
// ============================================
// "Developer Memory Platform" - The killer feature
// Shows what you were working on, your skills,
// blocked tasks, and exports context for AI assistants

import { useState, useEffect, useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'

export default function ContextRecall({ isOpen, onClose, tasks, commits }) {
  const [contextData, setContextData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  // Fetch context data from graph API
  useEffect(() => {
    if (isOpen) {
      fetchContextData()
    }
  }, [isOpen])

  const fetchContextData = async () => {
    setIsLoading(true)
    try {
      // Fetch graph data
      const [graphRes, monthlyRes] = await Promise.all([
        fetch('/api/graph?type=overview'),
        fetch('/api/monthly')
      ])

      const graphData = await graphRes.json()
      const monthlyData = await monthlyRes.json()

      setContextData({
        graph: graphData.data,
        monthly: monthlyData,
        fetchedAt: new Date()
      })
    } catch (error) {
      console.error('Error fetching context:', error)
      // Use computed data from props as fallback
      setContextData({
        graph: null,
        monthly: null,
        fetchedAt: new Date()
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Compute context from tasks and commits
  const computedContext = useMemo(() => {
    if (!tasks) return null

    const now = new Date()

    // Find last active task (most recent with activity)
    const tasksWithActivity = tasks
      .filter(t => t.lastActivity || t.status === 'in_progress')
      .sort((a, b) => {
        const aTime = a.lastActivity ? new Date(a.lastActivity) : new Date(a.startTime)
        const bTime = b.lastActivity ? new Date(b.lastActivity) : new Date(b.startTime)
        return bTime - aTime
      })

    const lastActiveTask = tasksWithActivity[0] || tasks.find(t => t.status === 'in_progress')

    // Find stale tasks
    const staleTasks = tasks.filter(t => {
      if (t.status === 'completed') return false
      if (t.isStale) return true
      const startTime = new Date(t.startTime)
      if (startTime > now) return false
      const lastActivity = t.lastActivity ? new Date(t.lastActivity) : startTime
      const hoursSince = (now - lastActivity) / (1000 * 60 * 60)
      return hoursSince >= 2
    })

    // Find pending tasks
    const pendingTasks = tasks.filter(t => t.status === 'pending' && !t.isStale)

    // Find completed tasks
    const completedTasks = tasks.filter(t => t.status === 'completed')

    // Extract skills from tasks
    const skillMap = new Map()
    tasks.forEach(task => {
      const keywords = task.keywords || []
      keywords.forEach(kw => {
        const existing = skillMap.get(kw) || { count: 0, completed: 0 }
        existing.count++
        if (task.status === 'completed') existing.completed++
        skillMap.set(kw, existing)
      })
    })

    const skills = Array.from(skillMap.entries())
      .map(([name, data]) => ({
        name,
        level: Math.min(10, Math.round((data.completed / Math.max(data.count, 1)) * 10)),
        taskCount: data.count,
        completedCount: data.completed
      }))
      .sort((a, b) => b.level - a.level)
      .slice(0, 8)

    // Calculate time since last activity
    let lastActivityTime = null
    let hoursSinceActivity = 0
    if (lastActiveTask) {
      lastActivityTime = lastActiveTask.lastActivity
        ? new Date(lastActiveTask.lastActivity)
        : new Date(lastActiveTask.startTime)
      hoursSinceActivity = Math.round((now - lastActivityTime) / (1000 * 60 * 60))
    }

    // Blocked tasks (tasks that depend on incomplete tasks)
    const blockedTasks = tasks.filter(t => {
      if (t.status === 'completed') return false
      const deps = t.dependencies || []
      return deps.some(depId => {
        const depTask = tasks.find(dt => dt.id === depId)
        return depTask && depTask.status !== 'completed'
      })
    })

    // Knowledge gaps (skills with low completion)
    const knowledgeGaps = skills
      .filter(s => s.level < 5 && s.taskCount > 0)
      .map(s => ({
        skill: s.name,
        gap: `Only ${s.completedCount}/${s.taskCount} tasks completed`,
        level: s.level
      }))

    return {
      lastActiveTask,
      lastActivityTime,
      hoursSinceActivity,
      staleTasks,
      pendingTasks,
      completedTasks,
      skills,
      blockedTasks,
      knowledgeGaps,
      totalTasks: tasks.length,
      completionRate: tasks.length > 0
        ? Math.round((completedTasks.length / tasks.length) * 100)
        : 0
    }
  }, [tasks])

  // Generate export text for AI assistants
  const generateExportText = () => {
    if (!computedContext) return ''

    const ctx = computedContext
    const lines = [
      '# Developer Context for AI Assistant',
      `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      '',
      '## Current Status',
      `- Last activity: ${ctx.hoursSinceActivity} hours ago`,
      ctx.lastActiveTask ? `- Last task: "${ctx.lastActiveTask.name}"` : '- No recent task activity',
      `- Completion rate: ${ctx.completionRate}%`,
      '',
      '## Task Summary',
      `- Total tasks: ${ctx.totalTasks}`,
      `- Completed: ${ctx.completedTasks.length}`,
      `- Pending: ${ctx.pendingTasks.length}`,
      `- Stale (needs attention): ${ctx.staleTasks.length}`,
      '',
      '## Skills Being Developed',
      ...ctx.skills.slice(0, 5).map(s => `- ${s.name}: Level ${s.level}/10 (${s.completedCount}/${s.taskCount} tasks)`),
      '',
      '## Stale Tasks (No Recent Activity)',
      ...(ctx.staleTasks.length > 0
        ? ctx.staleTasks.map(t => `- "${t.name}" - ${t.description || 'No description'}`)
        : ['- None']),
      '',
      '## Knowledge Gaps',
      ...(ctx.knowledgeGaps.length > 0
        ? ctx.knowledgeGaps.map(g => `- ${g.skill}: ${g.gap}`)
        : ['- No significant gaps detected']),
      '',
      '## Recommended Next Actions',
      ctx.staleTasks.length > 0 ? `1. Address stale task: "${ctx.staleTasks[0]?.name}"` : '1. Continue with current tasks',
      ctx.knowledgeGaps.length > 0 ? `2. Improve skill: ${ctx.knowledgeGaps[0]?.skill}` : '2. Maintain current momentum',
      '3. Review blocked tasks and resolve dependencies',
      '',
      '---',
      'Use this context to help the developer continue their work effectively.',
    ]

    return lines.join('\n')
  }

  // Copy to clipboard
  const handleCopyContext = async () => {
    const text = generateExportText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isOpen) return null

  const ctx = computedContext

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 lightbox-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="relative holo-panel p-8 w-full max-w-4xl mx-4 modal-enter max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-2xl font-bold neon-text flex items-center gap-3"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              <span className="text-3xl">🧠</span>
              Context Recall
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Your developer memory - what you were working on
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner w-12 h-12" />
          </div>
        ) : ctx ? (
          <>
            {/* Time Since Activity Banner */}
            <div className={`mb-6 p-4 rounded-lg border ${
              ctx.hoursSinceActivity > 4
                ? 'bg-red-500/10 border-red-500/30'
                : ctx.hoursSinceActivity > 2
                ? 'bg-alibaba-orange/10 border-alibaba-orange/30'
                : 'bg-neon-green/10 border-neon-green/30'
            }`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">
                  {ctx.hoursSinceActivity > 4 ? '😴' : ctx.hoursSinceActivity > 2 ? '⏰' : '🔥'}
                </span>
                <div>
                  <p className="font-semibold text-lg">
                    {ctx.hoursSinceActivity > 0
                      ? `${ctx.hoursSinceActivity} hours since last activity`
                      : 'Recently active'}
                  </p>
                  {ctx.lastActiveTask && (
                    <p className="text-sm text-gray-400">
                      Last working on: <span className="text-white">{ctx.lastActiveTask.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'overview', label: '📊 Overview' },
                { key: 'skills', label: '💪 Skills' },
                { key: 'tasks', label: '📋 Tasks' },
                { key: 'export', label: '📤 Export for AI' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeSection === key
                      ? 'bg-neon-blue/30 border border-neon-blue text-white'
                      : 'bg-space-dark/50 border border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <StatBox
                    icon="📋"
                    value={ctx.totalTasks}
                    label="Total Tasks"
                    color="text-neon-blue"
                  />
                  <StatBox
                    icon="✅"
                    value={ctx.completedTasks.length}
                    label="Completed"
                    color="text-neon-green"
                  />
                  <StatBox
                    icon="🔴"
                    value={ctx.staleTasks.length}
                    label="Stale"
                    color="text-red-500"
                  />
                  <StatBox
                    icon="📈"
                    value={`${ctx.completionRate}%`}
                    label="Completion"
                    color="text-alibaba-orange"
                  />
                </div>

                {/* Last Active Task */}
                {ctx.lastActiveTask && (
                  <div className="p-4 rounded-lg bg-space-dark/50 border border-neon-blue/30">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>🎯</span> Last Active Task
                    </h3>
                    <div className="p-3 rounded bg-neon-blue/10 border border-neon-blue/20">
                      <p className="font-medium">{ctx.lastActiveTask.name}</p>
                      {ctx.lastActiveTask.description && (
                        <p className="text-sm text-gray-400 mt-1">{ctx.lastActiveTask.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Status: <span className="text-neon-blue">{ctx.lastActiveTask.status}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Knowledge Gaps */}
                {ctx.knowledgeGaps.length > 0 && (
                  <div className="p-4 rounded-lg bg-alibaba-orange/10 border border-alibaba-orange/30">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <span>📚</span> Knowledge Gaps to Address
                    </h3>
                    <div className="space-y-2">
                      {ctx.knowledgeGaps.slice(0, 3).map((gap, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-space-dark/50">
                          <span className="capitalize">{gap.skill}</span>
                          <span className="text-sm text-gray-400">{gap.gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Skills Section */}
            {activeSection === 'skills' && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <span>💪</span> Skills You're Building
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {ctx.skills.map((skill, i) => (
                    <div key={i} className="p-3 rounded-lg bg-space-dark/50 border border-neon-blue/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="capitalize font-medium">{skill.name}</span>
                        <span className="text-neon-blue">Level {skill.level}</span>
                      </div>
                      <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-neon-blue to-neon-green transition-all"
                          style={{ width: `${skill.level * 10}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {skill.completedCount}/{skill.taskCount} tasks completed
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks Section */}
            {activeSection === 'tasks' && (
              <div className="space-y-4">
                {/* Stale Tasks */}
                {ctx.staleTasks.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-400">
                      <span>🔴</span> Stale Tasks (Need Attention)
                    </h3>
                    <div className="space-y-2">
                      {ctx.staleTasks.map((task, i) => (
                        <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                          <p className="font-medium">{task.name}</p>
                          {task.description && (
                            <p className="text-sm text-gray-400">{task.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Tasks */}
                {ctx.pendingTasks.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-alibaba-orange">
                      <span>⏳</span> Pending Tasks
                    </h3>
                    <div className="space-y-2">
                      {ctx.pendingTasks.slice(0, 5).map((task, i) => (
                        <div key={i} className="p-3 rounded-lg bg-alibaba-orange/10 border border-alibaba-orange/30">
                          <p className="font-medium">{task.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-neon-green">
                    <span>✅</span> Recently Completed
                  </h3>
                  <div className="space-y-2">
                    {ctx.completedTasks.slice(0, 3).map((task, i) => (
                      <div key={i} className="p-3 rounded-lg bg-neon-green/10 border border-neon-green/30">
                        <p className="font-medium">{task.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Export Section */}
            {activeSection === 'export' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <span>📤</span> Export Context for AI Assistant
                    </h3>
                    <p className="text-sm text-gray-400">
                      Copy this context and paste it into Claude, ChatGPT, or any AI assistant
                    </p>
                  </div>
                  <button
                    onClick={handleCopyContext}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition ${
                      copied
                        ? 'bg-neon-green/30 border border-neon-green text-neon-green'
                        : 'neon-button'
                    }`}
                  >
                    {copied ? (
                      <>
                        <span>✓</span> Copied!
                      </>
                    ) : (
                      <>
                        <span>📋</span> Copy Context
                      </>
                    )}
                  </button>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg bg-space-dark border border-neon-blue/20 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {generateExportText()}
                  </pre>
                </div>

                {/* Usage Tips */}
                <div className="p-4 rounded-lg bg-neon-purple/10 border border-neon-purple/30">
                  <h4 className="font-semibold mb-2">💡 How to Use</h4>
                  <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Click "Copy Context" above</li>
                    <li>Open Claude, ChatGPT, or your AI assistant</li>
                    <li>Paste the context and ask: "Help me continue where I left off"</li>
                    <li>The AI will understand your project state and skills</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p>No context data available. Add some tasks first!</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-neon-blue/20 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Powered by Neo4j Knowledge Graph
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-600/50 hover:bg-gray-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Stat box component
function StatBox({ icon, value, label, color }) {
  return (
    <div className="p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
