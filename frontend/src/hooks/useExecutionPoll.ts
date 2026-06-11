import { useEffect, useRef } from 'react'
import { getJob } from '@/lib/api'
import { Agent } from '@/lib/types'

const POLL_INTERVAL_MS = 3_000
const MAX_POLL_MS = 5 * 60_000

interface UseExecutionPollOptions {
  agent: Agent
  enabled: boolean
  onComplete: (updated: Agent) => void
  onTimeout: () => void
}

/** Poll Hermes job state while status === 'running' until a new execution is recorded. */
export function useExecutionPoll({
  agent,
  enabled,
  onComplete,
  onTimeout,
}: UseExecutionPollOptions) {
  const baselineRef = useRef<string | null>(null)
  const startedAtRef = useRef<number>(0)
  const onCompleteRef = useRef(onComplete)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onTimeoutRef.current = onTimeout
  }, [onComplete, onTimeout])

  useEffect(() => {
    if (!enabled) {
      baselineRef.current = null
      return
    }

    baselineRef.current = agent.lastRunAt ?? null
    startedAtRef.current = Date.now()

    let cancelled = false

    const check = async () => {
      if (cancelled) return

      if (Date.now() - startedAtRef.current > MAX_POLL_MS) {
        onTimeoutRef.current()
        return
      }

      try {
        const updated = await getJob(agent.id)
        if (cancelled) return

        const baseline = baselineRef.current
        const finished =
          updated.lastRunAt != null && updated.lastRunAt !== baseline

        if (finished) {
          onCompleteRef.current(updated)
        }
      } catch {
        // keep polling — Hermes may be briefly unavailable mid-run
      }
    }

    void check()
    const interval = setInterval(check, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [agent.id, agent.lastRunAt, enabled])
}
