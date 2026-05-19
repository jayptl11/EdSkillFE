let jitsiScriptPromise: Promise<void> | null = null

function normalizeJitsiBaseUrl(domain: string) {
  const trimmed = domain.trim().replace(/\/$/, '')
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`
}

export function loadJitsiExternalApiScript(domain: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Jitsi can only be loaded in the browser.'))
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve()
  }

  if (jitsiScriptPromise) {
    return jitsiScriptPromise
  }

  const scriptUrl = `${normalizeJitsiBaseUrl(domain)}/external_api.js`

  jitsiScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Jitsi script.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      jitsiScriptPromise = null
      reject(new Error('Unable to load Jitsi script.'))
    }
    document.head.appendChild(script)
  })

  return jitsiScriptPromise
}
