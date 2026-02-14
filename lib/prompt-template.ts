export async function resolveSystemPromptTemplate(template: string): Promise<string> {
  if (!template.trim()) {
    return ""
  }

  const now = new Date()
  const currentTime = now.toLocaleString()
  const currentTimeIso = now.toISOString()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown"

  const currentLocation = await getCurrentLocationText()

  const replacements: Record<string, string> = {
    current_time: currentTime,
    current_time_iso: currentTimeIso,
    current_timezone: timezone,
    current_location: currentLocation,
  }

  return template.replace(/\{\{\s*([^{}\s]+)\s*\}\}/g, (match, key: string) => {
    return replacements[key] ?? match
  })
}

const TRANSITIVE_THINKING_PROMPT = [
  "Transitive Thinking Mode is enabled.",
  "You must expose the reasoning chain to the user in a concise, structured way.",
  "Always respond in the same language as the latest user message, unless the user explicitly asks for another language.",
  "",
  "Output format (mandatory):",
  "### Reasoning Chain",
  "1. Start from the user's explicit facts and requirements.",
  "2. Add intermediate inference links (at least 3 steps for non-trivial tasks).",
  "3. Validate each link; mark uncertainty with \"uncertain\" and what is missing.",
  "4. If tools/data are needed, say what is needed before concluding.",
  "",
  "After the reasoning section, provide the final response directly.",
  "Do not include a heading like \"Final Answer\" in the visible output.",
  "Do not repeat the \"Reasoning Chain\" section in the final response.",
  "Keep the final response concise and actionable.",
  "",
  "The \"### Reasoning Chain\" section is required only for the reasoning draft phase.",
].join("\n")

export async function buildSystemPrompt(options: {
  template: string
  transitiveThinking: boolean
}): Promise<string> {
  const resolvedTemplate = await resolveSystemPromptTemplate(options.template)
  const transitivePrompt = options.transitiveThinking ? TRANSITIVE_THINKING_PROMPT : ""

  return [resolvedTemplate, transitivePrompt].filter(Boolean).join("\n\n")
}

async function getCurrentLocationText(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "Location unavailable"
  }

  try {
    const position = await getCurrentPositionWithTimeout(5000)
    const { latitude, longitude, accuracy } = position.coords
    const roundedLatitude = latitude.toFixed(6)
    const roundedLongitude = longitude.toFixed(6)
    const roundedAccuracy = Math.round(accuracy)

    return `lat ${roundedLatitude}, lng ${roundedLongitude} (±${roundedAccuracy}m)`
  } catch {
    return "Location unavailable"
  }
}

function getCurrentPositionWithTimeout(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Geolocation timeout"))
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer)
        resolve(position)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
      {
        enableHighAccuracy: false,
        timeout: timeoutMs,
        maximumAge: 60_000,
      }
    )
  })
}
