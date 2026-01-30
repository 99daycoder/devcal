// ============================================
// DEVCAL - ROOT LAYOUT
// This wraps all pages in the application
// ============================================

import './globals.css'

// Metadata for the application (shows in browser tab)
export const metadata = {
  title: 'DevCal - Developer Productivity Calendar',
  description: 'Track what you plan vs what you actually code. AI-powered catchup videos.',
  keywords: 'developer, productivity, calendar, git, neo4j, ai video',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts - Space-themed font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen grid-overlay"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Main application container */}
        <div className="min-h-screen flex flex-col">
          {/* Header with sponsor logos */}
          <header className="command-header px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple flex items-center justify-center">
                  <span className="text-xl">📅</span>
                </div>
                <h1
                  className="text-2xl font-bold neon-text"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  DevCal
                </h1>
              </div>

              {/* Sponsor logos */}
              <div className="flex items-center gap-6">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Powered by</span>
                <div className="flex items-center gap-4">
                  {/* GitHub */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-github-black/50">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    <span className="text-sm font-medium">GitHub</span>
                  </div>
                  {/* Neo4j */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neo4j-blue/30">
                    <span className="text-lg">🔗</span>
                    <span className="text-sm font-medium">Neo4j</span>
                  </div>
                  {/* Alibaba */}
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-alibaba-orange/30">
                    <span className="text-lg">🎬</span>
                    <span className="text-sm font-medium">Alibaba WAN</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-neon-blue/20 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-400">
              <span>DevCal v1.0 - GitHub Hackathon 2024</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green status-pulse"></span>
                System Online
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
