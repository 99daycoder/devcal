'use client'

// ============================================
// TEMPLATE GENERATOR COMPONENT
// ============================================
// Generate pre-made task templates for common
// development workflows like building a To-Do app

import { useState } from 'react'
import { format, addDays, setHours, setMinutes } from 'date-fns'

// Project templates
const PROJECT_TEMPLATES = {
  'todo-app': {
    name: 'To-Do List App',
    description: 'Build a full-stack to-do list application',
    icon: '✅',
    duration: '3 days',
    tasks: [
      // Day 1
      { day: 0, name: 'Set up project structure', description: 'Initialize Next.js, install dependencies', startHour: 9, endHour: 10, keywords: ['setup', 'nextjs', 'init'] },
      { day: 0, name: 'Design database schema', description: 'Plan data models for todos', startHour: 10, endHour: 11, keywords: ['database', 'schema', 'models'] },
      { day: 0, name: 'Create Todo model', description: 'Define todo entity with fields', startHour: 11, endHour: 12, keywords: ['model', 'todo', 'entity'] },
      { day: 0, name: 'Build API endpoints', description: 'Create CRUD routes for todos', startHour: 13, endHour: 15, keywords: ['api', 'crud', 'routes', 'endpoints'] },
      { day: 0, name: 'Add input validation', description: 'Validate todo data on server', startHour: 15, endHour: 16, keywords: ['validation', 'input', 'server'] },
      // Day 2
      { day: 1, name: 'Build Todo list component', description: 'Display list of todos', startHour: 9, endHour: 11, keywords: ['component', 'list', 'display'] },
      { day: 1, name: 'Add todo form', description: 'Form to create new todos', startHour: 11, endHour: 12, keywords: ['form', 'create', 'input'] },
      { day: 1, name: 'Implement edit functionality', description: 'Allow editing existing todos', startHour: 13, endHour: 14, keywords: ['edit', 'update', 'modify'] },
      { day: 1, name: 'Add delete with confirmation', description: 'Delete todos with confirm dialog', startHour: 14, endHour: 15, keywords: ['delete', 'remove', 'confirm'] },
      { day: 1, name: 'Style with Tailwind', description: 'Add responsive styling', startHour: 15, endHour: 17, keywords: ['style', 'tailwind', 'css', 'responsive'] },
      // Day 3
      { day: 2, name: 'Add filtering', description: 'Filter by status (all/active/completed)', startHour: 9, endHour: 10, keywords: ['filter', 'status', 'search'] },
      { day: 2, name: 'Add sorting', description: 'Sort by date, priority', startHour: 10, endHour: 11, keywords: ['sort', 'order', 'priority'] },
      { day: 2, name: 'Write unit tests', description: 'Test API and components', startHour: 11, endHour: 13, keywords: ['test', 'unit', 'jest'] },
      { day: 2, name: 'Add error handling', description: 'Handle edge cases and errors', startHour: 14, endHour: 15, keywords: ['error', 'handling', 'edge'] },
      { day: 2, name: 'Deploy to production', description: 'Deploy app to Vercel', startHour: 15, endHour: 17, keywords: ['deploy', 'vercel', 'production'] },
    ]
  },
  'auth-system': {
    name: 'Authentication System',
    description: 'Build user authentication with JWT',
    icon: '🔐',
    duration: '2 days',
    tasks: [
      { day: 0, name: 'Set up auth dependencies', description: 'Install bcrypt, JWT packages', startHour: 9, endHour: 10, keywords: ['auth', 'bcrypt', 'jwt'] },
      { day: 0, name: 'Create user model', description: 'User schema with password hash', startHour: 10, endHour: 11, keywords: ['user', 'model', 'password'] },
      { day: 0, name: 'Build registration endpoint', description: 'Sign up with email/password', startHour: 11, endHour: 13, keywords: ['register', 'signup', 'endpoint'] },
      { day: 0, name: 'Build login endpoint', description: 'Login with JWT generation', startHour: 14, endHour: 16, keywords: ['login', 'jwt', 'token'] },
      { day: 1, name: 'Create auth middleware', description: 'Protect routes with JWT', startHour: 9, endHour: 11, keywords: ['middleware', 'protect', 'routes'] },
      { day: 1, name: 'Build login form UI', description: 'Login and register forms', startHour: 11, endHour: 13, keywords: ['form', 'ui', 'login'] },
      { day: 1, name: 'Add password reset', description: 'Forgot password flow', startHour: 14, endHour: 16, keywords: ['password', 'reset', 'email'] },
    ]
  },
  'api-integration': {
    name: 'API Integration',
    description: 'Integrate with external APIs',
    icon: '🔌',
    duration: '1 day',
    tasks: [
      { day: 0, name: 'Research API docs', description: 'Understand API endpoints', startHour: 9, endHour: 10, keywords: ['research', 'api', 'docs'] },
      { day: 0, name: 'Set up API client', description: 'Create fetch wrapper', startHour: 10, endHour: 11, keywords: ['client', 'fetch', 'wrapper'] },
      { day: 0, name: 'Implement auth flow', description: 'API key or OAuth setup', startHour: 11, endHour: 12, keywords: ['auth', 'oauth', 'apikey'] },
      { day: 0, name: 'Build data fetching', description: 'GET endpoints integration', startHour: 13, endHour: 15, keywords: ['fetch', 'get', 'data'] },
      { day: 0, name: 'Add error handling', description: 'Handle API errors gracefully', startHour: 15, endHour: 16, keywords: ['error', 'handling', 'retry'] },
      { day: 0, name: 'Add caching', description: 'Cache API responses', startHour: 16, endHour: 17, keywords: ['cache', 'optimize', 'performance'] },
    ]
  }
}

