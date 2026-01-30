'use client'

// ============================================
// MONTHLY PROGRESS COMPONENT
// ============================================
// Tracks skill improvement over months
// Uses Neo4j's graph capabilities to show
// how skills connect and improve over time

import { useState, useEffect } from 'react'
import { format, subMonths } from 'date-fns'

export default function MonthlyProgress({ onGenerateMonthlyVideo }) {
  const [monthlyData, setMonthlyData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [viewMode, setViewMode] = useState('overview') // overview, skills, graph

  // Fetch monthly progress data
  useEffect(() => {
    fetchMonthlyProgress()
  }, [])

  const fetchMonthlyProgress = async () => {
    setIsLoading(true)
    try {
      // In demo mode, generate mock data
      const mockData = generateMockMonthlyData()
      setMonthlyData(mockData)
    } catch (error) {
      console.error('Error fetching monthly progress:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get trend arrow and color
  const getTrendIndicator = (trend, change) => {
    if (trend === 'improving') {
      return { arrow: '↑', color: 'text-neon-green', label: `+${change}` }
    } else if (trend === 'declining') {
      return { arrow: '↓', color: 'text-red-500', label: `${change}` }
    }
    return { arrow: '→', color: 'text-gray-400', label: '0' }
  }

  if (isLoading) {
    return (
      <div className="holo-panel p-8 text-center">
        <div className="loading-spinner w-12 h-12 mx-auto mb-4" />
        <p className="text-gray-400">Loading monthly progress...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="holo-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-xl font-bold neon-text"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Monthly Knowledge Graph
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Track how your skills improve over time
            </p>
          </div>

          {/* View toggle */}
          <div className="flex gap-2">
            {[
              { key: 'overview', label: '📊 Overview' },
              { key: 'skills', label: '🎯 Skills' },
              { key: 'graph', label: '🔗 Graph' },
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

        {/* Month Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon="📅"
            label="This Month"
            value={monthlyData?.currentMonth || 'Jan'}
            color="text-neon-blue"
          />
          <StatCard
            icon="💾"
            label="Commits"
            value={monthlyData?.totalCommits || 0}
            color="text-neon-green"
          />
          <StatCard
            icon="🎯"
            label="Skills Active"
            value={monthlyData?.activeSkills || 0}
            color="text-neon-purple"
          />
          <StatCard
            icon="📈"
            label="Improving"
            value={monthlyData?.improvingSkills || 0}
            color="text-alibaba-orange"
          />
        </div>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && (
        <div className="holo-panel p-6">
          <h3 className="font-semibold text-gray-300 mb-4">Skill Progress Over Time</h3>

          {/* Mini chart for each skill */}
          <div className="space-y-4">
            {monthlyData?.skills.map((skill, index) => {
              const trend = getTrendIndicator(skill.trend, skill.change)

              return (
                <div
                  key={skill.name}
                  className="p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20 hover:border-neon-blue/50 cursor-pointer transition"
                  onClick={() => {
                    setSelectedSkill(skill)
                    setViewMode('skills')
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{skill.icon}</span>
                      <div>
                        <div className="font-medium">{skill.name}</div>
                        <div className="text-xs text-gray-500">
                          {skill.commits} commits this month
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Trend indicator */}
                      <div className={`flex items-center gap-1 ${trend.color}`}>
                        <span className="text-lg">{trend.arrow}</span>
                        <span className="text-sm font-bold">{trend.label}</span>
                      </div>

                      {/* Skill level */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-neon-blue">
                          {skill.level}
                        </div>
                        <div className="text-xs text-gray-500">/10</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar showing monthly history */}
                  <div className="flex items-center gap-1">
                    {skill.history.map((level, i) => (
                      <div
                        key={i}
                        className="flex-1 h-6 rounded relative overflow-hidden"
                        style={{
                          background: `linear-gradient(to top, ${
                            level >= 8 ? 'rgba(0, 255, 136, 0.3)' :
                            level >= 5 ? 'rgba(0, 212, 255, 0.3)' :
                            level >= 3 ? 'rgba(255, 106, 0, 0.3)' :
                            'rgba(100, 100, 100, 0.3)'
                          } ${level * 10}%, transparent ${level * 10}%)`
                        }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all"
                          style={{
                            height: `${level * 10}%`,
                            background: level >= 8 ? '#00ff88' :
                                       level >= 5 ? '#00d4ff' :
                                       level >= 3 ? '#ff6a00' : '#666'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>6 months ago</span>
                    <span>Now</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skills Detail View */}
      {viewMode === 'skills' && (
        <div className="holo-panel p-6">
          <h3 className="font-semibold text-gray-300 mb-4">Skill Details</h3>

          {selectedSkill ? (
            <div className="space-y-6">
              {/* Selected skill header */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-neon-blue/10 border border-neon-blue/30">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{selectedSkill.icon}</span>
                  <div>
                    <h4 className="text-xl font-bold">{selectedSkill.name}</h4>
                    <p className="text-gray-400">
                      Level {selectedSkill.level}/10 • {selectedSkill.commits} commits
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕ Clear
                </button>
              </div>

              {/* Prerequisites */}
              {selectedSkill.prerequisites?.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Prerequisites</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkill.prerequisites.map(prereq => (
                      <span
                        key={prereq}
                        className="px-3 py-1 rounded-full bg-neon-green/20 border border-neon-green/30 text-sm"
                      >
                        ✓ {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Enables */}
              {selectedSkill.enables?.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-400 mb-2">Unlocks</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedSkill.enables.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-neon-purple/20 border border-neon-purple/30 text-sm"
                      >
                        → {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly breakdown */}
              <div>
                <h5 className="text-sm font-medium text-gray-400 mb-2">Monthly History</h5>
                <div className="grid grid-cols-6 gap-2">
                  {selectedSkill.history.map((level, i) => {
                    const month = format(subMonths(new Date(), 5 - i), 'MMM')
                    return (
                      <div key={i} className="text-center">
                        <div
                          className="h-24 rounded-lg flex items-end justify-center p-2"
                          style={{
                            background: `linear-gradient(to top, ${
                              level >= 8 ? 'rgba(0, 255, 136, 0.5)' :
                              level >= 5 ? 'rgba(0, 212, 255, 0.5)' :
                              'rgba(255, 106, 0, 0.5)'
                            } ${level * 10}%, rgba(26, 26, 62, 0.5) ${level * 10}%)`
                          }}
                        >
                          <span className="text-lg font-bold">{level}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{month}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {monthlyData?.skills.map(skill => (
                <button
                  key={skill.name}
                  onClick={() => setSelectedSkill(skill)}
                  className="p-4 rounded-lg bg-space-dark/50 border border-neon-blue/20 hover:border-neon-blue/50 text-left transition"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <span className="font-medium">{skill.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Level {skill.level}</span>
                    <span className={getTrendIndicator(skill.trend, skill.change).color}>
                      {getTrendIndicator(skill.trend, skill.change).arrow} {skill.trend}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Graph View - Visual representation */}
      {viewMode === 'graph' && (
        <div className="holo-panel p-6">
          <h3 className="font-semibold text-gray-300 mb-4">Skill Knowledge Graph</h3>
          <p className="text-sm text-gray-400 mb-4">
            This shows how skills connect - you need prerequisites before advancing
          </p>

          {/* Simple text-based graph representation */}
          <div className="p-6 rounded-lg bg-space-dark/50 border border-neon-blue/20">
            <div className="space-y-6">
              {/* Level 1 - Foundation */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Foundation</div>
                <div className="flex justify-center gap-8">
                  <SkillNode name="JavaScript" level={8} isActive />
                  <SkillNode name="CSS" level={6} isActive />
                  <SkillNode name="Database" level={4} />
                </div>
              </div>

              {/* Arrows down */}
              <div className="flex justify-center text-neon-blue/50 text-2xl">
                ↓ ↓ ↓
              </div>

              {/* Level 2 - Intermediate */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Intermediate</div>
                <div className="flex justify-center gap-8">
                  <SkillNode name="TypeScript" level={5} isActive />
                  <SkillNode name="React" level={7} isActive />
                  <SkillNode name="Node.js" level={6} isActive />
                  <SkillNode name="Neo4j" level={3} />
                </div>
              </div>

              {/* Arrows down */}
              <div className="flex justify-center text-neon-blue/50 text-2xl">
                ↓ ↓ ↓
              </div>

              {/* Level 3 - Advanced */}
              <div>
                <div className="text-xs text-gray-500 mb-2">Advanced</div>
                <div className="flex justify-center gap-8">
                  <SkillNode name="API Design" level={5} isActive />
                  <SkillNode name="Testing" level={3} />
                  <SkillNode name="Authentication" level={4} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            * Size indicates skill level • Colored nodes are actively being used
          </p>
        </div>
      )}

      {/* Generate Video Button */}
      <button
        onClick={onGenerateMonthlyVideo}
        className="w-full neon-button py-4 rounded-lg font-semibold flex items-center justify-center gap-3"
      >
        <span className="text-xl">🎬</span>
        Generate Monthly Progress Video
      </button>
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

// Skill node for graph view
function SkillNode({ name, level, isActive = false }) {
  const size = 40 + (level * 8) // Size based on level

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`rounded-full flex items-center justify-center font-bold text-sm transition ${
          isActive
            ? 'bg-gradient-to-br from-neon-blue to-neon-purple'
            : 'bg-gray-700'
        }`}
        style={{ width: size, height: size }}
      >
        {level}
      </div>
      <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-500'}`}>
        {name}
      </span>
    </div>
  )
}

// Generate mock monthly data
function generateMockMonthlyData() {
  const now = new Date()

  return {
    currentMonth: format(now, 'MMMM yyyy'),
    totalCommits: 47,
    activeSkills: 7,
    improvingSkills: 4,
    skills: [
      {
        name: 'JavaScript',
        icon: '🟨',
        level: 8,
        commits: 23,
        history: [5, 6, 6, 7, 8, 8],
        trend: 'improving',
        change: 3,
        prerequisites: [],
        enables: ['TypeScript', 'React', 'Node.js']
      },
      {
        name: 'React',
        icon: '⚛️',
        level: 7,
        commits: 18,
        history: [3, 4, 5, 6, 6, 7],
        trend: 'improving',
        change: 4,
        prerequisites: ['JavaScript'],
        enables: ['Testing']
      },
      {
        name: 'TypeScript',
        icon: '🔷',
        level: 5,
        commits: 12,
        history: [2, 2, 3, 4, 5, 5],
        trend: 'improving',
        change: 3,
        prerequisites: ['JavaScript'],
        enables: []
      },
      {
        name: 'Node.js',
        icon: '🟢',
        level: 6,
        commits: 15,
        history: [4, 4, 5, 5, 6, 6],
        trend: 'stable',
        change: 2,
        prerequisites: ['JavaScript'],
        enables: ['API Design']
      },
      {
        name: 'API Design',
        icon: '🔌',
        level: 5,
        commits: 10,
        history: [2, 3, 3, 4, 4, 5],
        trend: 'improving',
        change: 3,
        prerequisites: ['Node.js'],
        enables: ['Authentication']
      },
      {
        name: 'CSS',
        icon: '🎨',
        level: 6,
        commits: 8,
        history: [5, 5, 6, 6, 6, 6],
        trend: 'stable',
        change: 1,
        prerequisites: [],
        enables: []
      },
      {
        name: 'Testing',
        icon: '🧪',
        level: 3,
        commits: 4,
        history: [1, 1, 2, 2, 2, 3],
        trend: 'improving',
        change: 2,
        prerequisites: ['React'],
        enables: []
      },
      {
        name: 'Neo4j',
        icon: '🔗',
        level: 3,
        commits: 5,
        history: [0, 0, 1, 2, 2, 3],
        trend: 'improving',
        change: 3,
        prerequisites: ['Database'],
        enables: []
      }
    ]
  }
}
