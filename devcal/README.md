# DevCal - Developer Productivity Calendar

> Track what you plan vs what you actually code. AI-powered catchup videos.

Built for GitHub Hackathon 2024 | Powered by **Neo4j** + **Alibaba WAN**

---

## Quick Start (Copy-Paste Ready!)

### Step 1: Prerequisites

Make sure you have these installed:

- **Node.js 18+** - Download from https://nodejs.org/
- **Git** - Download from https://git-scm.com/
- **Neo4j** - See installation below

### Step 2: Install Dependencies

```powershell
# Navigate to the devcal folder
cd devcal

# Install all packages
npm install
```

### Step 3: Configure Environment

1. Open `.env.local` in a text editor
2. Update these values:

```env
# Neo4j (use default for local install)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password_here

# Your name for the video
CAPTAIN_NAME=Sam

# Enable demo mode (works without APIs)
DEMO_MODE=true
```

### Step 4: Start the App

```powershell
npm run dev
```

Open http://localhost:3000 in your browser!

---

## Full Setup Guide

### Installing Neo4j

#### Option A: Neo4j Desktop (Recommended for Demo)

1. Go to https://neo4j.com/download/
2. Download Neo4j Desktop
3. Install and create a new project
4. Create a local database
5. Set password (remember it for `.env.local`)
6. Start the database

#### Option B: Neo4j Aura (Cloud - Free)

1. Go to https://neo4j.com/cloud/aura-free/
2. Sign up for free account
3. Create a free database
4. Copy the connection URI and credentials
5. Update `.env.local` with cloud credentials

#### Option C: Docker

```powershell
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  neo4j:latest
```

### Setting Up Neo4j Database

After Neo4j is running:

```powershell
# Run the setup script
npm run setup-neo4j
```

This creates the database schema and sample data.

### Getting Alibaba WAN API (Optional)

For real video generation:

1. Go to https://dashscope.aliyun.com/
2. Create an account
3. Get your API key
4. Update `.env.local`:

```env
DASHSCOPE_API_KEY=your_api_key_here
DEMO_MODE=false
```

> **Note:** The app works in demo mode without the API key!

---

## Running the Auto-Commit Script

The PowerShell script commits your code changes every 60 seconds.

### First Time Setup

```powershell
# Allow running PowerShell scripts (run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Start Auto-Commits

```powershell
# Navigate to your project folder (not devcal)
cd C:\path\to\your\project

# Run the script
C:\path\to\devcal\scripts\autocommit.ps1
```

### What It Does

1. Creates a `pending` branch
2. Checks for file changes every 60 seconds
3. Auto-commits with timestamped messages
4. Logs all activity

Press `Ctrl+C` to stop.

---

## Project Structure

```
devcal/
├── app/
│   ├── page.js              # Main calendar page
│   ├── layout.js            # App layout with header
│   ├── globals.css          # Space theme styles
│   ├── history/
│   │   └── page.js          # Video history page
│   └── api/
│       ├── tasks/route.js   # Task CRUD API
│       ├── video/route.js   # Video generation API
│       ├── commits/route.js # Commit analysis API
│       └── analysis/route.js# Gap analysis API
├── components/
│   ├── Calendar.js          # Calendar UI
│   ├── TaskModal.js         # Add/edit task form
│   ├── VideoPlayer.js       # Video lightbox
│   ├── VideoHistory.js      # Past videos list
│   └── TimelineSlider.js    # Timeline with slider
├── lib/
│   ├── neo4j.js             # Database connection
│   ├── wan.js               # Video API wrapper
│   └── git.js               # Git analysis
├── scripts/
│   ├── autocommit.ps1       # Auto-commit script
│   ├── setup-neo4j.js       # Database setup
│   └── analyze-commits.js   # Sync commits
├── .env.local               # Environment config
└── package.json
```

---

## Demo Flow for Judges

### 2-Minute Demo Script

1. **Show the Calendar** (20 sec)
   - Point out the space station theme
   - Show the date navigation
   - Click "Add Task" and create a demo task

2. **Show the Auto-Commit Script** (30 sec)
   - Open PowerShell terminal
   - Run the auto-commit script
   - Make a small code change
   - Watch it auto-commit

3. **Generate Briefing Video** (40 sec)
   - Click "Generate Briefing"
   - Video lightbox appears
   - Show the AI script/transcript
   - Point out the analysis summary

4. **Show Timeline** (20 sec)
   - Click Timeline tab
   - Drag the slider
   - Show knowledge gaps report

5. **Show Neo4j Graph** (10 sec)
   - Open Neo4j Browser
   - Run: `MATCH (n) RETURN n`
   - Show the graph visualization

### Demo Talking Points

- "DevCal tracks what you PLANNED vs what you ACTUALLY coded"
- "The auto-commit script captures every change you make"
- "Neo4j graphs the relationships between tasks and commits"
- "Alibaba WAN generates personalized catchup videos"
- "The timeline slider lets you travel through your coding history"

---

## Features

### Developer Memory Platform (NEW!)
- **Context Recall** - Instantly see what you were working on
- **Skills Tracking** - Monitor your skill development over time
- **Knowledge Gaps** - Identify areas to improve
- **Export for AI** - Copy context to Claude/ChatGPT
- **MCP Integration** - AI assistants can access your context directly

### Calendar View
- Add tasks with time blocks
- Visual timeline with current time indicator
- Color-coded task status (pending, in-progress, completed)
- **Stale Task Detection** - RED indicators for inactive tasks

### Video Briefings
- AI-generated catchup videos
- Futuristic space station theme
- Captain Sam addressing format
- Shows completed vs pending work

### Timeline Slider
- Scrub through your coding history
- See features added/removed
- Bug fix tracking
- Knowledge gap analysis

### Neo4j Knowledge Graph
- Tasks stored as nodes with dependencies
- Skills linked to tasks and commits
- File modifications tracked
- **Skill prerequisites** (JavaScript → React → Testing)
- **Impact analysis** - What breaks if I change this?
- **Monthly progress tracking**

---

## Troubleshooting

### "Cannot connect to Neo4j"

```powershell
# Check if Neo4j is running
# Neo4j Desktop: Click the "Start" button
# Docker: docker ps

