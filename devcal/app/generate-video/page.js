'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function GenerateVideoPage() {
  const [prompt, setPrompt] = useState('A futuristic holographic AI assistant in a dark tech command center with blue glowing displays')
  const [status, setStatus] = useState('idle') // idle, generating, checking, completed, error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [taskId, setTaskId] = useState(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setStatus('generating')
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        setTaskId(data.taskId)

        if (data.status === 'processing') {
          setStatus('checking')
          // Start polling for status
          pollStatus(data.taskId)
        } else if (data.videoUrl) {
          setStatus('completed')
        } else {
          setStatus('completed')
        }
      } else {
        setError(data.error || 'Failed to generate video')
        setStatus('error')
      }
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const pollStatus = async (id) => {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/generate-video?taskId=${id}`)
        const data = await response.json()

        if (data.status === 'completed' && data.videoUrl) {
          clearInterval(checkInterval)
          setResult(data)
          setStatus('completed')
        } else if (data.status === 'failed') {
          clearInterval(checkInterval)
          setError(data.error || 'Video generation failed')
          setStatus('error')
        }
        // Keep polling if still processing
      } catch (err) {
        // Ignore polling errors, keep trying
      }
    }, 10000) // Check every 10 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(checkInterval), 300000)
  }

  const checkStatusManually = async () => {
    if (!taskId) return

    setStatus('checking')
    try {
      const response = await fetch(`/api/generate-video?taskId=${taskId}`)
      const data = await response.json()
      setResult(data)

      if (data.status === 'completed' && data.videoUrl) {
        setStatus('completed')
      } else if (data.status === 'failed') {
        setError(data.error)
        setStatus('error')
      } else {
        setStatus('checking')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">
            🎬 Video Generator
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Prompt Input */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-cyan-500/30">
          <label className="block text-cyan-300 mb-2 font-medium">
            Video Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
            disabled={status === 'generating' || status === 'checking'}
          />

          <div className="mt-4 flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={status === 'generating' || status === 'checking'}
              className={`px-6 py-3 rounded-lg font-bold transition ${
                status === 'generating' || status === 'checking'
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500'
              }`}
            >
              {status === 'generating' ? '⏳ Generating...' :
               status === 'checking' ? '🔄 Processing...' :
               '🎬 Generate Video'}
            </button>

            {taskId && status === 'checking' && (
              <button
                onClick={checkStatusManually}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition"
              >
                🔍 Check Status
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 mb-6">
            <h3 className="text-red-400 font-bold mb-2">❌ Error</h3>
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="bg-gray-800 rounded-xl p-6 border border-cyan-500/30">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              {status === 'completed' ? '✅ Video Ready' :
               status === 'checking' ? '⏳ Processing' :
               '📋 Result'}
            </h3>

            {/* Task ID */}
            {result.taskId && (
              <div className="mb-4">
                <span className="text-gray-400">Task ID: </span>
                <code className="bg-gray-900 px-2 py-1 rounded text-cyan-300">
                  {result.taskId}
                </code>
              </div>
            )}

            {/* Status */}
            <div className="mb-4">
              <span className="text-gray-400">Status: </span>
              <span className={`font-bold ${
                result.status === 'completed' ? 'text-green-400' :
                result.status === 'failed' ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                {result.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>

            {/* Video URL */}
            {result.videoUrl && (
              <div className="mb-4">
                <span className="text-gray-400">Video URL: </span>
                <a
                  href={result.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline break-all"
                >
                  {result.videoUrl}
                </a>
              </div>
            )}

            {/* Video Player */}
            {result.videoUrl && status === 'completed' && (
              <div className="mt-4">
                <video
                  controls
                  className="w-full rounded-lg border border-gray-600"
                  src={result.videoUrl}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            )}

            {/* API Response */}
            {result.apiResponse && (
              <div className="mt-4">
                <h4 className="text-gray-400 mb-2">API Response:</h4>
                <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm text-gray-300">
                  {JSON.stringify(result.apiResponse, null, 2)}
                </pre>
              </div>
            )}

            {/* Processing Message */}
            {status === 'checking' && (
              <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-300">
                  ⏳ Video is being generated. This typically takes 1-5 minutes.
                  The page will auto-refresh when ready.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sample Prompts */}
        <div className="mt-8 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-gray-300 mb-4">💡 Sample Prompts</h3>
          <div className="space-y-2">
            {[
              'A futuristic holographic AI assistant in a dark tech command center with blue glowing displays',
              'A robot working at a computer desk in a modern office with city lights in the background',
              'Abstract flowing data streams and code visualization in a cyberpunk aesthetic',
              'A 3D animated character presenting charts and graphs in a professional setting',
            ].map((sample, i) => (
              <button
                key={i}
                onClick={() => setPrompt(sample)}
                className="block w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition text-sm"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
