import * as Dialog from "@radix-ui/react-dialog";
import { FolderOpen } from "lucide-react";
import { usePersonalWorkspaceIntro } from "@/components/app/hooks/usePersonalWorkspaceIntro";
import { PersonalWorkspaceArt } from "@/components/app/shared/PersonalWorkspaceArt";
import type { PersonalWorkspaceIntroProps } from "@/components/app/types/personalWorkspaceIntro.types";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogContent, DialogFooter } from "@/components/ui/dialog";

export function PersonalWorkspaceIntro({ blocked }: PersonalWorkspaceIntroProps) {
  const { open, dismiss } = usePersonalWorkspaceIntro(blocked);
  return <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[30000] bg-background/80 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[30001] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
        <DialogContent className="w-[min(32rem,calc(100vw-2rem))]" onClose={dismiss}
          headerTitle={<Dialog.Title>Meet your personal workspace</Dialog.Title>}>
          <DialogBody className="space-y-5">
            <Dialog.Description className="text-sm text-muted-foreground">
              A workspace keeps related conversations and work together. Personal is your ready-to-use space for everyday tasks, without opening a project.
            </Dialog.Description>
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
              <PersonalWorkspaceArt className="size-10 shrink-0 rounded-lg" />
              <div className="space-y-1 text-sm">
                <h3 className="font-medium">Personal: start with an idea</h3>
                <p className="text-muted-foreground">Ask questions, research a topic, draft something, or plan your day. Nora manages this workspace for you; it isn’t tied to a project folder or Git repository.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4">
              <FolderOpen className="size-10 shrink-0 p-2 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-1 text-sm">
                <h3 className="font-medium">Other workspaces: focus on a project</h3>
                <p className="text-muted-foreground">Open a folder or repository to work with its files and keep its conversations together. Git repositories also give you branches, worktrees, and change reviews.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Start here, then use the workspace picker in the sidebar to add or switch to a project whenever you need one.</p>
          </DialogBody>
          <DialogFooter><Button onClick={dismiss}>Got it</Button></DialogFooter>
        </DialogContent>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
