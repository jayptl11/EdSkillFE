declare global {
  interface JitsiMeetExternalAPIOptions {
    roomName: string
    parentNode: HTMLElement
    userInfo?: {
      displayName?: string
      avatarURL?: string
    }
    configOverwrite?: Record<string, unknown>
    interfaceConfigOverwrite?: Record<string, unknown>
  }

  interface JitsiMeetExternalAPIInstance {
    addListener(event: 'videoConferenceJoined' | 'videoConferenceLeft' | 'readyToClose', listener: () => void): void
    removeListener(event: 'videoConferenceJoined' | 'videoConferenceLeft' | 'readyToClose', listener?: () => void): void
    dispose(): void
  }

  interface JitsiMeetExternalAPIConstructor {
    new (domain: string, options: JitsiMeetExternalAPIOptions): JitsiMeetExternalAPIInstance
  }

  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor
  }
}

export {}
