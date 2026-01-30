'use client'

// ============================================
// CALENDAR COMPONENT
// ============================================
// Main calendar view showing daily schedule
// with tasks displayed in time slots

import { useState, useEffect } from 'react'
import { format, addDays, subDays, startOfDay, parseISO, differenceInHours } from 'date-fns'

export default function Calendar({ tasks = [], onAddTask, onSelectTask, selectedDate, onDateChange, staleThresholdHours = 2 }) {
  // Current time for the "now" indicator
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Hours to display (6 AM to 11 PM)
  const hours = Array.from({ length: 18 }, (_, i) => i + 6)

  // Format hour for display
  const formatHour = (hour) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  // Get tasks for the selected date
  const dayTasks = tasks.filter(task => {
    const taskDate = typeof task.startTime === 'string'
      ? task.startTime.split('T')[0]
      : format(new Date(task.startTime), 'yyyy-MM-dd')
    return taskDate === format(selectedDate, 'yyyy-MM-dd')
  })

  // Calculate task position and height
  const getTaskStyle = (task) => {
    const start = typeof task.startTime === 'string'
      ? parseISO(task.startTime)
      : new Date(task.startTime)
    const end = typeof task.endTime === 'string'
      ? parseISO(task.endTime)
      : new Date(task.endTime)

    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    const duration = endHour - startHour

    // Position relative to 6 AM start
    const top = (startHour - 6) * 60 // 60px per hour
    const height = duration * 60

    return {
      top: `${top}px`,
      height: `${Math.max(height, 30)}px`, // Minimum height of 30px
    }
  }

  // Check if task is stale (no activity for threshold hours)
  const isTaskStale = (task) => {
    if (task.status === 'completed') return false
    if (task.isStale) return true // Explicitly marked as stale

    const now = new Date()
    const startTime = parseISO(task.startTime)

    // If task hasn't started yet, it's not stale
    if (startTime > now) return false

    // Check last activity
    const lastActivity = task.lastActivity ? new Date(task.lastActivity) : null
    const referenceTime = lastActivity || startTime

    const hoursSinceActivity = differenceInHours(now, referenceTime)
    return hoursSinceActivity >= staleThresholdHours
  }

  // Get status color class
  const getStatusColor = (task) => {
    // Check for stale first (RED)
    if (isTaskStale(task)) return 'stale'
    if (task.status === 'completed') return 'completed'
    if (task.status === 'in_progress') return ''
    return 'pending'
  }

  // Get hours without activity for display
  const getHoursWithoutActivity = (task) => {
    if (task.hoursWithoutActivity) return task.hoursWithoutActivity

    const now = new Date()
    const startTime = parseISO(task.startTime)
    const lastActivity = task.lastActivity ? new Date(task.lastActivity) : null
    const referenceTime = lastActivity || startTime

    if (startTime > now) return 0
    return Math.max(0, differenceInHours(now, referenceTime))
  }

  // Current time indicator position
  const getCurrentTimePosition = () => {
    const now = currentTime
    const hour = now.getHours() + now.getMinutes() / 60
    const top = (hour - 6) * 60
    return `${top}px`
  }

  return (
    <div className="holo-panel p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Date Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="neon-button px-3 py-2 rounded-lg"
          >
            ← Previous
          </button>

          <div className="text-center">
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              {format(selectedDate, 'EEEE')}
            </h2>
            <p className="text-neon-blue">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>

          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="neon-button px-3 py-2 rounded-lg"
          >
            Next →
          </button>
        </div>

        {/* Add Task Button */}
        <button
          onClick={onAddTask}
          className="neon-button px-6 py-3 rounded-lg flex items-center gap-2 font-semibold"
        >
          <span className="text-xl">+</span>
          Add Task
        </button>
      </div>

      {/* Quick Date Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => onDateChange(subDays(new Date(), 1))}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            format(selectedDate, 'yyyy-MM-dd') === format(subDays(new Date(), 1), 'yyyy-MM-dd')
              ? 'bg-neon-blue/30 border border-neon-blue'
              : 'bg-space-dark/50 border border-transparent hover:border-neon-blue/50'
          }`}
        >
          Yesterday
        </button>
        <button
          onClick={() => onDateChange(new Date())}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              ? 'bg-neon-blue/30 border border-neon-blue'
              : 'bg-space-dark/50 border border-transparent hover:border-neon-blue/50'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => onDateChange(addDays(new Date(), 1))}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            format(selectedDate, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd')
              ? 'bg-neon-blue/30 border border-neon-blue'
              : 'bg-space-dark/50 border border-transparent hover:border-neon-blue/50'
          }`}
        >
          Tomorrow
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="relative border border-neon-blue/20 rounded-lg overflow-hidden">
        {/* Time slots */}
        <div className="relative" style={{ height: `${hours.length * 60}px` }}>
          {/* Hour lines */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-neon-blue/10 flex"
              style={{ top: `${(hour - 6) * 60}px`, height: '60px' }}
            >
              {/* Hour label */}
              <div className="w-20 px-3 py-1 text-xs text-gray-400 bg-space-dark/50">
                {formatHour(hour)}
              </div>
              {/* Grid cell */}
              <div className="flex-1 calendar-cell" />
            </div>
          ))}

          {/* Current time indicator */}
          {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
            <div
              className="absolute left-20 right-0 h-0.5 bg-neon-green z-20 flex items-center"
              style={{ top: getCurrentTimePosition() }}
            >
              <div className="w-3 h-3 rounded-full bg-neon-green -ml-1.5" />
              <span className="text-xs text-neon-green ml-2 bg-space-dark px-1">
                {format(currentTime, 'h:mm a')}
              </span>
            </div>
          )}

          {/* Tasks */}
          <div className="absolute left-20 right-4 top-0">
            {dayTasks.map((task) => {
              const stale = isTaskStale(task)
              const hoursInactive = getHoursWithoutActivity(task)

              return (
                <div
                  key={task.id}
                  className={`absolute left-0 right-0 mx-2 task-item ${getStatusColor(task)} rounded-lg p-3 cursor-pointer hover:opacity-90 transition overflow-hidden ${
                    stale ? 'ring-2 ring-red-500 animate-pulse' : ''
                  }`}
                  style={getTaskStyle(task)}
                  onClick={() => onSelectTask(task)}
                >
                  {/* Stale indicator badge */}
                  {stale && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span>🔴</span>
                      <span>{hoursInactive}h</span>
                    </div>
                  )}

                  <div className="font-semibold text-sm truncate">{task.name}</div>
                  {parseFloat(getTaskStyle(task).height) > 50 && (
                    <div className="text-xs text-gray-300 mt-1 truncate">
                      {task.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {format(parseISO(task.startTime), 'h:mm a')} - {format(parseISO(task.endTime), 'h:mm a')}
                  </div>

                  {/* Stale warning text */}
                  {stale && parseFloat(getTaskStyle(task).height) > 60 && (
                    <div className="text-xs text-red-400 mt-1 font-medium">
                      No activity for {hoursInactive} hours
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neon-blue rounded" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-neon-green rounded" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-alibaba-orange rounded" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded ring-2 ring-red-500/50" />
          <span>Stale (No Activity)</span>
        </div>
      </div>
    </div>
  )
}
