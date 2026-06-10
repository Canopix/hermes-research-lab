"use client";

import { useApi } from "./useApi";
import { explore, hermes } from "@/lib/api";
import {
  SystemOverview,
  Profile,
  Template,
  Job,
  JobOutput,
  Session,
  Hook,
  McpServer,
  ActivityEntry,
} from "@/lib/types";

export function useOverview() {
  return useApi<SystemOverview>(() => explore.getOverview());
}

export function useProfiles() {
  return useApi<Profile[]>(() => explore.getProfiles());
}

export function useProfile(name: string) {
  return useApi<Profile>(() => explore.getProfile(name), [name]);
}

export function useMemory(name: string) {
  return useApi<{ name: string; memory: string }>(
    () => explore.getMemory(name),
    [name]
  );
}

export function useTemplates() {
  return useApi<Template[]>(() => explore.getTemplates());
}

export function useTemplate(id: string) {
  return useApi<Template>(() => explore.getTemplate(id), [id]);
}

export function useHooks() {
  return useApi<Hook[]>(() => explore.getHooks());
}

export function useMcpServers() {
  return useApi<McpServer[]>(() => explore.getMcpServers());
}

export function useActivity(limit?: number) {
  return useApi<ActivityEntry[]>(() => explore.getActivity(limit), [limit]);
}

export function useJobs() {
  return useApi<Job[]>(() => hermes.getJobs());
}

export function useJobOutputs(jobId: string) {
  return useApi<JobOutput[]>(() => hermes.getJobOutputs(jobId), [jobId]);
}

export function useSessions() {
  return useApi<Session[]>(() => hermes.getSessions());
}

export function useSearchSessions(query: string) {
  return useApi<Session[]>(() => explore.searchSessions(query), [query]);
}
