'use client'

import React, { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { DeliveryChannel } from "@/lib/types"

interface Props {
  channels: DeliveryChannel[]
  selectedDelivery: string
  onChange: (delivery: string) => void
}

export function DeliverySelector({ channels, selectedDelivery, onChange }: Props) {
  const [chatId, setChatId] = useState("")
  const [threadId, setThreadId] = useState("")

  useEffect(() => {
    const parts = selectedDelivery.split(":")
    if (parts[0] === "telegram" && parts.length >= 2) {
      setChatId(parts[1] || "")
      if (parts.length >= 3) setThreadId(parts[2] || "")
    }
  }, [])

  const handleChannelChange = (channelId: string) => {
    if (channelId === "telegram" && chatId) {
      onChange(`telegram:${chatId}${threadId ? ":" + threadId : ""}`)
    } else {
      onChange(channelId)
    }
  }

  const handleChatIdChange = (val: string) => {
    setChatId(val)
    onChange(val ? `telegram:${val}${threadId ? ":" + threadId : ""}` : "telegram")
  }

  const handleThreadIdChange = (val: string) => {
    setThreadId(val)
    if (chatId) {
      onChange(val ? `telegram:${chatId}:${val}` : `telegram:${chatId}`)
    }
  }

  const selectedChannel = channels.find(c => c.id === selectedDelivery.split(":")[0])

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedDelivery.split(":")[0]} onValueChange={handleChannelChange}>
        {channels.map(ch => (
          <label
            key={ch.id}
            className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 cursor-pointer transition-colors"
          >
            <RadioGroupItem value={ch.id} />
            <span className="text-lg">{ch.icon}</span>
            <div className="flex-1">
              <span className="text-sm font-medium">{ch.name}</span>
              <p className="text-xs text-muted-foreground/60">{ch.description}</p>
            </div>
          </label>
        ))}
      </RadioGroup>

      {selectedChannel?.supports_chat_id && (
        <div className="space-y-3 pl-8 border-l-2 border-primary/20">
          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-xs">Chat ID (opcional)</Label>
            <Input
              id="chatId"
              type="text"
              placeholder="440219100"
              value={chatId}
              onChange={(e) => handleChatIdChange(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          {selectedChannel.supports_thread_id && (
            <div className="space-y-2">
              <Label htmlFor="threadId" className="text-xs">Thread ID (opcional, para topics)</Label>
              <Input
                id="threadId"
                type="text"
                placeholder="17585"
                value={threadId}
                onChange={(e) => handleThreadIdChange(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
