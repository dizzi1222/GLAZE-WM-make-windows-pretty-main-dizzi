/**
 * Engram ΓÇö OpenCode plugin adapter
 *
 * Thin layer that connects OpenCode's event system to the Engram Go binary.
 * The Go binary runs as a local HTTP server and handles all persistence.
 *
 * Flow:
 *   OpenCode events ΓåÆ this plugin ΓåÆ HTTP calls ΓåÆ engram serve ΓåÆ SQLite
 *
 * Session resilience:
 *   Uses `ensureSession()` before any DB write. This means sessions are
 *   created on-demand ΓÇö even if the plugin was loaded after the session
 *   started (restart, reconnect, etc.). The session ID comes from OpenCode's
 *   hooks (input.sessionID) rather than relying on a session.created event.
 */


// ΓöÇΓöÇΓöÇ Configuration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const ENGRAM_PORT = parseInt(process.env.ENGRAM_PORT ?? "7437")
const ENGRAM_URL = `http://127.0.0.1:${ENGRAM_PORT}`
const ENGRAM_BIN = process.env.ENGRAM_BIN ?? Bun.which("engram") ?? "engram"

// Engram's own MCP tools ΓÇö don't count these as "tool calls" for session stats
const ENGRAM_TOOLS = new Set([
  "mem_search",
  "mem_save",
  "mem_update",
  "mem_delete",
  "mem_suggest_topic_key",
  "mem_save_prompt",
  "mem_session_summary",
  "mem_context",
  "mem_stats",
  "mem_timeline",
  "mem_get_observation",
  "mem_session_start",
  "mem_session_end",
])

// ΓöÇΓöÇΓöÇ Memory Instructions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// These get injected into the agent's context so it knows to call mem_save.

const MEMORY_INSTRUCTIONS = `## Engram Persistent Memory ΓÇö Protocol

You have access to Engram, a persistent memory system that survives across sessions and compactions.

### WHEN TO SAVE (mandatory ΓÇö not optional)

Call \`mem_save\` IMMEDIATELY after any of these:
- Bug fix completed
- Architecture or design decision made
- Non-obvious discovery about the codebase
- Configuration change or environment setup
- Pattern established (naming, structure, convention)
- User preference or constraint learned

Format for \`mem_save\`:
- **title**: Verb + what ΓÇö short, searchable (e.g. "Fixed N+1 query in UserList", "Chose Zustand over Redux")
- **type**: bugfix | decision | architecture | discovery | pattern | config | preference
- **scope**: \`project\` (default) | \`personal\`
- **topic_key** (optional, recommended for evolving decisions): stable key like \`architecture/auth-model\`
- **content**:
  **What**: One sentence ΓÇö what was done
  **Why**: What motivated it (user request, bug, performance, etc.)
  **Where**: Files or paths affected
  **Learned**: Gotchas, edge cases, things that surprised you (omit if none)

Topic rules:
- Different topics must not overwrite each other (e.g. architecture vs bugfix)
- Reuse the same \`topic_key\` to update an evolving topic instead of creating new observations
- If unsure about the key, call \`mem_suggest_topic_key\` first and then reuse it
- Use \`mem_update\` when you have an exact observation ID to correct

### WHEN TO SEARCH MEMORY

When the user asks to recall something ΓÇö any variation of "remember", "recall", "what did we do",
"how did we solve", or the equivalent in the user's language, or references to past work:
1. First call \`mem_context\` ΓÇö checks recent session history (fast, cheap)
2. If not found, call \`mem_search\` with relevant keywords (FTS5 full-text search)
3. If you find a match, use \`mem_get_observation\` for full untruncated content

Also search memory PROACTIVELY when:
- Starting work on something that might have been done before
- The user mentions a topic you have no context on ΓÇö check if past sessions covered it
- The user's FIRST message references the project, a feature, or a problem ΓÇö call \`mem_search\` with keywords from their message to check for prior work before responding

### SESSION CLOSE PROTOCOL (mandatory)

Before ending a session or saying "done" / "that's it", you MUST:
1. Call \`mem_session_summary\` with this structure:

## Goal
[What we were working on this session]

## Instructions
[User preferences or constraints discovered ΓÇö skip if none]

## Discoveries
- [Technical findings, gotchas, non-obvious learnings]

## Accomplished
- [Completed items with key details]

## Next Steps
- [What remains to be done ΓÇö for the next session]

## Relevant Files
- path/to/file ΓÇö [what it does or what changed]

This is NOT optional. If you skip this, the next session starts blind.

### AFTER COMPACTION

If you see a message about compaction or context reset, or if you see "FIRST ACTION REQUIRED" in your context:
1. IMMEDIATELY call \`mem_session_summary\` with the compacted summary content ΓÇö this persists what was done before compaction
2. Then call \`mem_context\` to recover any additional context from previous sessions
3. Only THEN continue working

Do not skip step 1. Without it, everything done before compaction is lost from memory.
`

// ΓöÇΓöÇΓöÇ HTTP Client ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

