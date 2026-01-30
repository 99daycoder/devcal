'use client'

// ============================================
// DEVCAL - MAIN PAGE
// ============================================
// The main calendar view with video lightbox,
// task management, timeline analysis, and
// learning journal features

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addDays, differenceInHours } from 'date-fns'
import Link from 'next/link'
import Calendar from '../components/Calendar'
import TaskModal from '../components/TaskModal'
import VideoPlayer from '../components/VideoPlayer'
import VideoHistory from '../components/VideoHistory'
import TimelineSlider from '../components/TimelineSlider'
import LearningJournal from '../components/LearningJournal'
import TemplateGenerator from '../components/TemplateGenerator'
import RescheduleModal from '../components/RescheduleModal'
import MonthlyProgress from '../components/MonthlyProgress'
import ContextRecall from '../components/ContextRecall'

export default function HomePage() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  // Current selected date
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Tasks data
  const [tasks, setTasks] = useState([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(true)

  // Commits data
  const [commits, setCommits] = useState([])

  // Video state
  const [currentVideo, setCurrentVideo] = useState(null)
  const [videoHistory, setVideoHistory] = useState([])
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoTaskId, setVideoTaskId] = useState(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  // Analysis state
  const [analysis, setAnalysis] = useState(null)

  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showTemplateGenerator, setShowTemplateGenerator] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showContextRecall, setShowContextRecall] = useState(false)

  // View state
  const [activeTab, setActiveTab] = useState('calendar') // calendar, timeline, journal, history

  // First load flag
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  // ========================================
  // COMPUTED VALUES
  // ========================================

  // Count stale tasks (no activity for 2+ hours after start time)
  const staleTasks = useMemo(() => {
    const now = new Date()
    return tasks.filter(task => {
      if (task.status === 'completed') return false
      if (task.isStale) return true

      const startTime = new Date(task.startTime)
      if (startTime > now) return false

      const lastActivity = task.lastActivity ? new Date(task.lastActivity) : null
      const referenceTime = lastActivity || startTime
      const hoursSinceActivity = differenceInHours(now, referenceTime)

      return hoursSinceActivity >= 2
    })
  }, [tasks])

  // ========================================
  // DATA FETCHING
  // ========================================

  // Fetch tasks for selected date
  const fetchTasks = useCallback(async () => {
    setIsLoadingTasks(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/tasks?date=${dateStr}`)
      const data = await response.json()

      if (data.success) {
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsLoadingTasks(false)
    }
  }, [selectedDate])

  // Fetch commits
  const fetchCommits = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(`/api/commits?date=${dateStr}`)
      const data = await response.json()

      if (data.success) {
        setCommits(data.commits || [])
      }
    } catch (error) {
      console.error('Error fetching commits:', error)
    }
  }, [selectedDate])

  // Fetch video history
  const fetchVideoHistory = async () => {
    try {
      const response = await fetch('/api/video')
      const data = await response.json()

      if (data.success) {
        setVideoHistory(data.videos || [])
      }
    } catch (error) {
      console.error('Error fetching video history:', error)
    }
  }

  // Poll video status
  const pollVideoStatus = useCallback(async (taskId) => {
    try {
      const response = await fetch(`/api/generate-video?taskId=${taskId}`)
      const data = await response.json()

      if (data.status === 'completed' && data.videoUrl) {
        setCurrentVideo(prev => ({
          ...prev,
          url: data.videoUrl,
          isDemo: false,
          isProcessing: false
        }))
        setVideoTaskId(null)
        setIsVideoReady(true)
        setIsGeneratingVideo(false)
        return true // Video ready
      } else if (data.status === 'failed') {
        console.error('Video generation failed:', data.error)
        setVideoTaskId(null)
        setIsGeneratingVideo(false)
        return true // Stop polling
      }
      return false // Keep polling
    } catch (error) {
      console.error('Error checking video status:', error)
      return false
    }
  }, [])

  // Generate new briefing video
  const generateVideo = async (isWeekly = false) => {
    console.log('🎬 Starting video generation...')
    setIsGeneratingVideo(true)
    setIsVideoReady(false)
    setVideoTaskId(null)

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          isWeekly,
          staleTasks: staleTasks.length
        })
      })
      const data = await response.json()
      console.log('📹 Video API response:', data)

      if (data.success) {
        // Always set the video data first
        const videoData = {
          ...data.video,
          isProcessing: data.isProcessing || false
        }
        setCurrentVideo(videoData)
        setAnalysis(data.analysis)

        // Check if video is processing (real API call)
        if (data.isProcessing && data.taskId) {
          console.log('⏳ Video is processing, taskId:', data.taskId)
          setVideoTaskId(data.taskId)
          // Show the player with loading state
          setShowVideoPlayer(true)
        } else {
          // Demo mode or immediate video
          console.log('✅ Video ready (demo mode or immediate)')
          setIsVideoReady(true)
          setShowVideoPlayer(true)
          setIsGeneratingVideo(false)
        }
        fetchVideoHistory()
      } else {
        console.error('❌ Video API error:', data.error)
        setIsGeneratingVideo(false)
      }
    } catch (error) {
      console.error('❌ Error generating video:', error)
      setIsGeneratingVideo(false)
    }
  }

  // Poll for video status when we have a task ID
  useEffect(() => {
    if (!videoTaskId) return

    const interval = setInterval(async () => {
      const isReady = await pollVideoStatus(videoTaskId)
      if (isReady) {
        clearInterval(interval)
      }
    }, 10000) // Check every 10 seconds

    // Also check immediately
    pollVideoStatus(videoTaskId)

    // Cleanup
    return () => clearInterval(interval)
  }, [videoTaskId, pollVideoStatus])

  // ========================================
  // TASK OPERATIONS
  // ========================================

  // Save task (create or update)
  const handleSaveTask = async (taskData) => {
    try {
      const method = taskData.id ? 'PUT' : 'POST'
      const response = await fetch('/api/tasks', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      const data = await response.json()

      if (data.success) {
        fetchTasks()
        setShowTaskModal(false)
        setEditingTask(null)
      }
    } catch (error) {
      console.error('Error saving task:', error)
      throw error
    }
  }

  // Generate template tasks
  const handleGenerateTemplate = async (templateTasks) => {
    try {
      // Add all template tasks
      for (const task of templateTasks) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        })
      }
      fetchTasks()

      // Auto-generate a briefing video for the new tasks
      generateVideo(false)
    } catch (error) {
      console.error('Error generating template:', error)
    }
  }

  // Reschedule tasks to a new date
  const handleReschedule = async (tasksToReschedule, targetDate) => {
    try {
      for (const task of tasksToReschedule) {
        // Calculate duration
        const start = new Date(task.startTime)
        const end = new Date(task.endTime)
        const durationMs = end - start

        // Create new times on target date
        const newStart = new Date(targetDate)
        newStart.setHours(start.getHours(), start.getMinutes(), 0, 0)
        const newEnd = new Date(newStart.getTime() + durationMs)

        // Update the task
        await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: task.id,
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
            status: 'pending',
            lastActivity: null,
            isStale: false
          })
        })
      }
      fetchTasks()
    } catch (error) {
      console.error('Error rescheduling tasks:', error)
    }
  }

  // ========================================
  // EFFECTS
  // ========================================

  // Load data on mount and when date changes
  useEffect(() => {
    fetchTasks()
    fetchCommits()
  }, [fetchTasks, fetchCommits])

  // Load video history on mount
  useEffect(() => {
    fetchVideoHistory()
  }, [])

  // Disabled auto-generate on first load to save API credits
  // User can click "Generate Briefing" button instead
  useEffect(() => {
    if (isFirstLoad && !isLoadingTasks) {
      setIsFirstLoad(false)
      // generateVideo() - disabled to save API calls
    }
  }, [isFirstLoad, isLoadingTasks])

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Command Center
          </h1>
          <p className="text-gray-400">
            Track your development progress and stay on mission
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* GENERATE VIDEO - Test WAN API */}
          <Link
            href="/generate-video"
            className="px-4 py-3 rounded-lg bg-alibaba-orange/20 border border-alibaba-orange hover:bg-alibaba-orange/30 transition flex items-center gap-2 font-bold"
          >
            <span>🎬</span> GENERATE VIDEO
          </Link>

          {/* Context Recall - MEMORY FEATURE */}
          <button
            onClick={() => setShowContextRecall(true)}
            className="px-4 py-3 rounded-lg bg-neon-green/20 border border-neon-green hover:bg-neon-green/30 transition flex items-center gap-2"
          >
            <span>🧠</span> Recall Context
          </button>

          {/* Template Generator */}
          <button
            onClick={() => setShowTemplateGenerator(true)}
            className="px-4 py-3 rounded-lg bg-neon-purple/20 border border-neon-purple hover:bg-neon-purple/30 transition flex items-center gap-2"
          >
            <span>📋</span> Generate Template
          </button>

          {/* Reschedule (show if stale tasks exist) */}
          {staleTasks.length > 0 && (
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="px-4 py-3 rounded-lg bg-red-500/20 border border-red-500 hover:bg-red-500/30 transition flex items-center gap-2 animate-pulse"
            >
              <span>🔴</span> Reschedule ({staleTasks.length})
            </button>
          )}

          {/* Generate Video Button */}
          <button
            onClick={() => generateVideo(false)}
            disabled={isGeneratingVideo}
            className="neon-button px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingVideo ? (
              <>
                <span className="loading-spinner w-5 h-5" />
                Generating...
              </>
            ) : (
              <>
                🎬 Generate Briefing
              </>
            )}
          </button>

          {/* Watch Last Video / Loading State */}
          {currentVideo && (
            videoTaskId ? (
              <div className="px-4 py-3 rounded-lg bg-alibaba-orange/20 border border-alibaba-orange flex items-center gap-2">
                <span className="loading-spinner w-4 h-4" />
                <span className="text-sm">Generating...</span>
              </div>
            ) : isVideoReady ? (
              <button
                onClick={() => setShowVideoPlayer(true)}
                className="px-4 py-3 rounded-lg bg-neon-green/20 border border-neon-green hover:bg-neon-green/30 transition flex items-center gap-2"
              >
                ▶ PLAY
              </button>
            ) : (
              <button
                onClick={() => setShowVideoPlayer(true)}
                className="px-4 py-3 rounded-lg bg-neon-blue/20 border border-neon-blue hover:bg-neon-blue/30 transition"
              >
                ▶ Watch
              </button>
            )
          )}
        </div>
      </div>

      {/* Stale Task Alert Banner */}
      {staleTasks.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🔴</span>
            <div>
              <p className="font-semibold text-red-300">
                {staleTasks.length} Stale Task{staleTasks.length > 1 ? 's' : ''} Detected
              </p>
              <p className="text-sm text-gray-400">
                No coding activity detected for these tasks. Time to catch up!
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => generateVideo(false)}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500 text-sm hover:bg-red-500/30 transition"
            >
              Get Catchup Briefing
            </button>
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="px-4 py-2 rounded-lg bg-alibaba-orange/20 border border-alibaba-orange text-sm hover:bg-alibaba-orange/30 transition"
            >
              Reschedule Tasks
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'calendar', label: '📅 Calendar' },
          { key: 'timeline', label: '📊 Timeline' },
          { key: 'journal', label: '📚 Learning Journal' },
          { key: 'monthly', label: '📈 Monthly Progress' },
          { key: 'history', label: '📼 Video History' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === key
                ? 'bg-neon-blue/30 border border-neon-blue text-white'
                : 'bg-space-dark/50 border border-transparent text-gray-400 hover:text-white hover:border-neon-blue/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel (2/3 width) */}
        <div className="lg:col-span-2">
          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <Calendar
              tasks={tasks}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onAddTask={() => {
                setEditingTask(null)
                setShowTaskModal(true)
              }}
              onSelectTask={(task) => {
                setEditingTask(task)
                setShowTaskModal(true)
              }}
              staleThresholdHours={2}
            />
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <TimelineSlider
              commits={commits}
              tasks={tasks}
              selectedDate={selectedDate}
              onTimeChange={(time) => console.log('Time changed:', time)}
            />
          )}

          {/* Learning Journal Tab */}
          {activeTab === 'journal' && (
            <LearningJournal
              tasks={tasks}
              commits={commits}
              onGenerateWeeklyVideo={(report) => generateVideo(true)}
            />
          )}

          {/* Monthly Progress Tab */}
          {activeTab === 'monthly' && (
            <MonthlyProgress
              onGenerateMonthlyVideo={(monthData) => {
                console.log('Generating monthly video for:', monthData)
                generateVideo(true)
              }}
            />
          )}

          {/* Video History Tab */}
          {activeTab === 'history' && (
            <VideoHistory
              videos={videoHistory}
              onSelectVideo={(video) => {
                setCurrentVideo(video)
                setShowVideoPlayer(true)
              }}
            />
          )}
        </div>

        {/* Side Panel (1/3 width) */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="holo-panel p-6">
            <h3
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Today's Status
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Tasks"
                value={tasks.length}
                icon="📋"
                color="text-neon-blue"
              />
              <StatCard
                label="Commits"
                value={commits.length}
                icon="💾"
                color="text-neon-green"
              />
              <StatCard
                label="Completed"
                value={tasks.filter(t => t.status === 'completed').length}
                icon="✅"
                color="text-neon-green"
              />
              <StatCard
                label="Stale"
                value={staleTasks.length}
                icon="🔴"
                color={staleTasks.length > 0 ? 'text-red-500' : 'text-gray-500'}
              />
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Completion</span>
                <span className="text-neon-blue">
                  {tasks.length > 0
                    ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-space-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-neon-blue to-neon-green transition-all duration-500"
                  style={{
                    width: tasks.length > 0
                      ? `${(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Recent Commits */}
          <div className="holo-panel p-6">
            <h3
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Recent Commits
            </h3>

            {commits.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">
                No commits yet today
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {commits.slice(0, 5).map((commit, index) => (
                  <div
                    key={commit.hash || index}
                    className="p-3 rounded-lg bg-space-dark/50 border border-neon-blue/20"
                  >
                    <p className="text-sm truncate mb-1">{commit.message}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{format(new Date(commit.timestamp), 'h:mm a')}</span>
                      <span>•</span>
                      <span>{(commit.filesChanged || []).length} files</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="holo-panel p-6">
            <h3
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Quick Actions
            </h3>

            {/* Video Generation Status */}
            {videoTaskId && (
              <div className="mb-4 p-3 rounded-lg bg-alibaba-orange/10 border border-alibaba-orange/30 animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="loading-spinner w-5 h-5" />
                  <div>
                    <div className="font-medium text-sm text-alibaba-orange">Video Generating...</div>
                    <div className="text-xs text-gray-400">This takes 1-2 minutes</div>
                  </div>
                </div>
              </div>
            )}

            {/* Video Ready Notification */}
            {isVideoReady && currentVideo && !showVideoPlayer && (
              <button
                onClick={() => setShowVideoPlayer(true)}
                className="w-full mb-4 p-3 rounded-lg bg-neon-green/20 border border-neon-green hover:bg-neon-green/30 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">▶</span>
                  <div className="text-left">
                    <div className="font-medium text-sm text-neon-green">Video Ready!</div>
                    <div className="text-xs text-gray-400">Click to play your briefing</div>
                  </div>
                </div>
              </button>
            )}

            <div className="space-y-3">
              {/* TEST VIDEO API - Direct Test */}
              <Link
                href="/generate-video"
                className="w-full p-3 rounded-lg bg-alibaba-orange/10 border border-alibaba-orange/30 hover:border-alibaba-orange/50 transition text-left flex items-center gap-3"
              >
                <span className="text-xl">🎬</span>
                <div>
                  <div className="font-medium text-sm text-alibaba-orange">GENERATE VIDEO</div>
                  <div className="text-xs text-gray-500">Test WAN API directly</div>
                </div>
              </Link>

              {/* MEMORY PLATFORM - Key Feature */}
              <button
                onClick={() => setShowContextRecall(true)}
                className="w-full p-3 rounded-lg bg-neon-green/10 border border-neon-green/30 hover:border-neon-green/50 transition text-left flex items-center gap-3"
              >
                <span className="text-xl">🧠</span>
                <div>
                  <div className="font-medium text-sm text-neon-green">Recall Context</div>
                  <div className="text-xs text-gray-500">Your developer memory</div>
                </div>
              </button>

              <button
                onClick={() => setShowTemplateGenerator(true)}
                className="w-full p-3 rounded-lg bg-space-dark/50 border border-neon-blue/20 hover:border-neon-blue/50 transition text-left flex items-center gap-3"
              >
                <span className="text-xl">📋</span>
                <div>
                  <div className="font-medium text-sm">Generate Template</div>
                  <div className="text-xs text-gray-500">Pre-made task lists</div>
                </div>
              </button>

              <button
                onClick={() => generateVideo(false)}
                className="w-full p-3 rounded-lg bg-space-dark/50 border border-neon-blue/20 hover:border-neon-blue/50 transition text-left flex items-center gap-3"
              >
                <span className="text-xl">🎬</span>
                <div>
                  <div className="font-medium text-sm">Catchup Briefing</div>
                  <div className="text-xs text-gray-500">What's done vs pending</div>
                </div>
              </button>

              {staleTasks.length > 0 && (
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="w-full p-3 rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition text-left flex items-center gap-3"
                >
                  <span className="text-xl">📅</span>
                  <div>
                    <div className="font-medium text-sm text-red-300">Reschedule Stale</div>
                    <div className="text-xs text-gray-500">Push to tomorrow</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* PowerShell Script */}
          <div className="holo-panel p-6">
            <h3
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Auto-Commit Script
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-neon-green status-pulse" />
              <span className="text-sm">Script ready to run</span>
            </div>

            <code className="block p-3 rounded bg-space-dark text-xs text-neon-blue break-all">
              .\scripts\autocommit.ps1
            </code>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false)
          setEditingTask(null)
        }}
        onSave={handleSaveTask}
        task={editingTask}
        selectedDate={selectedDate}
      />

      {/* Video Player Lightbox */}
      <VideoPlayer
        isOpen={showVideoPlayer}
        onClose={() => setShowVideoPlayer(false)}
        video={currentVideo}
        analysis={analysis}
      />

      {/* Template Generator Modal */}
      {showTemplateGenerator && (
        <TemplateGenerator
          onGenerateTemplate={handleGenerateTemplate}
          onClose={() => setShowTemplateGenerator(false)}
        />
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        tasks={tasks}
        onReschedule={handleReschedule}
      />

      {/* Context Recall Modal - MEMORY PLATFORM */}
      <ContextRecall
        isOpen={showContextRecall}
        onClose={() => setShowContextRecall(false)}
        tasks={tasks}
        commits={commits}
      />

      {/* Loading Overlay */}
      {isGeneratingVideo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center lightbox-overlay">
          <div className="holo-panel p-8 text-center modal-enter">
            <div className="loading-spinner w-16 h-16 mx-auto mb-4" />
            <h3
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Generating Briefing
            </h3>
            <p className="text-gray-400">
              {staleTasks.length > 0
                ? `Analyzing gap: ${staleTasks.length} stale task(s) detected...`
                : 'Analyzing your commits and preparing video...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick stat card component
function StatCard({ label, value, icon, color }) {
  return (
    <div className="p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
