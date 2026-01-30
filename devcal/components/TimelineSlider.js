'use client'

// ============================================
// TIMELINE SLIDER COMPONENT
// ============================================
// Interactive timeline that shows feature evolution
// Connects to Neo4j to show what was done when
// Includes bug tracking and knowledge gap analysis

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, differenceInHours } from 'date-fns'

export default function TimelineSlider({
  commits = [],
  tasks = [],
  onTimeChange,
  selectedDate
}) {
  // Current position on timeline (0-100)
  const [sliderValue, setSliderValue] = useState(100)

  // What to show at current position
  const [timelineData, setTimelineData] = useState(null)

  // View mode: overview, bugs, knowledge-gap
  const [viewMode, setViewMode] = useState('overview')

  // Process all commits and tasks into timeline events
  const timelineEvents = useMemo(() => {
    const events = []

    // Add commits as events
    commits.forEach(commit => {
      events.push({
        type: 'commit',
        timestamp: commit.timestamp,
        data: commit,
        // Detect if this might be a bug fix
        isBugFix: /fix|bug|error|issue|crash|broken/i.test(commit.message),
        // Detect feature additions
        isFeature: /add|feature|implement|create|new/i.test(commit.message),
        // Detect removals
        isRemoval: /remove|delete|deprecate/i.test(commit.message),
        // Detect refactoring
        isRefactor: /refactor|clean|improve|optimize/i.test(commit.message)
      })
    })

    // Add tasks as events
    tasks.forEach(task => {
      events.push({
        type: 'task',
        timestamp: task.startTime,
        data: task
      })
    })

    // Sort by timestamp
    events.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return events
  }, [commits, tasks])

  // Calculate timeline stats at current position
  const currentStats = useMemo(() => {
    if (timelineEvents.length === 0) {
      return {
        featuresAdded: 0,
        featuresRemoved: 0,
        bugsFaced: 0,
        bugsFixed: 0,
        totalCommits: 0,
        totalTasks: 0,
        filesModified: new Set(),
        knowledgeGaps: []
      }
    }

    // Get events up to current slider position
    const cutoffIndex = Math.floor((sliderValue / 100) * timelineEvents.length)
    const visibleEvents = timelineEvents.slice(0, cutoffIndex + 1)

    const stats = {
      featuresAdded: 0,
      featuresRemoved: 0,
      bugsFaced: 0,
      bugsFixed: 0,
      totalCommits: 0,
      totalTasks: 0,
      filesModified: new Set(),
      knowledgeGaps: [],
      recentActivity: [],
      filesByType: {}
    }

    visibleEvents.forEach(event => {
      if (event.type === 'commit') {
        stats.totalCommits++

        if (event.isFeature) stats.featuresAdded++
        if (event.isRemoval) stats.featuresRemoved++
        if (event.isBugFix) stats.bugsFixed++

        // Track files
        (event.data.filesChanged || []).forEach(file => {
          stats.filesModified.add(file)
          const ext = file.split('.').pop()
          stats.filesByType[ext] = (stats.filesByType[ext] || 0) + 1
        })

        // Add to recent activity
        stats.recentActivity.unshift({
          type: event.isBugFix ? 'bugfix' : event.isFeature ? 'feature' : 'commit',
          message: event.data.message,
          timestamp: event.timestamp,
          files: event.data.filesChanged || []
        })
      } else if (event.type === 'task') {
        stats.totalTasks++
      }
    })

    // Keep only 5 most recent activities
    stats.recentActivity = stats.recentActivity.slice(0, 5)

    // Analyze knowledge gaps
    stats.knowledgeGaps = analyzeKnowledgeGaps(visibleEvents, tasks)

    return stats
  }, [timelineEvents, sliderValue, tasks])

  // Handle slider change
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value)
    setSliderValue(value)

    // Get timestamp at this position
    if (timelineEvents.length > 0) {
      const eventIndex = Math.floor((value / 100) * (timelineEvents.length - 1))
      const event = timelineEvents[eventIndex]
      if (event && onTimeChange) {
        onTimeChange(new Date(event.timestamp))
      }
    }
  }

  // Get current time label
  const getCurrentTimeLabel = () => {
    if (timelineEvents.length === 0) return 'No data'

    const eventIndex = Math.floor((sliderValue / 100) * (timelineEvents.length - 1))
    const event = timelineEvents[Math.max(0, eventIndex)]

    if (!event) return 'Start'

    return format(parseISO(event.timestamp), 'MMM d, h:mm a')
  }

  return (
    <div className="holo-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-xl font-bold neon-text"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          Development Timeline
        </h2>

        {/* View mode toggle */}
        <div className="flex gap-2">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'bugs', label: '🐛 Bugs' },
            { key: 'knowledge-gap', label: '📚 Knowledge Gaps' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                viewMode === key
                  ? 'bg-neon-blue/30 border border-neon-blue'
                  : 'bg-space-dark/50 hover:bg-space-dark border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
          <span>Start</span>
          <span className="text-neon-blue font-semibold">{getCurrentTimeLabel()}</span>
          <span>Now</span>
        </div>

        {/* Custom slider track */}
        <div className="relative h-3 bg-space-dark rounded-full overflow-hidden">
          {/* Event markers */}
          {timelineEvents.map((event, index) => {
            const position = (index / (timelineEvents.length - 1)) * 100
            return (
              <div
                key={index}
                className={`absolute top-0 w-1 h-full ${
                  event.isBugFix ? 'bg-red-500' :
                  event.isFeature ? 'bg-neon-green' :
                  event.isRemoval ? 'bg-alibaba-orange' :
                  'bg-neon-blue/50'
                }`}
                style={{ left: `${position}%` }}
                title={event.type === 'commit' ? event.data.message : event.data.name}
              />
            )
          })}

          {/* Progress fill */}
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-blue to-neon-purple opacity-50"
            style={{ width: `${sliderValue}%` }}
          />
        </div>

        {/* Actual slider input */}
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full h-8 -mt-5 opacity-0 cursor-pointer relative z-10"
        />

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-green" />
            Feature
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Bug Fix
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-alibaba-orange" />
            Removal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-blue" />
            Other
          </span>
        </div>
      </div>

      {/* Stats Display - changes based on view mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="✨"
            label="Features Added"
            value={currentStats.featuresAdded}
            color="text-neon-green"
          />
          <StatCard
            icon="🗑️"
            label="Features Removed"
            value={currentStats.featuresRemoved}
            color="text-alibaba-orange"
          />
          <StatCard
            icon="🛠️"
            label="Bugs Fixed"
            value={currentStats.bugsFixed}
            color="text-red-400"
          />
          <StatCard
            icon="📁"
            label="Files Modified"
            value={currentStats.filesModified.size}
            color="text-neon-blue"
          />
        </div>
      )}

      {viewMode === 'bugs' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-300">Bug Fixes Timeline</h3>
          {currentStats.recentActivity
            .filter(a => a.type === 'bugfix')
            .length === 0 ? (
            <p className="text-gray-400 text-sm">No bug fixes detected in this range</p>
          ) : (
            currentStats.recentActivity
              .filter(a => a.type === 'bugfix')
              .map((activity, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>🐛</span>
                    <span className="font-medium">{activity.message}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(parseISO(activity.timestamp), 'MMM d, h:mm a')}
                  </div>
                  {activity.files.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Files: {activity.files.join(', ')}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}

      {viewMode === 'knowledge-gap' && (
        <KnowledgeGapReport gaps={currentStats.knowledgeGaps} filesByType={currentStats.filesByType} />
      )}

      {/* Recent Activity */}
      {viewMode === 'overview' && currentStats.recentActivity.length > 0 && (
        <div className="mt-6 pt-6 border-t border-neon-blue/20">
          <h3 className="font-semibold text-gray-300 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {currentStats.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-space-dark/50"
              >
                <span className="text-lg">
                  {activity.type === 'bugfix' ? '🐛' :
                   activity.type === 'feature' ? '✨' : '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{activity.message}</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(activity.timestamp), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
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

// Knowledge gap analysis
function analyzeKnowledgeGaps(events, tasks) {
  const gaps = []

  // Find tasks without matching commits
  const uncommittedTasks = tasks.filter(task => {
    const taskKeywords = extractKeywords(task.name + ' ' + (task.description || ''))
    const hasMatchingCommit = events.some(event => {
      if (event.type !== 'commit') return false
      const commitKeywords = extractKeywords(event.data.message)
      return taskKeywords.some(tk =>
        commitKeywords.some(ck =>
          ck.includes(tk) || tk.includes(ck)
        )
      )
    })
    return !hasMatchingCommit
  })

  uncommittedTasks.forEach(task => {
    gaps.push({
      type: 'incomplete_task',
      title: task.name,
      suggestion: `Consider completing the "${task.name}" task or breaking it into smaller steps`,
      priority: 'high'
    })
  })

  // Analyze file types to suggest learning areas
  const fileTypes = {}
  events.forEach(event => {
    if (event.type === 'commit') {
      (event.data.filesChanged || []).forEach(file => {
        const ext = file.split('.').pop()
        fileTypes[ext] = (fileTypes[ext] || 0) + 1
      })
    }
  })

  // Find underrepresented areas
  const totalFiles = Object.values(fileTypes).reduce((a, b) => a + b, 0)
  if (totalFiles > 0) {
    // If tests are < 10% of changes, suggest more testing
    const testFiles = (fileTypes['test.js'] || 0) + (fileTypes['spec.js'] || 0) + (fileTypes['test.ts'] || 0)
    if (testFiles / totalFiles < 0.1) {
      gaps.push({
        type: 'testing',
        title: 'Test Coverage',
        suggestion: 'Consider adding more unit tests to improve code reliability',
        priority: 'medium'
      })
    }

    // If no documentation changes
    const docFiles = (fileTypes['md'] || 0) + (fileTypes['txt'] || 0)
    if (docFiles === 0 && totalFiles > 5) {
      gaps.push({
        type: 'documentation',
        title: 'Documentation',
        suggestion: 'Consider documenting recent changes for future reference',
        priority: 'low'
      })
    }
  }

  return gaps
}

// Extract keywords from text
function extractKeywords(text) {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
}

// Knowledge Gap Report Component
function KnowledgeGapReport({ gaps, filesByType }) {
  return (
    <div className="space-y-6">
      {/* Gap analysis */}
      <div>
        <h3 className="font-semibold text-gray-300 mb-4">Knowledge Gap Analysis</h3>

        {gaps.length === 0 ? (
          <div className="p-4 rounded-lg bg-neon-green/10 border border-neon-green/30 text-center">
            <span className="text-2xl">✅</span>
            <p className="mt-2 text-neon-green">No knowledge gaps detected. Great work!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  gap.priority === 'high'
                    ? 'bg-red-500/10 border-red-500/30'
                    : gap.priority === 'medium'
                    ? 'bg-alibaba-orange/10 border-alibaba-orange/30'
                    : 'bg-neon-blue/10 border-neon-blue/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs uppercase ${
                    gap.priority === 'high' ? 'bg-red-500/30 text-red-300' :
                    gap.priority === 'medium' ? 'bg-alibaba-orange/30 text-alibaba-orange' :
                    'bg-neon-blue/30 text-neon-blue'
                  }`}>
                    {gap.priority}
                  </span>
                  <span className="font-medium">{gap.title}</span>
                </div>
                <p className="text-sm text-gray-400">{gap.suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="font-semibold text-gray-300 mb-4">Recommendations for Next Time</h3>
        <div className="space-y-2">
          <RecommendationItem
            icon="📝"
            text="Break large tasks into smaller, trackable commits"
          />
          <RecommendationItem
            icon="🧪"
            text="Add tests alongside feature development"
          />
          <RecommendationItem
            icon="📖"
            text="Document complex logic with inline comments"
          />
          <RecommendationItem
            icon="🔄"
            text="Commit frequently to track progress better"
          />
        </div>
      </div>

      {/* File type breakdown */}
      {Object.keys(filesByType).length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-300 mb-4">Files Modified by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(filesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([ext, count]) => (
                <span
                  key={ext}
                  className="px-3 py-1 rounded-full bg-space-dark border border-neon-blue/30 text-sm"
                >
                  .{ext}: {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Recommendation item
function RecommendationItem({ icon, text }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-space-dark/50 border border-neon-blue/20">
      <span className="text-lg">{icon}</span>
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  )
}
