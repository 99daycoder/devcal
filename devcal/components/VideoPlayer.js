'use client'

// ============================================
// VIDEO PLAYER LIGHTBOX COMPONENT
// ============================================
// Displays the AI-generated catchup video
// in a centered lightbox with auto-play

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'

export default function VideoPlayer({ isOpen, onClose, video, analysis }) {
  // Video element reference
  const videoRef = useRef(null)

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTranscript, setShowTranscript] = useState(false)

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Auto-play prevented:', err)
        // Browser may block auto-play, that's okay
      })
    }
  }, [isOpen])

  // Handle video events
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setIsLoading(false)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => setIsPlaying(false)

  const handleError = () => {
    setError('Failed to load video')
    setIsLoading(false)
  }

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  // Seek video
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    if (videoRef.current) {
      videoRef.current.currentTime = pos * duration
    }
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Don't render if not open
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 lightbox-overlay"
        onClick={onClose}
      />

      {/* Video Container */}
      <div className="relative w-full max-w-4xl mx-4 modal-enter">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-neon-blue text-3xl z-10"
        >
          ×
        </button>

        {/* Header */}
        <div className="bg-space-dark/80 backdrop-blur-sm rounded-t-xl px-6 py-4 border border-neon-blue/30 border-b-0">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-xl font-bold neon-text"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                Development Briefing
              </h2>
              <p className="text-gray-400 text-sm">
                {video?.date ? format(new Date(video.date), 'MMMM d, yyyy') : 'Today'}
              </p>
            </div>

            {/* Sponsor badges */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-full bg-github-black/50 text-xs">
                GitHub
              </div>
              <div className="px-3 py-1 rounded-full bg-neo4j-blue/30 text-xs">
                Neo4j
              </div>
              <div className="px-3 py-1 rounded-full bg-alibaba-orange/30 text-xs">
                WAN
              </div>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="video-container aspect-video bg-black relative">
          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="loading-spinner w-12 h-12" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-center p-8">
              <span className="text-6xl">🎬</span>
              <p className="text-gray-400">{error}</p>
              {video?.script && (
                <button
                  onClick={() => setShowTranscript(true)}
                  className="neon-button px-4 py-2 rounded-lg text-sm"
                >
                  View Briefing Script
                </button>
              )}
            </div>
          )}

          {/* Demo placeholder when no real video */}
          {video?.isDemo && !error && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-gradient-to-b from-space-dark to-space-purple p-8">
              {/* Simulated AI Assistant */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center">
                  <span className="text-6xl">👩‍🚀</span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neon-blue/30 text-xs whitespace-nowrap">
                  AI Assistant
                </div>
              </div>

              {/* Script display */}
              <div className="max-w-lg text-center space-y-4 mt-4">
                <p
                  className="text-lg neon-text"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  Demo Mode Active
                </p>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {video?.script || 'Good morning, Captain Sam. This is your development briefing. Configure the WAN API to enable video generation.'}
                </p>
              </div>

              {/* Background decorations */}
              <div className="absolute top-4 left-4 opacity-30">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </div>
              <div className="absolute top-4 right-4 opacity-30 text-neo4j-blue">
                🔗
              </div>
              <div className="absolute bottom-4 right-4 opacity-30 text-alibaba-orange">
                🎬
              </div>
            </div>
          )}

          {/* Actual video element - works for both real API URLs and local files */}
          {video?.url && !video.isDemo && !video.isProcessing && (
            <video
              ref={videoRef}
              src={video.url}
              className="w-full h-full"
              controls
              autoPlay
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onError={handleError}
              onClick={togglePlay}
            />
          )}

          {/* Processing state - show when video is being generated */}
          {video?.isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-gradient-to-b from-space-dark to-space-purple p-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-alibaba-orange/20 flex items-center justify-center animate-pulse">
                  <span className="text-5xl">🎬</span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <div className="loading-spinner w-8 h-8" />
                </div>
              </div>
              <p className="text-xl text-alibaba-orange font-bold mt-4">Generating Video...</p>
              <p className="text-sm text-gray-400">Alibaba WAN is creating your briefing</p>
              <p className="text-xs text-gray-500">This typically takes 1-2 minutes</p>
              {video?.script && (
                <div className="mt-6 max-w-lg p-4 bg-space-dark/50 rounded-lg border border-neon-blue/20">
                  <p className="text-xs text-neon-blue mb-2 font-medium">📝 J.A.R.V.I.S Script Preview:</p>
                  <p className="text-sm text-gray-300 italic leading-relaxed">{video.script.substring(0, 300)}...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video Controls */}
        <div className="bg-space-dark/80 backdrop-blur-sm rounded-b-xl px-6 py-4 border border-neon-blue/30 border-t-0">
          {/* Progress bar */}
          <div
            className="h-1 bg-gray-700 rounded-full mb-4 cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-neon-blue/20 hover:bg-neon-blue/40 flex items-center justify-center transition"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              {/* Time display */}
              <span className="text-sm text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Transcript toggle */}
              {video?.script && (
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    showTranscript ? 'bg-neon-blue/30' : 'bg-gray-700/50 hover:bg-gray-700'
                  }`}
                >
                  📝 Transcript
                </button>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="neon-button px-4 py-2 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>

          {/* Transcript panel */}
          {showTranscript && video?.script && (
            <div className="mt-4 p-4 bg-space-dark rounded-lg border border-neon-blue/20 max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {video.script}
              </p>
            </div>
          )}
        </div>

        {/* Analysis Summary (if available) */}
        {analysis && (
          <div className="mt-4 holo-panel p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Briefing Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-neon-blue">
                  {analysis.summary?.planned || 0}
                </div>
                <div className="text-xs text-gray-400">Planned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neon-green">
                  {analysis.summary?.completed || 0}
                </div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-alibaba-orange">
                  {analysis.summary?.pending || 0}
                </div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neon-purple">
                  {analysis.summary?.commits || 0}
                </div>
                <div className="text-xs text-gray-400">Commits</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