async function engramFetch(
  path: string,
  opts: { method?: string; body?: any } = {}
): Promise<any> {
  try {
    const res = await fetch(`${ENGRAM_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    return await res.json()
  } catch {
    // Engram server not running ΓÇö silently fail
    return null
  }
}

async function isEngramRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGRAM_URL}/health`, {
      signal: AbortSignal.timeout(500),
    })
    return res.ok
  } catch {
    return false
  }
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function extractProjectName(directory: string): string {
  // Try git remote origin URL
  try {
    const result = Bun.spawnSync(["git", "-C", directory, "remote", "get-url", "origin"])
    if (result.exitCode === 0) {
      const url = result.stdout?.toString().trim()
      if (url) {
        const name = url.replace(/\.git$/, "").split(/[/:]/).pop()
        if (name) return name
      }
    }
  } catch {}

  // Fallback: git root directory name (works in worktrees)
  try {
    const result = Bun.spawnSync(["git", "-C", directory, "rev-parse", "--show-toplevel"])
    if (result.exitCode === 0) {
      const root = result.stdout?.toString().trim()
      if (root) return root.split("/").pop() ?? "unknown"
    }
  } catch {}

  // Final fallback: cwd basename
  return directory.split("/").pop() ?? "unknown"
}

function truncate(str: string, max: number): string {
  if (!str) return ""
  return str.length > max ? str.slice(0, max) + "..." : str
}

/**
 * Strip <private>...</private> tags before sending to engram.
 * Double safety: the Go binary also strips, but we strip here too
 * so sensitive data never even hits the wire.
 */
function stripPrivateTags(str: string): string {
  if (!str) return ""
  return str.replace(/<private>[\s\S]*?<\/private>/gi, "[REDACTED]").trim()
}

// ΓöÇΓöÇΓöÇ Plugin Export ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

type V2Event = {
  type: string
  properties?: Record<string, any>
  data?: Record<string, any>
}

type V2Context = {
  location: { directory: string }
  event: { subscribe: (options?: { signal?: AbortSignal }) => AsyncIterable<V2Event> }
  session: { hook: (name: string, callback: (event: any) => void | Promise<void>) => Promise<unknown> }
  tool: { hook: (name: string, callback: (event: any) => void | Promise<void>) => Promise<unknown> }
}

function appendSystemText(event: any, text: string): void {
  if (!Array.isArray(event.system) || !text) return
  const last = event.system[event.system.length - 1]
  if (last?.type === "text" && typeof last.text === "string") {
    last.text += "\n\n" + text
  } else {
    event.system.push({ type: "text", text })
  }
}

function eventInfo(event: V2Event): Record<string, any> {
  const properties = event.properties ?? {}
  const data = event.data ?? {}
  return (properties.info ?? data.info ?? properties ?? data) as Record<string, any>
}

export default {
  id: "engram",
  async setup(ctx: V2Context) {
    const directory = ctx.location.directory
    const oldProject = directory.split(/[\\/]/).pop() ?? "unknown"
    const project = extractProjectName(directory)
    const toolCounts = new Map<string, number>()
    const lastNudgeTime = new Map<string, number>()
    const knownSessions = new Set<string>()
    const subAgentSessions = new Set<string>()

    async function ensureSession(sessionId: string): Promise<void> {
      if (!sessionId || knownSessions.has(sessionId) || subAgentSessions.has(sessionId)) return
      knownSessions.add(sessionId)
      await engramFetch("/sessions", {
        method: "POST",
        body: { id: sessionId, project, directory },
      })
    }

    try {
      if (!(await isEngramRunning())) {
        Bun.spawn([ENGRAM_BIN, "serve"], {
          stdout: "ignore",
          stderr: "ignore",
          stdin: "ignore",
        })
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch {
      // Engram is optional; the plugin remains loaded if its binary is unavailable.
    }

    if (oldProject !== project) {
      await engramFetch("/projects/migrate", {
        method: "POST",
        body: { old_project: oldProject, new_project: project },
      })
    }

    try {
      const manifestFile = `${directory}/.engram/manifest.json`
      if (await Bun.file(manifestFile).exists()) {
        Bun.spawn([ENGRAM_BIN, "sync", "--import"], {
          cwd: directory,
          stdout: "ignore",
          stderr: "ignore",
          stdin: "ignore",
        })
      }
    } catch {
      // Missing manifest or binary is a no-op.
    }

    const controller = new AbortController()
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        const info = eventInfo(event)
        if (event.type === "session.created") {
          const sessionId = info.id ?? info.sessionID
          const parentID = info.parentID
          const title = typeof info.title === "string" ? info.title : ""
          if (sessionId && (parentID || title.endsWith(" subagent)"))) {
            subAgentSessions.add(sessionId)
          } else if (sessionId) {
            await ensureSession(sessionId)
          }
        } else if (event.type === "session.deleted") {
          const sessionId = info.id ?? info.sessionID
          if (sessionId) {
            toolCounts.delete(sessionId)
            knownSessions.delete(sessionId)
            subAgentSessions.delete(sessionId)
            lastNudgeTime.delete(sessionId)
          }
        }
      }
    })().catch(() => {
      // Event subscription failures must not take down OpenCode.
    })

    await ctx.session.hook("prompt", async (event) => {
      const sessionId = event.sessionID
      if (!sessionId || subAgentSessions.has(sessionId)) return
      const finalContent = (typeof event.prompt?.text === "string" ? event.prompt.text : "").trim()
      if (finalContent.length <= 10) return
      await ensureSession(sessionId)
      await engramFetch("/prompts", {
        method: "POST",
        body: {
          session_id: sessionId,
          content: stripPrivateTags(truncate(finalContent, 2000)),
          project,
        },
      })
    })

    await ctx.tool.hook("execute.after", async (event) => {
      const tool = String(event.tool ?? "")
      if (ENGRAM_TOOLS.has(tool.toLowerCase())) return
      const sessionId = event.sessionID
      if (!sessionId) return
      await ensureSession(sessionId)
      toolCounts.set(sessionId, (toolCounts.get(sessionId) ?? 0) + 1)
      if (tool.toLowerCase() !== "task" || event.status !== "completed" || !event.result) return
      let text: string
      try {
        text = typeof event.result === "string" ? event.result : JSON.stringify(event.result)
      } catch {
        return
      }
      if (text.length <= 50) return
      await engramFetch("/observations/passive", {
        method: "POST",
        body: {
          session_id: sessionId,
          content: stripPrivateTags(text),
          project,
          source: "task-complete",
        },
      })
    })

    async function addMemoryInstructions(event: any): Promise<void> {
      appendSystemText(event, MEMORY_INSTRUCTIONS)
    }

    async function addContextAndReminder(event: any): Promise<void> {
      await addMemoryInstructions(event)
      try {
        const sessionID = typeof event.sessionID === "string" ? event.sessionID : ""
        if (!sessionID || subAgentSessions.has(sessionID)) return
        const nowSecs = Math.floor(Date.now() / 1000)
        const cooldownSecs = parseInt(process.env.ENGRAM_NUDGE_COOLDOWN_SECS ?? "900", 10)
        const previousNudge = lastNudgeTime.get(sessionID)
        if (previousNudge !== undefined && nowSecs - previousNudge < cooldownSecs) return

        const toEpochSecs = (timestamp: string): number => {
          if (!timestamp) return 0
          const normalized = timestamp.includes("T") ? timestamp : timestamp.replace(" ", "T") + "Z"
          const millis = new Date(normalized).getTime()
          return Number.isNaN(millis) ? 0 : Math.floor(millis / 1000)
        }

        let sessionStartEpoch = 0
        try {
          const response = await fetch(`${ENGRAM_URL}/sessions/${encodeURIComponent(sessionID)}`, {
            signal: AbortSignal.timeout(200),
          })
          if (response.ok) {
            const data = await response.json()
            sessionStartEpoch = toEpochSecs(data?.started_at ?? "")
          }
        } catch {
          return
        }
        if (sessionStartEpoch > 0 && nowSecs - sessionStartEpoch < 300) return

        let lastObservationEpoch = 0
        try {
          const response = await fetch(
            `${ENGRAM_URL}/observations?project=${encodeURIComponent(project)}&limit=1&sort=created_at:desc`,
            { signal: AbortSignal.timeout(200) },
          )
          if (response.ok) {
            const data = await response.json()
            lastObservationEpoch = toEpochSecs(data?.[0]?.created_at ?? "")
          }
        } catch {
          return
        }
        if (!lastObservationEpoch || nowSecs - lastObservationEpoch < 900) return

        appendSystemText(
          event,
          "MEMORY REMINDER: It's been over 15 minutes since your last memory save. " +
            "If you've made decisions, discoveries, completed significant work, or found non-obvious things, " +
            "call mem_save now.",
        )
        lastNudgeTime.set(sessionID, nowSecs)
      } catch {
        // A failed reminder must never interrupt the model request.
      }
    }

    await ctx.session.hook("context", addContextAndReminder)
    await ctx.session.hook("generate", addMemoryInstructions)
    await ctx.session.hook("compaction", async (event) => {
      if (event.sessionID) await ensureSession(event.sessionID)
      await addMemoryInstructions(event)
      const data = await engramFetch(`/context?project=${encodeURIComponent(project)}`)
      if (data?.context) appendSystemText(event, data.context)
      appendSystemText(
        event,
        `CRITICAL INSTRUCTION FOR COMPACTED SUMMARY:\n` +
          `The agent has access to Engram persistent memory via MCP tools.\n` +
          `You MUST include the following instruction at the TOP of the compacted summary:\n\n` +
          `"FIRST ACTION REQUIRED: Call mem_session_summary with the content of this compacted summary. ` +
          `Use project: '${project}'. This preserves what was accomplished before compaction. Do this BEFORE any other work."\n\n` +
          `This is NOT optional. Without this, everything done before compaction is lost from memory.`,
      )
    })

    return () => controller.abort()
  },
}