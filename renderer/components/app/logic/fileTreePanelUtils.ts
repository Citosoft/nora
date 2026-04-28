import type { FileTreeNode } from "@/components/app/types/component.types";

export const buildFileTree = (paths: string[], directoryPaths: string[]): FileTreeNode[] => {
  const root: FileTreeNode = {
    name: "",
    path: "",
    kind: "directory",
    children: []
  };

  const upsertPath = (pathName: string, leafKind: "file" | "directory") => {
    const parts = pathName.split("/").filter(Boolean);
    let current = root;
    parts.forEach((part, index) => {
      const nextPath = current.path ? `${current.path}/${part}` : part;
      const isLeaf = index === parts.length - 1;
      const nodeKind = isLeaf ? leafKind : "directory";
      let child = current.children.find((entry) => entry.name === part);

      if (!child) {
        child = {
          name: part,
          path: nextPath,
          kind: nodeKind,
          children: []
        };
        current.children.push(child);
      }

      if (child.kind === "file" && nodeKind === "directory") {
        child.kind = "directory";
      }

      current = child;
    });
  };

  for (const filePath of paths) {
    upsertPath(filePath, "file");
  }
  for (const directoryPath of directoryPaths) {
    upsertPath(directoryPath, "directory");
  }

  const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] =>
    nodes
      .map((node) => ({
        ...node,
        children: sortNodes(node.children)
      }))
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === "directory" ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });

  return sortNodes(root.children);
};

export const listSiblingNames = (paths: string[], directoryPaths: string[], parentDirectoryPath: string): Set<string> => {
  const allPaths = [...paths, ...directoryPaths];
  const siblingNames = new Set<string>();
  for (const pathName of allPaths) {
    const normalized = pathName.trim();
    if (!normalized) {
      continue;
    }
    if (getParentDirectoryPath(normalized) !== parentDirectoryPath) {
      continue;
    }
    siblingNames.add(getFileName(normalized));
  }
  return siblingNames;
};

export const getDefaultNewFolderName = (siblingNames: Set<string>): string => {
  const baseName = "New folder";
  if (!siblingNames.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (siblingNames.has(`${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
};

export const getDefaultNewFileName = (siblingNames: Set<string>): string => {
  const baseName = "new-file.txt";
  if (!siblingNames.has(baseName)) {
    return baseName;
  }
  let index = 2;
  while (siblingNames.has(`new-file-${index}.txt`)) {
    index += 1;
  }
  return `new-file-${index}.txt`;
};

export const buildChildPath = (parentDirectoryPath: string, childName: string): string =>
  parentDirectoryPath ? `${parentDirectoryPath}/${childName}` : childName;

export const ensureAncestorDirectories = (pathName: string): string[] => {
  const parts = pathName.split("/").filter(Boolean);
  const expanded: string[] = [];
  let current = "";
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = current ? `${current}/${parts[index]}` : parts[index];
    expanded.push(current);
  }
  return expanded;
};

export const getParentDirectoryPath = (pathName: string): string => {
  const parts = pathName.split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
};

export const getFileName = (pathName: string): string => {
  const parts = pathName.split("/").filter(Boolean);
  return parts[parts.length - 1] || pathName;
};

export const buildSiblingPath = (pathName: string, nextFileName: string): string => {
  const parentDirectoryPath = getParentDirectoryPath(pathName);
  return parentDirectoryPath ? `${parentDirectoryPath}/${nextFileName}` : nextFileName;
};
