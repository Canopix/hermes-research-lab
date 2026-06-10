"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface SSEEvent {
  type: "status" | "output" | "error" | "done";
  data: string;
  timestamp: number;
}

interface UseSSEResult {
  events: SSEEvent[];
  connected: boolean;
  error: string | null;
  disconnect: () => void;
}

export function useSSE(url: string | null): UseSSEResult {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!url) {
      setEvents([]);
      setConnected(false);
      setError(null);
      return;
    }

    setEvents([]);
    setError(null);

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.addEventListener("status", (e: MessageEvent) => {
      setEvents((prev) => [
        ...prev,
        { type: "status", data: e.data, timestamp: Date.now() },
      ]);
    });

    es.addEventListener("output", (e: MessageEvent) => {
      setEvents((prev) => [
        ...prev,
        { type: "output", data: e.data, timestamp: Date.now() },
      ]);
    });

    es.addEventListener("error", (e: MessageEvent) => {
      const msg = e.data || "An error occurred";
      setEvents((prev) => [
        ...prev,
        { type: "error", data: msg, timestamp: Date.now() },
      ]);
    });

    es.addEventListener("done", (e: MessageEvent) => {
      setEvents((prev) => [
        ...prev,
        { type: "done", data: e.data, timestamp: Date.now() },
      ]);
      es.close();
      esRef.current = null;
      setConnected(false);
    });

    es.onerror = () => {
      // EventSource auto-reconnects on error by default. For a one-shot run
      // stream (terminated by the `done` event) that turns any mid-stream drop
      // into an infinite silent retry loop. Close it and surface the error.
      setConnected(false);
      setError("Connection lost");
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [url]);

  return { events, connected, error, disconnect };
}