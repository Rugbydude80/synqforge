export interface ProjectMetricsEventDetail {
  projectId?: string
  timestamp: number
}

export const PROJECT_METRICS_EVENT = 'synqforge:project-metrics-changed'

export function emitProjectMetricsChanged(projectId?: string) {
  if (typeof window === 'undefined') {
    return
  }

  const detail: ProjectMetricsEventDetail = {
    projectId,
    timestamp: Date.now(),
  }

  window.dispatchEvent(
    new CustomEvent<ProjectMetricsEventDetail>(PROJECT_METRICS_EVENT, { detail })
  )
}

export function subscribeToProjectMetrics(
  handler: (event: CustomEvent<ProjectMetricsEventDetail>) => void
) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const listener = (event: Event) => {
    handler(event as CustomEvent<ProjectMetricsEventDetail>)
  }

  window.addEventListener(PROJECT_METRICS_EVENT, listener)

  return () => {
    window.removeEventListener(PROJECT_METRICS_EVENT, listener)
  }
}

