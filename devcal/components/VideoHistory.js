'use client'

// ============================================
// VIDEO HISTORY COMPONENT
// ============================================
// Shows list of past briefing videos
// with ability to replay any of them

import { useState } from 'react'
import { format, parseISO } from 'date-fns'

export default function VideoHistory({ videos = [], onSelectVideo, onClose }) {
  // Filter state
  const [filter, setFilter] = useState('all') // all, today, week

  // Filter videos based on selection
  const filteredVideos = videos.filter(video => {
    if (filter === 'all') return true

    const videoDate = video.date ? parseISO(video.date) : new Date(video.createdAt)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (filter === 'today') {
      return videoDate >= today
    }

    if (filter === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return videoDate >= weekAgo
    }

    return true
  })

  // Get completion rate color
  const getCompletionColor = (rate) => {
    if (rate >= 80) return 'text-neon-green'
    if (rate >= 50) return 'text-neon-blue'
    if (rate > 0) return 'text-alibaba-orange'
    return 'text-gray-400'
  }

  return (
    <div className="holo-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-xl font-bold neon-text"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          Briefing History
        </h2>

        {/* Filter buttons */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'week', label: 'This Week' },
            { key: 'today', label: 'Today' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === key
                  ? 'bg-neon-blue/30 border border-neon-blue'
                  : 'bg-space-dark/50 hover:bg-space-dark border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Video List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl block mb-4">📼</span>
          <p>No briefings found</p>
          <p className="text-sm mt-2">Briefings are generated when you load the calendar</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {filteredVideos.map((video, index) => {
            // Parse analysis if it's a string
            let analysis = video.analysis
            if (typeof analysis === 'string') {
              try {
                analysis = JSON.parse(analysis)
              } catch (e) {
                analysis = {}
              }
            }

            const completionRate = analysis?.summary?.completionRate ||
              (analysis?.totalPlannedTasks > 0
                ? Math.round((analysis?.completedTasks / analysis?.totalPlannedTasks) * 100)
                : 0)

            return (
              <div
                key={video.id || index}
                onClick={() => onSelectVideo(video)}
                className="flex items-center gap-4 p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20 hover:border-neon-blue/50 cursor-pointer transition group"
              >
                {/* Thumbnail / Play icon */}
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center flex-shrink-0 group-hover:from-neon-blue/30 group-hover:to-neon-purple/30 transition">
                  <span className="text-2xl group-hover:scale-110 transition-transform">▶</span>
                </div>

                {/* Video info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {video.date
                        ? format(parseISO(video.date), 'MMMM d, yyyy')
                        : 'Briefing'}
                    </span>
                    {video.isDemo && (
                      <span className="px-2 py-0.5 rounded-full bg-neon-purple/30 text-xs">
                        Demo
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      {analysis?.totalPlannedTasks || 0} tasks
                    </span>
                    <span>
                      {analysis?.totalCommits || 0} commits
                    </span>
                    <span className={getCompletionColor(completionRate)}>
                      {completionRate}% complete
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 mt-1">
                    Generated: {video.createdAt
                      ? format(new Date(video.createdAt), 'h:mm a')
                      : 'Just now'}
                  </div>
                </div>

                {/* Completion indicator */}
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                    style={{
                      background: `conic-gradient(${
                        completionRate >= 80 ? '#00ff88' :
                        completionRate >= 50 ? '#00d4ff' :
                        '#ff6a00'
                      } ${completionRate * 3.6}deg, rgba(255,255,255,0.1) 0deg)`
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-space-dark flex items-center justify-center">
                      {completionRate}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary stats */}
      {filteredVideos.length > 0 && (
        <div className="mt-6 pt-6 border-t border-neon-blue/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-neon-blue">
                {filteredVideos.length}
              </div>
              <div className="text-xs text-gray-400">Total Briefings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neon-green">
                {filteredVideos.reduce((sum, v) => {
                  const a = typeof v.analysis === 'string'
                    ? JSON.parse(v.analysis || '{}')
                    : v.analysis || {}
                  return sum + (a.completedTasks || 0)
                }, 0)}
              </div>
              <div className="text-xs text-gray-400">Tasks Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neon-purple">
                {filteredVideos.reduce((sum, v) => {
                  const a = typeof v.analysis === 'string'
                    ? JSON.parse(v.analysis || '{}')
                    : v.analysis || {}
                  return sum + (a.totalCommits || 0)
                }, 0)}
              </div>
              <div className="text-xs text-gray-400">Total Commits</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
