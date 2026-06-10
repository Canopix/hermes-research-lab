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

export default function ExplorePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Exploración del Sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explora todo lo que Hermes tiene configurado: profiles, skills, toolsets, hooks, MCP servers, cron y config.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap w-full justify-start gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="text-xs font-medium">Overview</TabsTrigger>
          <TabsTrigger value="profiles" className="text-xs font-medium">Profiles</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs font-medium">Skills</TabsTrigger>
          <TabsTrigger value="toolsets" className="text-xs font-medium">Toolsets</TabsTrigger>
          <TabsTrigger value="hooks" className="text-xs font-medium">Hooks</TabsTrigger>
          <TabsTrigger value="mcp" className="text-xs font-medium">MCP</TabsTrigger>
          <TabsTrigger value="cron" className="text-xs font-medium">Cron</TabsTrigger>
          <TabsTrigger value="config" className="text-xs font-medium">Config</TabsTrigger>
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