export default function TemplateGenerator({ onGenerateTemplate, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState('todo-app')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isGenerating, setIsGenerating] = useState(false)
  const [simulateInterruption, setSimulateInterruption] = useState(true)
  const [interruptionHours, setInterruptionHours] = useState(8)

  const template = PROJECT_TEMPLATES[selectedTemplate]

  // Generate tasks from template
  const handleGenerate = async () => {
    setIsGenerating(true)

    try {
      const tasks = []
      const baseDate = new Date(startDate)
      const now = new Date()

      template.tasks.forEach((taskTemplate, index) => {
        const taskDate = addDays(baseDate, taskTemplate.day)
        const startTime = setMinutes(setHours(taskDate, taskTemplate.startHour), 0)
        const endTime = setMinutes(setHours(taskDate, taskTemplate.endHour), 0)

        // Calculate if this task is "stale" (past the interruption point)
        const hoursAgo = new Date(now.getTime() - (interruptionHours * 60 * 60 * 1000))

        let status = 'pending'
        let lastActivity = null

        if (simulateInterruption) {
          // Tasks before the interruption are "completed"
          // Tasks during/after are "stale" (pending with no activity)
          if (endTime < hoursAgo) {
            status = 'completed'
            lastActivity = endTime.toISOString()
          } else if (startTime < hoursAgo) {
            // Task was in progress when interruption happened
            status = 'in_progress'
            lastActivity = hoursAgo.toISOString()
          }
          // Tasks after hoursAgo remain 'pending' with no lastActivity
        }

        tasks.push({
          id: `template_${Date.now()}_${index}`,
          name: taskTemplate.name,
          description: taskTemplate.description,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status,
          lastActivity,
          keywords: taskTemplate.keywords,
          isStale: simulateInterruption && startTime < now && !lastActivity && status === 'pending',
          hoursWithoutActivity: simulateInterruption && !lastActivity && startTime < hoursAgo
            ? Math.round((now - startTime) / (1000 * 60 * 60))
            : null
        })
      })

      await onGenerateTemplate?.(tasks)
      onClose?.()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 lightbox-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="relative holo-panel p-8 w-full max-w-2xl mx-4 modal-enter max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-bold neon-text"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Generate Task Template
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Template Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Select Project Template
          </label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(PROJECT_TEMPLATES).map(([key, tmpl]) => (
              <button
                key={key}
                onClick={() => setSelectedTemplate(key)}
                className={`p-4 rounded-lg border text-left transition ${
                  selectedTemplate === key
                    ? 'bg-neon-blue/20 border-neon-blue'
                    : 'bg-space-dark/50 border-neon-blue/20 hover:border-neon-blue/50'
                }`}
              >
                <div className="text-2xl mb-2">{tmpl.icon}</div>
                <div className="font-medium text-sm">{tmpl.name}</div>
                <div className="text-xs text-gray-400 mt-1">{tmpl.duration}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Preview */}
        <div className="mb-6 p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20">
          <h3 className="font-semibold mb-2">{template.name}</h3>
          <p className="text-sm text-gray-400 mb-3">{template.description}</p>
          <div className="text-xs text-gray-500">
            {template.tasks.length} tasks over {template.duration}
          </div>

          {/* Task preview list */}
          <div className="mt-4 max-h-40 overflow-y-auto space-y-1">
            {template.tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-gray-600">Day {task.day + 1}:</span>
                <span>{task.name}</span>
                <span className="text-gray-600">({task.startHour}:00-{task.endHour}:00)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Simulation Options */}
        <div className="mb-6 p-4 rounded-lg bg-alibaba-orange/10 border border-alibaba-orange/30">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={simulateInterruption}
              onChange={(e) => setSimulateInterruption(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Simulate Interruption</span>
              <p className="text-sm text-gray-400">
                Pretend you stopped working {interruptionHours} hours ago
              </p>
            </div>
          </label>

          {simulateInterruption && (
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">
                Hours since last activity: {interruptionHours}h
              </label>
              <input
                type="range"
                min="1"
                max="24"
                value={interruptionHours}
                onChange={(e) => setInterruptionHours(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 hour</span>
                <span>24 hours</span>
              </div>
            </div>
          )}
        </div>

        {/* What will happen */}
        <div className="mb-6 p-4 rounded-lg bg-space-dark border border-neon-blue/20">
          <h4 className="font-medium text-sm mb-2">What will be generated:</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• {template.tasks.length} tasks added to your calendar</li>
            {simulateInterruption && (
              <>
                <li>• Tasks from {interruptionHours}+ hours ago marked as completed</li>
                <li>• Recent tasks shown in RED (stale/no activity)</li>
                <li>• Catchup video will brief you on the gap</li>
              </>
            )}
          </ul>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full neon-button py-4 rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="loading-spinner w-5 h-5" />
              Generating...
            </>
          ) : (
            <>
              <span>{template.icon}</span>
              Generate {template.name} Tasks
            </>
          )}
        </button>
      </div>
    </div>
  )
}
