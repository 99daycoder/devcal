'use client'

// ============================================
// LEARNING JOURNAL COMPONENT
// ============================================
// Weekly summary of knowledge gaps and
// learning recommendations based on your
// coding patterns and incomplete tasks

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

export default function LearningJournal({ tasks = [], commits = [], onGenerateWeeklyVideo }) {
  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = current week, -1 = last week
  const [isGenerating, setIsGenerating] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(null)

  // Calculate week dates
  const getWeekDates = (weekOffset) => {
    const now = new Date()
    const targetDate = subWeeks(now, -weekOffset)
    return {
      start: startOfWeek(targetDate, { weekStartsOn: 1 }), // Monday
      end: endOfWeek(targetDate, { weekStartsOn: 1 })
    }
  }

  const weekDates = getWeekDates(selectedWeek)

  // Analyze the week's data
  useEffect(() => {
    const report = analyzeWeek(tasks, commits, weekDates)
    setWeeklyReport(report)
  }, [tasks, commits, selectedWeek])

  // Generate weekly video
  const handleGenerateVideo = async () => {
    setIsGenerating(true)
    try {
      await onGenerateWeeklyVideo?.(weeklyReport)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="holo-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-xl font-bold neon-text"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Learning Journal
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Weekly knowledge gap analysis
          </p>
        </div>

        {/* Week selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedWeek(Math.min(0, selectedWeek + 1))}
            disabled={selectedWeek >= 0}
            className="px-3 py-2 rounded-lg bg-space-dark border border-neon-blue/30 disabled:opacity-30"
          >
            ←
          </button>
          <div className="px-4 py-2 rounded-lg bg-space-dark border border-neon-blue/30 text-center min-w-[200px]">
            <div className="text-sm font-medium">
              {format(weekDates.start, 'MMM d')} - {format(weekDates.end, 'MMM d, yyyy')}
            </div>
            <div className="text-xs text-gray-400">
              {selectedWeek === 0 ? 'This Week' : `${-selectedWeek} week(s) ago`}
            </div>
          </div>
          <button
            onClick={() => setSelectedWeek(selectedWeek - 1)}
            className="px-3 py-2 rounded-lg bg-space-dark border border-neon-blue/30"
          >
            →
          </button>
        </div>
      </div>

      {/* Weekly Stats */}
      {weeklyReport && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon="📋"
              label="Tasks Planned"
              value={weeklyReport.totalTasks}
              color="text-neon-blue"
            />
            <StatCard
              icon="✅"
              label="Completed"
              value={weeklyReport.completedTasks}
              color="text-neon-green"
            />
            <StatCard
              icon="⚠️"
              label="Incomplete"
              value={weeklyReport.incompleteTasks}
              color="text-alibaba-orange"
            />
            <StatCard
              icon="💾"
              label="Commits"
              value={weeklyReport.totalCommits}
              color="text-neon-purple"
            />
          </div>

          {/* Knowledge Gaps */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <span>📚</span> Knowledge Gaps Identified
            </h3>

            {weeklyReport.knowledgeGaps.length === 0 ? (
              <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center">
                <span className="text-2xl">🎉</span>
                <p className="mt-2 text-neon-green">No significant knowledge gaps this week!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyReport.knowledgeGaps.map((gap, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      gap.severity === 'high'
                        ? 'bg-red-500/10 border-red-500/30'
                        : gap.severity === 'medium'
                        ? 'bg-alibaba-orange/10 border-alibaba-orange/30'
                        : 'bg-neon-blue/10 border-neon-blue/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${
                            gap.severity === 'high' ? 'bg-red-500/30 text-red-300' :
                            gap.severity === 'medium' ? 'bg-alibaba-orange/30 text-alibaba-orange' :
                            'bg-neon-blue/30 text-neon-blue'
                          }`}>
                            {gap.severity}
                          </span>
                          <span className="font-medium">{gap.area}</span>
                        </div>
                        <p className="text-sm text-gray-400">{gap.description}</p>
                      </div>
                      {gap.hoursNeeded && (
                        <div className="text-right text-sm">
                          <div className="text-gray-400">Est. learning time</div>
                          <div className="font-bold text-neon-blue">{gap.hoursNeeded}h</div>
                        </div>
                      )}
                    </div>

                    {/* Learning resources */}
                    {gap.resources && gap.resources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-gray-500 mb-2">Suggested resources:</p>
                        <div className="flex flex-wrap gap-2">
                          {gap.resources.map((resource, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 rounded bg-space-dark text-xs text-gray-300"
                            >
                              {resource}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills Progress */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <span>📈</span> Skills This Week
            </h3>
            <div className="space-y-3">
              {weeklyReport.skillsWorkedOn.map((skill, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-gray-300">{skill.name}</div>
                  <div className="flex-1 h-2 bg-space-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-blue to-neon-green"
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-right text-gray-400">
                    {skill.commits} commits
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Recommendations */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <span>💡</span> Recommendations for Next Week
            </h3>
            <div className="space-y-2">
              {weeklyReport.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-space-dark/50"
                >
                  <span className="text-lg">{rec.icon}</span>
                  <div>
                    <p className="text-sm text-gray-300">{rec.text}</p>
                    {rec.actionable && (
                      <p className="text-xs text-neon-blue mt-1">{rec.actionable}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Weekly Video Button */}
          <button
            onClick={handleGenerateVideo}
            disabled={isGenerating}
            className="w-full neon-button py-4 rounded-lg font-semibold flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <span className="loading-spinner w-5 h-5" />
                Generating Weekly Summary Video...
              </>
            ) : (
              <>
                <span className="text-xl">🎬</span>
                Generate Weekly Learning Video
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// Stat card component
function StatCard({ icon, label, value, color }) {
  return (
    <div className="p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}

// Analyze week's data
function analyzeWeek(tasks, commits, weekDates) {
  // Filter tasks for this week
  const weekTasks = tasks.filter(task => {
    const taskDate = new Date(task.startTime)
    return taskDate >= weekDates.start && taskDate <= weekDates.end
  })

  // Filter commits for this week
  const weekCommits = commits.filter(commit => {
    const commitDate = new Date(commit.timestamp)
    return commitDate >= weekDates.start && commitDate <= weekDates.end
  })

  const completedTasks = weekTasks.filter(t => t.status === 'completed').length
  const incompleteTasks = weekTasks.filter(t => t.status !== 'completed').length

  // Analyze knowledge gaps
  const knowledgeGaps = []

  // Find incomplete tasks as gaps
  weekTasks.filter(t => t.status !== 'completed').forEach(task => {
    knowledgeGaps.push({
      area: task.name,
      severity: 'high',
      description: `Task not completed: "${task.name}"`,
      hoursNeeded: 2,
      resources: ['Break into smaller tasks', 'Review requirements', 'Ask for help']
    })
  })

  // Analyze commit patterns for skill gaps
  const fileTypes = {}
  weekCommits.forEach(commit => {
    (commit.filesChanged || []).forEach(file => {
      const ext = file.split('.').pop()
      fileTypes[ext] = (fileTypes[ext] || 0) + 1
    })
  })

  // Check for missing test coverage
  const hasTests = Object.keys(fileTypes).some(ext =>
    ext.includes('test') || ext.includes('spec')
  )
  if (!hasTests && weekCommits.length > 5) {
    knowledgeGaps.push({
      area: 'Testing',
      severity: 'medium',
      description: 'No test files modified this week. Consider learning testing patterns.',
      hoursNeeded: 4,
      resources: ['Jest documentation', 'Testing best practices', 'TDD tutorial']
    })
  }

  // Skills worked on
  const skillsWorkedOn = Object.entries(fileTypes)
    .map(([ext, count]) => ({
      name: getSkillName(ext),
      commits: count,
      progress: Math.min(100, count * 20)
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5)

  // Recommendations
  const recommendations = [
    {
      icon: '🎯',
      text: incompleteTasks > 0
        ? `Focus on completing ${incompleteTasks} pending task(s) first`
        : 'Great job completing all tasks! Challenge yourself with something new',
      actionable: incompleteTasks > 0 ? 'Start with the oldest pending task' : null
    },
    {
      icon: '📝',
      text: 'Document your learnings from this week',
      actionable: 'Spend 15 minutes writing notes'
    },
    {
      icon: '🔄',
      text: 'Review and refactor code from earlier in the week',
      actionable: 'Fresh eyes catch more issues'
    }
  ]

  if (!hasTests) {
    recommendations.unshift({
      icon: '🧪',
      text: 'Add tests to your recent code changes',
      actionable: 'Start with the most critical functions'
    })
  }

  return {
    totalTasks: weekTasks.length,
    completedTasks,
    incompleteTasks,
    totalCommits: weekCommits.length,
    completionRate: weekTasks.length > 0
      ? Math.round((completedTasks / weekTasks.length) * 100)
      : 0,
    knowledgeGaps,
    skillsWorkedOn,
    recommendations,
    weekDates
  }
}

// Get skill name from file extension
function getSkillName(ext) {
  const skillMap = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'jsx': 'React',
    'tsx': 'React + TS',
    'css': 'CSS',
    'scss': 'SASS',
    'py': 'Python',
    'java': 'Java',
    'go': 'Go',
    'rs': 'Rust',
    'sql': 'SQL',
    'json': 'Configuration',
    'md': 'Documentation',
    'yml': 'DevOps',
    'yaml': 'DevOps'
  }
  return skillMap[ext] || ext.toUpperCase()
}
