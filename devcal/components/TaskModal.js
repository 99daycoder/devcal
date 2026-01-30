'use client'

// ============================================
// TASK MODAL COMPONENT
// ============================================
// Modal form for creating and editing tasks

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function TaskModal({ isOpen, onClose, onSave, task, selectedDate }) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startTime: '09:00',
    endTime: '12:00',
    date: format(new Date(), 'yyyy-MM-dd')
  })

  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Update form when task changes (for editing)
  useEffect(() => {
    if (task) {
      const startDate = new Date(task.startTime)
      const endDate = new Date(task.endTime)

      setFormData({
        name: task.name || '',
        description: task.description || '',
        startTime: format(startDate, 'HH:mm'),
        endTime: format(endDate, 'HH:mm'),
        date: format(startDate, 'yyyy-MM-dd')
      })
    } else {
      // Reset form for new task
      setFormData({
        name: '',
        description: '',
        startTime: '09:00',
        endTime: '12:00',
        date: format(selectedDate || new Date(), 'yyyy-MM-dd')
      })
    }
    setError(null)
  }, [task, selectedDate, isOpen])

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  // Validate form
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Task name is required')
      return false
    }

    if (formData.startTime >= formData.endTime) {
      setError('End time must be after start time')
      return false
    }

    return true
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setError(null)

    try {
      // Construct full datetime strings
      const taskData = {
        id: task?.id || undefined,
        name: formData.name.trim(),
        description: formData.description.trim(),
        startTime: `${formData.date}T${formData.startTime}:00`,
        endTime: `${formData.date}T${formData.endTime}:00`
      }

      await onSave(taskData)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save task')
    } finally {
      setIsLoading(false)
    }
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

      {/* Modal */}
      <div className="relative holo-panel p-8 w-full max-w-lg mx-4 modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-bold neon-text"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Build authentication module"
              className="w-full"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="What will you be working on?"
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full"
              />
            </div>
          </div>

          {/* Duration Display */}
          <div className="text-sm text-gray-400">
            Duration: {calculateDuration(formData.startTime, formData.endTime)}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg bg-gray-600/50 hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="neon-button px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="loading-spinner w-4 h-4" />
                  Saving...
                </span>
              ) : (
                task ? 'Update Task' : 'Create Task'
              )}
            </button>
          </div>
        </form>

        {/* Quick Time Presets */}
        <div className="mt-6 pt-6 border-t border-neon-blue/20">
          <p className="text-sm text-gray-400 mb-3">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Morning (9-12)', start: '09:00', end: '12:00' },
              { label: 'Afternoon (1-5)', start: '13:00', end: '17:00' },
              { label: '1 Hour', start: '09:00', end: '10:00' },
              { label: '2 Hours', start: '09:00', end: '11:00' },
              { label: 'Full Day (9-5)', start: '09:00', end: '17:00' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  startTime: preset.start,
                  endTime: preset.end
                }))}
                className="px-3 py-1 text-sm rounded-full bg-space-dark border border-neon-blue/30 hover:border-neon-blue transition"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Calculate duration between two times
 */
function calculateDuration(start, end) {
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)

  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM)

  if (totalMinutes < 0) {
    return 'Invalid time range'
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} minutes`
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    return `${hours}h ${minutes}m`
  }
}
