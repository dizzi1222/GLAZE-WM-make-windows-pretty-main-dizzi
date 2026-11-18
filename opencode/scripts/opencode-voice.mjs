#!/usr/bin/env node
/**
 * opencode-voice (Windows) — dictado por voz para OpenCode.
 *
 * Graba del micrófono con FFmpeg/DirectShow, segmenta por silencio (VAD por RMS
 * adaptativo) y transcribe sin cuota con Windows Speech Recognition por defecto
 * (o con faster-whisper/Gemini/OpenAI API si se eligen explícitamente), emitiendo
 * NDJSON por stdout para que el plugin TUI lo consuma.
 *
 * Uso:
 *   opencode-voice listen              # bucle continuo (NDJSON)
 *   opencode-voice once                # una frase, imprime solo el texto
 *   opencode-voice doctor              # diagnóstico de audio y API
 *   opencode-voice transcribe <wav>    # transcribe un fichero existente
 *   opencode-voice devices             # lista micrófonos DirectShow
 *
 * Variables de entorno:
 *   VOICE_PROVIDER   faster-whisper | windows | gemini | openai (def. faster-whisper)
 *   VOICE_MODEL      modelo opcional (def. small para faster-whisper)
 *   VOICE_LANGUAGE   es | en | ...          (def. es)
 *   VOICE_SILENCE_MS silencio que cierra la frase (def. 700)
 *   VOICE_THRESHOLD  umbral RMS 0..1 forzado (si se omite, adaptativo)
 *   VOICE_DEVICE     nombre del micrófono DirectShow (def. autodetección)
 *   FFMPEG_PATH      ruta explícita a ffmpeg.exe
 */
import { execFile, spawn, spawnSync } from "node:child_process"
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const RATE = 16000
const CHANNELS = 1
const FRAME_MS = 20
const FRAME_BYTES = ((RATE * FRAME_MS) / 1000) * 2 * CHANNELS // 640 bytes
const PREROLL_MS = 300
const MAX_UTTERANCE_MS = 30000
const MIN_UTTERANCE_MS = 350
const START_FRAMES = 5

const env = process.env
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const config = {
  provider: env.VOICE_PROVIDER ?? "faster-whisper",
  model:
    env.VOICE_MODEL ??
    (env.VOICE_PROVIDER === "openai"
      ? "gpt-4o-mini-transcribe"
      : env.VOICE_PROVIDER === "gemini"
        ? "gemini-2.5-flash"
        : env.VOICE_PROVIDER === "windows"
          ? "local"
          : "small"),
  language: env.VOICE_LANGUAGE ?? "es",
  silenceMs: Number(env.VOICE_SILENCE_MS ?? 700),
  threshold: env.VOICE_THRESHOLD ? Number(env.VOICE_THRESHOLD) : undefined,
  device: env.VOICE_DEVICE ?? "",
}

function pythonCommand() {
  if (env.OPENCODE_VOICE_PYTHON) return { executable: env.OPENCODE_VOICE_PYTHON, args: [] }
  if (process.platform === "win32") return { executable: "py", args: ["-3.12"] }
  return { executable: "python3", args: [] }
}

let fasterWhisperInstalled
function fasterWhisperReady() {
  if (fasterWhisperInstalled !== undefined) return fasterWhisperInstalled
  const python = pythonCommand()
  const result = spawnSync(python.executable, [...python.args, "-c", "import faster_whisper"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10000,
  })
  fasterWhisperInstalled = result.status === 0
  return fasterWhisperInstalled
}

let whisperServer = null
let whisperServerBuffer = ""
let whisperServerReady = null
const whisperPending = []

function rejectWhisperServer(error) {
  whisperServerReady?.reject?.(error)
  whisperServerReady = null
  whisperServer = null
  while (whisperPending.length) whisperPending.shift().reject(error)
}

function ensureWhisperServer() {
  if (whisperServer && whisperServer.exitCode === null) return whisperServerReady.promise
  const helper = join(SCRIPT_DIR, "voice-stt-faster-whisper.py")
  const python = pythonCommand()
  whisperServer = spawn(python.executable, [...python.args, helper, "--server", config.model, config.language], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    env,
  })
  whisperServerReady = {}
  whisperServerReady.promise = new Promise((resolve, reject) => {
    whisperServerReady.resolve = resolve
    whisperServerReady.reject = reject
  })
  whisperServer.stdout.on("data", (chunk) => {
    whisperServerBuffer += chunk.toString()
    const lines = whisperServerBuffer.split(/\r?\n/)
    whisperServerBuffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const result = JSON.parse(line)
        if (result.ready) {
          whisperServerReady.resolve()
          continue
        }
        const pending = whisperPending.shift()
        if (!pending) continue
        if (result.error) pending.reject(new Error(result.error))
        else pending.resolve(clean(String(result.text ?? "")))
      } catch (error) {
        const pending = whisperPending.shift()
        pending?.reject(error)
      }
    }
  })
  whisperServer.stderr.on("data", (chunk) => {
    if (env.VOICE_DEBUG) emit({ type: "debug", message: chunk.toString().trim() })
  })
  whisperServer.on("error", rejectWhisperServer)
  whisperServer.on("close", (code) => {
    if (code !== 0) rejectWhisperServer(new Error(`faster-whisper terminó con code=${code}`))
  })
  return whisperServerReady.promise
}

