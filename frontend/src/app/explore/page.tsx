"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import SystemOverview from "@/components/explore/SystemOverview"
import ProfilesList from "@/components/explore/ProfilesList"
import SkillsGrid from "@/components/explore/SkillsGrid"
import ToolsetsTab from "@/components/explore/ToolsetsTab"
import HooksTab from "@/components/explore/HooksTab"
import McpTab from "@/components/explore/McpTab"
import CronTab from "@/components/explore/CronTab"
import ConfigTab from "@/components/explore/ConfigTab"
import { Terminal, Users, Code, Wrench, Server, Clock, Settings, SearchX } from "lucide-react"

export default function ExplorePage() {
  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Exploración del Sistema</h1>
        <p className="text-muted-foreground">
          Explora todo lo que Hermes tiene configurado: profiles, skills, toolsets, hooks, MCP servers, cron y config.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap w-full justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="toolsets">Toolsets</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
          <TabsTrigger value="cron">Cron</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SystemOverview />
        </TabsContent>

        <TabsContent value="profiles">
          <ProfilesList />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsGrid />
        </TabsContent>

        <TabsContent value="toolsets">
          <ToolsetsTab />
        </TabsContent>

        <TabsContent value="hooks">
          <HooksTab />
        </TabsContent>

        <TabsContent value="mcp">
          <McpTab />
        </TabsContent>

        <TabsContent value="cron">
          <CronTab />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
