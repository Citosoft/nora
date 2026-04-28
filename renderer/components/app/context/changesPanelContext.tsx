import type {
  ChangesPanelChromeSlice,
  ChangesPanelFilesSlice,
  ChangesPanelForgeSlice,
  ChangesPanelProps,
  ChangesPanelVercelSlice,
  ChangesPanelWorkspaceSlice
} from "@/components/app/types/changesPanel.types";
import { createContext, useContext, type ReactNode } from "react";

const ChangesPanelWorkspaceContext = createContext<ChangesPanelWorkspaceSlice | null>(null);
const ChangesPanelFilesContext = createContext<ChangesPanelFilesSlice | null>(null);
const ChangesPanelForgeContext = createContext<ChangesPanelForgeSlice | null>(null);
const ChangesPanelVercelContext = createContext<ChangesPanelVercelSlice | null>(null);
const ChangesPanelChromeContext = createContext<ChangesPanelChromeSlice | null>(null);

export function ChangesPanelProvider({
  value,
  children
}: {
  value: ChangesPanelProps;
  children: ReactNode;
}) {
  return (
    <ChangesPanelWorkspaceContext.Provider value={value.workspace}>
      <ChangesPanelFilesContext.Provider value={value.files}>
        <ChangesPanelForgeContext.Provider value={value.forge}>
          <ChangesPanelVercelContext.Provider value={value.vercel}>
            <ChangesPanelChromeContext.Provider value={value.chrome}>
              {children}
            </ChangesPanelChromeContext.Provider>
          </ChangesPanelVercelContext.Provider>
        </ChangesPanelForgeContext.Provider>
      </ChangesPanelFilesContext.Provider>
    </ChangesPanelWorkspaceContext.Provider>
  );
}

function useChangesSlice<T>(context: React.Context<T | null>, label: string): T {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${label} must be used within a ChangesPanelProvider.`);
  }
  return value;
}

export function useChangesPanelWorkspace(): ChangesPanelWorkspaceSlice {
  return useChangesSlice(ChangesPanelWorkspaceContext, "useChangesPanelWorkspace");
}

export function useChangesPanelFiles(): ChangesPanelFilesSlice {
  return useChangesSlice(ChangesPanelFilesContext, "useChangesPanelFiles");
}

export function useChangesPanelForge(): ChangesPanelForgeSlice {
  return useChangesSlice(ChangesPanelForgeContext, "useChangesPanelForge");
}

export function useChangesPanelVercel(): ChangesPanelVercelSlice {
  return useChangesSlice(ChangesPanelVercelContext, "useChangesPanelVercel");
}

export function useChangesPanelChrome(): ChangesPanelChromeSlice {
  return useChangesSlice(ChangesPanelChromeContext, "useChangesPanelChrome");
}

export function useChangesPanelContext(): ChangesPanelProps {
  return {
    workspace: useChangesPanelWorkspace(),
    files: useChangesPanelFiles(),
    forge: useChangesPanelForge(),
    vercel: useChangesPanelVercel(),
    chrome: useChangesPanelChrome()
  };
}
