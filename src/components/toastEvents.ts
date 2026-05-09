export type ToastKind = 'success' | 'error' | 'info'

export interface ToastPayload {
  kind: ToastKind
  message: string
}

export const toastEventName = 'edskill:toast'

export const showToast = (toast: ToastPayload) => {
  window.dispatchEvent(new CustomEvent<ToastPayload>(toastEventName, { detail: toast }))
}