function shutdownWhisperServer() {
  if (whisperServer && whisperServer.exitCode === null) whisperServer.kill()
  whisperServer = null
  whisperServerReady = null
  whisperServerBuffer = ""
}

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n")
}

function fail(message) {
  emit({ type: "error", message })
}

/* ------------------------------- utilidades ------------------------------- */

function resolveFfmpeg() {
  if (env.FFMPEG_PATH && existsSync(env.FFMPEG_PATH)) return env.FFMPEG_PATH
  const where = spawnSync("where.exe", ["ffmpeg"], { encoding: "utf8", windowsHide: true })
  const first = String(where.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().endsWith(".exe"))
  if (first && existsSync(first)) return first
  const wingetAlias = join(homedir(), "AppData", "Local", "Microsoft", "WinGet", "Links", "ffmpeg.exe")
  if (existsSync(wingetAlias)) return wingetAlias
  return "ffmpeg"
}

const FFMPEG = resolveFfmpeg()

/* ------------------------------- credenciales ------------------------------ */

function apiKey() {
  if (config.provider === "openai") {
    const key = env.OPENAI_API_KEY
    if (key) return key
    throw new Error("OPENAI_API_KEY no está definida")
  }
  const key = env.GOOGLE_API_KEY || env.GEMINI_API_KEY
  if (key) return key
  throw new Error("GOOGLE_API_KEY no está definida")
}