# Verify credentials in .env.local
```

### "PowerShell script won't run"

```powershell
# Run as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Module not found"

```powershell
# Make sure you're in the devcal folder
cd devcal

# Reinstall dependencies
npm install
```

### "Port 3000 already in use"

```powershell
# Find what's using the port
netstat -ano | findstr :3000

# Or use a different port
npm run dev -- -p 3001
```

### "Git not found"

Make sure Git is installed and in your PATH:
1. Download from https://git-scm.com/
2. Restart your terminal after install

---

## MCP Integration (AI Memory Platform)

DevCal includes an **MCP (Model Context Protocol) server** that allows AI assistants like Claude to directly access your developer context!

### What It Does

The MCP server exposes your developer "memory" to AI:
- **Your tasks** and their status
- **Skills** you're developing
- **Stale tasks** that need attention
- **Knowledge gaps** to improve

### Setup for Claude Desktop

1. Install MCP server dependencies:
```powershell
cd mcp-server
npm install
```

2. Add to Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "devcal": {
      "command": "node",
      "args": ["C:/path/to/devcal/mcp-server/index.js"],
      "env": {
        "DEVCAL_API": "http://localhost:3000/api"
      }
    }
  }
}
```

3. Restart Claude Desktop

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `get_developer_context` | Full context: tasks, skills, gaps |
| `get_tasks` | Tasks for a specific date |
| `get_stale_tasks` | Tasks needing attention |
| `get_skills` | Your skill levels |
| `get_knowledge_gaps` | Skills to improve |
| `add_task` | Create a new task |
| `update_task_status` | Mark task complete |
| `generate_catchup_briefing` | AI-generated briefing |

### Example Conversation

```
User: "What was I working on?"
Claude: [uses get_developer_context]
Claude: "You were building API endpoints 4 hours ago.
         You have 3 stale tasks. Want help continuing?"
```

---

## Tech Stack

- **Next.js 14** - React framework with App Router
- **Neo4j** - Graph database for task/commit relationships
- **Alibaba WAN** - AI video generation
- **MCP SDK** - Model Context Protocol for AI integration
- **Tailwind CSS** - Styling with space theme
- **date-fns** - Date manipulation

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tasks` | GET | Get all tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks` | PUT | Update task |
| `/api/tasks` | DELETE | Delete task |
| `/api/video` | GET | Get video history |
| `/api/video` | POST | Generate new video |
| `/api/commits` | GET | Get commits |
| `/api/commits` | POST | Sync commits to Neo4j |
| `/api/analysis` | GET | Get gap analysis |
| `/api/analysis` | POST | Run full analysis |

---

## License

MIT - Built for GitHub Hackathon 2024

## Credits

- GitHub (Hackathon Host)
- Neo4j (Sponsor - Graph Database)
- Alibaba Cloud (Sponsor - WAN Video AI)
