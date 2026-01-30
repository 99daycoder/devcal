'use client'

// ============================================
// VIDEO HISTORY PAGE
// ============================================
// Dedicated page for viewing all past briefings

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import VideoPlayer from '../../components/VideoPlayer'
import Link from 'next/link'

export default function HistoryPage() {
  // State
  const [videos, setVideos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [showPlayer, setShowPlayer] = useState(false)
  const [filter, setFilter] = useState('all')

  // Fetch video history
  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('/api/video')
        const data = await response.json()

        if (data.success) {
          setVideos(data.videos || [])
        }
      } catch (error) {
        console.error('Error fetching videos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [])

  // Filter videos
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

  // Calculate overall stats
  const stats = {
    totalBriefings: videos.length,
    totalTasks: 0,
    totalCommits: 0,
    avgCompletion: 0
  }

  videos.forEach(video => {
    let analysis = video.analysis
    if (typeof analysis === 'string') {
      try { analysis = JSON.parse(analysis) } catch (e) { analysis = {} }
    }
    stats.totalTasks += analysis?.summary?.planned || 0
    stats.totalCommits += analysis?.summary?.commits || 0
    stats.avgCompletion += analysis?.summary?.completionRate || 0
  })

  if (videos.length > 0) {
    stats.avgCompletion = Math.round(stats.avgCompletion / videos.length)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/"
            className="text-neon-blue hover:text-neon-blue/80 text-sm mb-2 inline-block"
          >
            ← Back to Calendar
          </Link>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Briefing History
          </h1>
          <p className="text-gray-400 mt-2">
            Review your past development briefings and track progress over time
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All Time' },
            { key: 'week', label: 'This Week' },
            { key: 'today', label: 'Today' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === key
                  ? 'bg-neon-blue/30 border border-neon-blue'
                  : 'bg-space-dark/50 border border-transparent hover:border-neon-blue/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatBox
          icon="📼"
          label="Total Briefings"
          value={stats.totalBriefings}
          color="text-neon-blue"
        />
        <StatBox
          icon="📋"
          label="Tasks Tracked"
          value={stats.totalTasks}
          color="text-neon-purple"
        />
        <StatBox
          icon="💾"
          label="Total Commits"
          value={stats.totalCommits}
          color="text-neon-green"
        />
        <StatBox
          icon="📊"
          label="Avg. Completion"
          value={`${stats.avgCompletion}%`}
          color="text-alibaba-orange"
        />
      </div>

      {/* Video List */}
      {isLoading ? (
        <div className="holo-panel p-12 text-center">
          <div className="loading-spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-400">Loading briefing history...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="holo-panel p-12 text-center">
          <span className="text-6xl block mb-4">📼</span>
          <h3 className="text-xl font-bold mb-2">No Briefings Found</h3>
          <p className="text-gray-400 mb-6">
            Generate your first briefing from the calendar page
          </p>
          <Link
            href="/"
            className="neon-button px-6 py-3 rounded-lg inline-block"
          >
            Go to Calendar
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video, index) => {
            let analysis = video.analysis
            if (typeof analysis === 'string') {
              try { analysis = JSON.parse(analysis) } catch (e) { analysis = {} }
            }

            const completionRate = analysis?.summary?.completionRate || 0

            return (
              <div
                key={video.id || index}
                onClick={() => {
                  setSelectedVideo(video)
                  setShowPlayer(true)
                }}
                className="holo-panel p-6 cursor-pointer hover:border-neon-blue/50 transition group"
              >
                {/* Video Preview */}
                <div className="aspect-video rounded-lg bg-gradient-to-br from-space-dark to-space-purple mb-4 flex items-center justify-center relative overflow-hidden">
                  {/* Play button overlay */}
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-3xl ml-1">▶</span>
                  </div>

                  {/* Demo badge */}
                  {video.isDemo && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-neon-purple/50 text-xs">
                      Demo
                    </div>
                  )}

                  {/* Completion badge */}
                  <div
                    className={`absolute bottom-2 right-2 px-3 py-1 rounded-full text-xs font-bold ${
                      completionRate >= 80 ? 'bg-neon-green/30 text-neon-green' :
                      completionRate >= 50 ? 'bg-neon-blue/30 text-neon-blue' :
                      'bg-alibaba-orange/30 text-alibaba-orange'
                    }`}
                  >
                    {completionRate}%
                  </div>
                </div>

                {/* Video Info */}
                <h3 className="font-bold mb-1">
                  {video.date
                    ? format(parseISO(video.date), 'EEEE, MMMM d')
                    : 'Development Briefing'}
                </h3>

                <p className="text-sm text-gray-400 mb-3">
                  {video.createdAt
                    ? format(new Date(video.createdAt), 'h:mm a')
                    : 'Recent'}
                </p>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span>📋</span>
                    {analysis?.summary?.planned || 0} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <span>💾</span>
                    {analysis?.summary?.commits || 0} commits
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          isOpen={showPlayer}
          onClose={() => {
            setShowPlayer(false)
            setSelectedVideo(null)
          }}
          video={selectedVideo}
          analysis={
            typeof selectedVideo.analysis === 'string'
              ? JSON.parse(selectedVideo.analysis || '{}')
              : selectedVideo.analysis
          }
        />
      )}
    </div>
  )
}

// Stat box component
function StatBox({ icon, label, value, color }) {
  return (
    <div className="holo-panel p-6 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}
