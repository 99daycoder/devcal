'use client'

// ============================================
// RESCHEDULE MODAL COMPONENT
// ============================================
// Allows users to push incomplete/stale tasks
// forward to tomorrow or a future date

import { useState, useMemo } from 'react'
import { format, addDays, differenceInHours } from 'date-fns'

export default function RescheduleModal({ isOpen, onClose, tasks, onReschedule }) {
  const [targetDate, setTargetDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [rescheduleOption, setRescheduleOption] = useState('tomorrow') // tomorrow, nextWeek, custom

  // Filter tasks that can be rescheduled (pending, stale, not completed)
  const reschedulableTasks = useMemo(() => {
    const now = new Date()
    return tasks.filter(task => {
      if (task.status === 'completed') return false

      // Check if task is stale (started but no recent activity)
      const startTime = new Date(task.startTime)
      const lastActivity = task.lastActivity ? new Date(task.lastActivity) : null
      const hoursSinceActivity = lastActivity
        ? differenceInHours(now, lastActivity)
        : differenceInHours(now, startTime)

      // Include if: pending, or stale (no activity for 2+ hours after start)
      return task.status === 'pending' ||
             task.status === 'in_progress' ||
             (startTime < now && hoursSinceActivity > 2)
    }).map(task => {
      const now = new Date()
      const startTime = new Date(task.startTime)
      const lastActivity = task.lastActivity ? new Date(task.lastActivity) : null
      const hoursSinceActivity = lastActivity
        ? differenceInHours(now, lastActivity)
        : startTime < now ? differenceInHours(now, startTime) : 0

      return {
        ...task,
        hoursSinceActivity,
        isStale: hoursSinceActivity > 2 && startTime < now
      }
    })
  }, [tasks])

  // Stale tasks (RED indicators)
  const staleTasks = reschedulableTasks.filter(t => t.isStale)

  // Handle option change
  const handleOptionChange = (option) => {
    setRescheduleOption(option)
    switch (option) {
      case 'tomorrow':
        setTargetDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
        break
      case 'nextWeek':
        setTargetDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
        break
      // custom uses the date picker
    }
  }

  // Toggle task selection
  const toggleTask = (taskId) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  // Select all stale tasks
  const selectAllStale = () => {
    const staleIds = new Set(staleTasks.map(t => t.id))
    setSelectedTasks(staleIds)
  }

  // Select all reschedulable
  const selectAll = () => {
    setSelectedTasks(new Set(reschedulableTasks.map(t => t.id)))
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedTasks(new Set())
  }

  // Handle reschedule
  const handleReschedule = async () => {
    if (selectedTasks.size === 0) return

    setIsProcessing(true)
    try {
      const tasksToReschedule = reschedulableTasks.filter(t => selectedTasks.has(t.id))
      await onReschedule?.(tasksToReschedule, targetDate)
      onClose?.()
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 lightbox-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="relative holo-panel p-8 w-full max-w-2xl mx-4 modal-enter max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-2xl font-bold neon-text"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Reschedule Tasks
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Push incomplete tasks to a future date
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Stale Warning */}
        {staleTasks.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔴</span>
              <div>
                <p className="font-semibold text-red-300">
                  {staleTasks.length} Stale Task{staleTasks.length > 1 ? 's' : ''} Detected
                </p>
                <p className="text-sm text-gray-400">
                  These tasks have no activity for several hours
                </p>
              </div>
              <button
                onClick={selectAllStale}
                className="ml-auto px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-sm hover:bg-red-500/30 transition"
              >
                Select All Stale
              </button>
            </div>
          </div>
        )}

        {/* Reschedule Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Reschedule To
          </label>
          <div className="flex gap-3 mb-3">
            {[
              { key: 'tomorrow', label: 'Tomorrow', icon: '📅' },
              { key: 'nextWeek', label: 'Next Week', icon: '📆' },
              { key: 'custom', label: 'Custom Date', icon: '🗓️' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleOptionChange(key)}
                className={`flex-1 p-3 rounded-lg border text-center transition ${
                  rescheduleOption === key
                    ? 'bg-neon-blue/20 border-neon-blue'
                    : 'bg-space-dark/50 border-neon-blue/20 hover:border-neon-blue/50'
                }`}
              >
                <span className="text-xl block mb-1">{icon}</span>
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

          {rescheduleOption === 'custom' && (
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              className="w-full"
            />
          )}

          <p className="text-sm text-gray-400 mt-2">
            Selected tasks will be moved to: <span className="text-neon-blue font-medium">
              {format(new Date(targetDate), 'EEEE, MMMM d, yyyy')}
            </span>
          </p>
        </div>

        {/* Task Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-300">
              Select Tasks to Reschedule ({selectedTasks.size}/{reschedulableTasks.length})
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-neon-blue hover:underline"
              >
                Select All
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-400 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {reschedulableTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400 rounded-lg bg-space-dark/50">
              <span className="text-4xl block mb-2">✅</span>
              <p>No tasks to reschedule!</p>
              <p className="text-sm">All tasks are either completed or in the future.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reschedulableTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                    selectedTasks.has(task.id)
                      ? 'bg-neon-blue/20 border border-neon-blue'
                      : task.isStale
                      ? 'bg-red-500/10 border border-red-500/30 hover:border-red-500/50'
                      : 'bg-space-dark/50 border border-neon-blue/20 hover:border-neon-blue/50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedTasks.has(task.id)
                      ? 'bg-neon-blue border-neon-blue'
                      : 'border-gray-500'
                  }`}>
                    {selectedTasks.has(task.id) && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>

                  {/* Stale indicator */}
                  {task.isStale && (
                    <span className="text-red-500 text-lg">🔴</span>
                  )}

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(task.startTime), 'h:mm a')} - {format(new Date(task.endTime), 'h:mm a')}
                    </p>
                  </div>

                  {/* Hours since activity */}
                  {task.hoursSinceActivity > 0 && (
                    <div className={`text-right text-xs ${
                      task.isStale ? 'text-red-400' : 'text-gray-500'
                    }`}>
                      <div>{task.hoursSinceActivity}h</div>
                      <div>no activity</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-lg bg-gray-600/50 hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={selectedTasks.size === 0 || isProcessing}
            className="flex-1 neon-button py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="loading-spinner w-5 h-5" />
                Rescheduling...
              </>
            ) : (
              <>
                📅 Reschedule {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
