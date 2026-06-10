"use client"

import { useEffect, useState } from "react"
import { getProfiles, getProfileDetail } from "@/lib/api"
import { ProfileBasic, ProfileDetail } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { UsersIcon, FileTextIcon, SettingsIcon } from "lucide-react"

export default function ProfilesList() {
  const [profiles, setProfiles] = useState<ProfileBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleProfileClick = async (name: string) => {
    setDetailLoading(true)
    try {
      const detail = await getProfileDetail(name)
      setSelectedProfile(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UsersIcon className="h-5 w-5" />
          Profiles ({profiles.length})
        </h3>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No profiles found. Create a profile to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card
              key={profile.name}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handleProfileClick(profile.name)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{profile.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {profile.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {profile.skills.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {profile.skills.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{profile.skills.length - 4}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Profile detail dialog */}
      <Dialog
        open={!!selectedProfile}
        onOpenChange={(open) => {
          if (!open) setSelectedProfile(null)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : selectedProfile ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  {selectedProfile.name}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Skills */}
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                      <SettingsIcon className="h-4 w-4" />
                      Skills
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedProfile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                      {selectedProfile.skills.length === 0 && (
                        <span className="text-sm text-muted-foreground">
                          No skills installed
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* SOUL.md */}
                  {selectedProfile.soul && (
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                        <FileTextIcon className="h-4 w-4" />
                        SOUL.md
                      </h4>
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {selectedProfile.soul}
                      </pre>
                    </div>
                  )}

                  {/* MEMORY.md */}
                  {selectedProfile.memory && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <FileTextIcon className="h-4 w-4" />
                          MEMORY.md
                        </h4>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {selectedProfile.memory}
                        </pre>
                      </div>
                    </>
                  )}

                  {/* USER.md */}
                  {selectedProfile.user && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <FileTextIcon className="h-4 w-4" />
                          USER.md
                        </h4>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {selectedProfile.user}
                        </pre>
                      </div>
                    </>
                  )}

                  {/* Config */}
                  {selectedProfile.config && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <SettingsIcon className="h-4 w-4" />
                          config.yaml
                        </h4>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(selectedProfile.config, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