/** Reconocimiento sin red ni cuota con el motor de dictado instalado en Windows. */
async function transcribeWindows(wav) {
  if (process.platform !== "win32") throw new Error("VOICE_PROVIDER=windows solo funciona en Windows")
  const directory = mkdtempSync(join(tmpdir(), "opencode-voice-stt-"))
  const path = join(directory, "speech.wav")
  const culture = config.language === "es" ? "es-ES" : config.language === "en" ? "en-US" : config.language
  const script = [
    "[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)",
    "Add-Type -AssemblyName System.Speech",
    `$culture = [System.Globalization.CultureInfo]::GetCultureInfo('${culture.replace(/'/g, "''")}')`,
    "$recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)",
    "try {",
    "  $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))",
    "  $recognizer.SetInputToWaveFile($env:OPENCODE_VOICE_WAV)",
    "  $result = $recognizer.Recognize([TimeSpan]::FromSeconds(35))",
    "  if ($result) { [Console]::WriteLine($result.Text) }",
    "} finally { $recognizer.Dispose() }",
  ].join("\n")
  try {
    writeFileSync(path, wav)
    return await new Promise((resolve, reject) => {
      execFile("powershell.exe", [
        "-NoProfile", "-NonInteractive", "-EncodedCommand",
        Buffer.from(script, "utf16le").toString("base64"),
      ], { encoding: "utf8", timeout: 25000, windowsHide: true, env: { ...env, OPENCODE_VOICE_WAV: path } },
      (error, stdout, stderr) => {
        if (error) reject(new Error(`Reconocimiento de Windows: ${String(stderr).trim() || error.message}`))
        else resolve(String(stdout).trim())
      })
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

/** Transcripción local con Whisper; no usa API key ni el saldo de ChatGPT. */
async function transcribeFasterWhisper(wav) {
  if (!fasterWhisperReady()) {
    throw new Error("faster-whisper no está instalado; ejecuta: py -3.12 -m pip install faster-whisper")
  }
  const directory = mkdtempSync(join(tmpdir(), "opencode-voice-whisper-"))
  const path = join(directory, "speech.wav")
  writeFileSync(path, wav)
  try {
    await ensureWhisperServer()
    return await new Promise((resolve, reject) => {
      whisperPending.push({ resolve, reject })
      whisperServer.stdin.write(`${path}\n`)
    })
  } finally {
    // El servidor ya leyó el WAV cuando resuelve la petición; el directorio se
    // elimina después en la cola para no borrar el archivo mientras se procesa.
    setTimeout(() => rmSync(directory, { recursive: true, force: true }), 0).unref?.()
  }
}

/* ---------------------------------- audio --------------------------------- */

/** Envuelve PCM s16le mono en un contenedor WAV. */
function toWav(pcm) {
  const header = Buffer.alloc(44)
  const byteRate = RATE * CHANNELS * 2
  header.write("RIFF", 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write("WAVE", 8)
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(CHANNELS, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(CHANNELS * 2, 32)
  header.writeUInt16LE(16, 34)
  header.write("data", 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

function rms(frame) {
  const count = frame.length >> 1
  if (count === 0) return 0
  let sum = 0
  for (let i = 0; i < count; i++) {
    const sample = frame.readInt16LE(i * 2) / 32768
    sum += sample * sample
  }
  return Math.sqrt(sum / count)
}

/** Lista los micrófonos DirectShow disponibles consultando a FFmpeg. */
function listDevices() {
  const result = spawnSync(
    FFMPEG,
    ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
    { encoding: "utf8", timeout: 10000, windowsHide: true },
  )
  const text = `${result.stderr ?? ""}${result.stdout ?? ""}`
  const devices = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/"([^"]+)"\s*\(audio\)/i)
    if (match) devices.push(match[1])
  }
  return devices
}

let cachedDevice = null

/** Puntúa un micrófono para preferir el físico sobre cámaras y dispositivos virtuales. */
function rankDevice(name) {
  const lowered = name.toLowerCase()
  let score = 0
  if (/microphone|micrófono|array|headset|mic\b/.test(lowered)) score += 2
  if (/irium|obs|virtual|webcam|cable|vb-audio|voicemeeter|virtual-audio-capturer|nvidia broadcast/.test(lowered)) score -= 5
  return score
}

/** Devuelve el micrófono DirectShow configurado o el mejor disponible. */
function resolveDevice() {
  if (cachedDevice) return cachedDevice
  const invalidWindowsDevice = process.platform === "win32" && /^(alsa|pulse|pipewire|default)[_:]/i.test(config.device)
  if (config.device && !invalidWindowsDevice) {
    cachedDevice = config.device
    return cachedDevice
  }
  const devices = listDevices()
  if (!devices.length) throw new Error("No hay micrófonos DirectShow disponibles")
  const ranked = devices
    .map((name, index) => ({ name, index, score: rankDevice(name) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
  cachedDevice = ranked[0].name
  return cachedDevice
}

/* ------------------------------- transcripción ----------------------------- */

async function transcribe(pcm) {
  const wav = toWav(pcm)
  if (config.provider === "faster-whisper") return transcribeFasterWhisper(wav)
  if (config.provider === "windows") return transcribeWindows(wav)
  if (config.provider === "openai") {
    const form = new FormData()
    form.append("file", new Blob([wav], { type: "audio/wav" }), "speech.wav")
    form.append("model", config.model)
    form.append("language", config.language)
    form.append("response_format", "json")
    form.append("prompt", "Transcribe literalmente. Puntuación y acentos correctos.")
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 200)}`)
    const data = await response.json()
    return String(data.text ?? "").trim()
  }

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              "Transcribe literalmente el audio en " +
              (config.language === "es" ? "español" : config.language) +
              ". Responde SOLO con la transcripción, con puntuación y acentos correctos. " +
              "No añadas comentarios, ni comillas, ni marcas. Si no hay voz inteligible responde exactamente: <silencio>",
          },
          { inline_data: { mime_type: "audio/wav", data: wav.toString("base64") } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    },
  )
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const data = await response.json()
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part?.text ?? "")
    .join(" ")
    .trim()
  return clean(text)
}

function clean(text) {
  let out = text
    .replace(/<silencio>|<silence>|\[silencio\]|\[silence\]/gi, "")
    .replace(/^```[a-z]*\n?|```$/gi, "")
    .replace(/^["'«“]|["'»”]$/g, "")
    .trim()
  if (/^(silencio|silence|no se detecta voz|ininteligible)\.?$/i.test(out)) out = ""
  return out
}

async function transcribeWithRetry(pcm) {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await transcribe(pcm)
    } catch (error) {
      lastError = error
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
  throw lastError
}

/* --------------------------------- captura -------------------------------- */

function startCapture(onFrame, onEnd) {
  const device = resolveDevice()
  const child = spawn(
    FFMPEG,
    [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "dshow",
      "-i", `audio=${device}`,
      "-ar", String(RATE),
      "-ac", String(CHANNELS),
      "-f", "s16le",
      "-acodec", "pcm_s16le",
      "-flush_packets", "1",
      "-",
    ],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  )
  let pending = Buffer.alloc(0)
  let stopped = false

  child.stdout.on("data", (chunk) => {
    pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
    while (pending.length >= FRAME_BYTES) {
      const frame = pending.subarray(0, FRAME_BYTES)
      pending = pending.subarray(FRAME_BYTES)
      onFrame(Buffer.from(frame))
    }
  })
  child.stderr.on("data", (chunk) => {
    const message = chunk.toString().trim()
    if (message && env.VOICE_DEBUG) emit({ type: "debug", message })
  })
  child.on("error", (error) => onEnd(`spawn: ${error.message}`))
  child.on("exit", (code, signal) => {
    if (!stopped) onEnd(`ffmpeg salió (code=${code} signal=${signal})`)
  })

  return {
    stop() {
      stopped = true
      child.kill("SIGTERM")
      setTimeout(() => child.kill("SIGKILL"), 400).unref?.()
    },
  }
}

/* ---------------------------------- motor --------------------------------- */

function runEngine(options) {
  let noiseFloor = 0.004
  let calibrationFrames = 0
  const CALIBRATION_FRAMES = 15 // ~300ms a 50 fps (20ms/frame)
  let speaking = false
  let quietFrames = 0
  let speechFrames = 0
  let buffer = []
  let preroll = []
  let utteranceMs = 0
  let busy = false
  let lastLevelAt = 0
  const startedAt = Date.now()

  const thresholdFor = () => {
    if (config.threshold !== undefined) return config.threshold
    return Math.max(0.01, noiseFloor * 2.5)
  }

  const flush = async (reason) => {
    const pcm = Buffer.concat(buffer)
    const durationMs = utteranceMs
    buffer = []
    utteranceMs = 0
    speaking = false
    quietFrames = 0
    speechFrames = 0
    if (durationMs < MIN_UTTERANCE_MS || pcm.length === 0) return
    emit({ type: "utterance_end", durationMs, reason })
    if (busy) {
      emit({ type: "skipped", reason: "busy" })
      return
    }
    busy = true
    emit({ type: "transcribing" })
    try {
      const text = await transcribeWithRetry(pcm)
      if (text) emit({ type: "transcript", text, durationMs })
      else emit({ type: "no_speech" })
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    } finally {
      busy = false
      if (options.once) process.exit(0)
    }
  }

  let listener
  try {
    listener = startCapture(
      (frame) => {
        const level = rms(frame)

        if (calibrationFrames < CALIBRATION_FRAMES) {
          if (calibrationFrames === 0) noiseFloor = level
          else noiseFloor = noiseFloor * 0.85 + level * 0.15
          calibrationFrames++
          if (calibrationFrames === CALIBRATION_FRAMES) {
            emit({
              type: "calibrated",
              noiseFloor: Number(noiseFloor.toFixed(4)),
              threshold: Number(thresholdFor().toFixed(4)),
            })
          }
          return
        }
        const now = Date.now()
        if (now - lastLevelAt > 100) {
          lastLevelAt = now
          emit({ type: "level", level: Number(level.toFixed(4)), threshold: Number(thresholdFor().toFixed(4)) })
        }

        const loud = level > thresholdFor()
        if (!speaking) {
          preroll.push(frame)
          if (preroll.length > PREROLL_MS / FRAME_MS) preroll.shift()
          if (loud) {
            if (++speechFrames >= START_FRAMES) {
              speaking = true
              quietFrames = 0
              buffer = [...preroll]
              utteranceMs = buffer.length * FRAME_MS
              preroll = []
              emit({ type: "speech_start", at: Date.now() - startedAt })
            }
          } else {
            speechFrames = 0
          }
          return
        }

        buffer.push(frame)
        utteranceMs += FRAME_MS
        if (loud) quietFrames = 0
        else quietFrames++

        if (utteranceMs >= MAX_UTTERANCE_MS) {
          void flush("max_length")
          return
        }
        if (quietFrames * FRAME_MS >= config.silenceMs) void flush("silence")
      },
      (reason) => {
        fail(reason)
        process.exit(1)
      },
    )
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  emit({ type: "ready", provider: config.provider, model: config.model, device: resolveDevice() })
  return listener
}

/* --------------------------------- comandos -------------------------------- */

async function transcribeFile(path) {
  try {
    const raw = readFileSync(path)
    if (raw.subarray(0, 4).toString() === "RIFF") {
      const channels = raw.readUInt16LE(22)
      const rate = raw.readUInt32LE(24)
      if (channels === 1 && rate === RATE) {
        const dataStart = raw.indexOf("data") + 8
        const text = await transcribeWithRetry(raw.subarray(dataStart))
        return console.log(text)
      }
      const converted = await convertToPcm(path)
      const text = await transcribeWithRetry(converted)
      return console.log(text)
    }
    const text = await transcribeWithRetry(raw)
    console.log(text)
  } finally {
    shutdownWhisperServer()
  }
}

function convertToPcm(path) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      FFMPEG,
      ["-v", "error", "-i", path, "-ar", String(RATE), "-ac", "1", "-f", "s16le", "pipe:1"],
      { windowsHide: true },
    )
    const chunks = []
    child.stdout.on("data", (chunk) => chunks.push(chunk))
    child.on("error", reject)
    child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg salió con ${code}`))))
  })
}

async function doctor() {
  const info = []
  const push = (line) => {
    info.push(line)
    console.log(line)
  }
  push(`provider=${config.provider} model=${config.model} language=${config.language}`)
  push(`ffmpeg=${FFMPEG}`)

  const hasKey = config.provider === "windows" || config.provider === "faster-whisper" || (config.provider === "openai"
    ? Boolean(env.OPENAI_API_KEY)
    : Boolean(env.GOOGLE_API_KEY || env.GEMINI_API_KEY))
  const ready = config.provider === "faster-whisper" ? fasterWhisperReady() : hasKey
  push(`credencial=${config.provider === "windows" || config.provider === "faster-whisper" ? "no necesaria (local)" : hasKey ? "ok" : "MISSING"}`)
  if (config.provider === "faster-whisper") push(`faster_whisper=${ready ? "ok" : "MISSING (py -3.12 -m pip install faster-whisper)"}`)

  const devices = listDevices()
  push(`devices=${devices.length ? devices.join(" | ") : "NINGUNO"}`)
  if (!devices.length) {
    push("audio=FAIL (no hay micrófonos DirectShow; revisa la privacidad del micrófono)")
    return
  }

  // 4 s de captura para medir el ruido de fondo
  const frames = []
  await new Promise((resolve) => {
    let capture
    try {
      capture = startCapture(
        (frame) => frames.push(frame),
        () => resolve(),
      )
    } catch {
      resolve()
      return
    }
    setTimeout(() => {
      capture.stop()
      resolve()
    }, 4000)
  })
  const levels = frames.map(rms)
  const sorted = [...levels].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const peak = sorted[sorted.length - 1] ?? 0
  push(`frames=${levels.length} pcm_bytes=${frames.length * FRAME_BYTES}`)
  push(`noise_median=${median.toFixed(4)} peak=${peak.toFixed(4)} sugerido_threshold=${Math.max(0.01, median * 2.5).toFixed(4)}`)

  if (frames.length < 50) {
    push("audio=FAIL (no llegaron muestras; ¿micrófono ocupado o deshabilitado?)")
    return
  }
  const pcm = Buffer.concat(frames)
  const directory = mkdtempSync(join(tmpdir(), "opencode-voice-doctor-"))
  const path = join(directory, "muestra.wav")
  writeFileSync(path, toWav(pcm))
  push(`muestra_guardada=${path}`)
  if (!ready) return
  const started = Date.now()
  try {
    const text = await transcribe(pcm)
    push(`transcripcion_latencia_ms=${Date.now() - started}`)
    push(`transcripcion=${text === "" ? "<vacío>" : text}`)
  } catch (error) {
    push(`transcripcion=ERROR ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    shutdownWhisperServer()
    try {
      rmSync(directory, { recursive: true, force: true })
    } catch {}
  }
}

/* ----------------------------------- main ---------------------------------- */

const [command = "listen", argument] = process.argv.slice(2)

switch (command) {
  case "listen": {
    runEngine({})
    break
  }
  case "once": {
    runEngine({ once: true })
    break
  }
  case "transcribe": {
    if (!argument || !existsSync(argument)) {
      console.error("uso: opencode-voice transcribe <fichero.wav|pcm>")
      process.exit(2)
    }
    await transcribeFile(argument)
    break
  }
  case "doctor": {
    await doctor()
    break
  }
  case "devices": {
    const devices = listDevices()
    if (!devices.length) console.log("<sin micrófonos DirectShow>")
    else for (const device of devices) console.log(device)
    break
  }
  default: {
    console.error(`comando desconocido: ${command}`)
    console.error("uso: opencode-voice [listen|once|doctor|devices|transcribe <file>]")
    process.exit(2)
  }
}

process.on("SIGTERM", () => process.exit(0))
process.on("SIGINT", () => process.exit(0))
process.on("exit", () => {
  if (whisperServer && whisperServer.exitCode === null) whisperServer.kill()
})
