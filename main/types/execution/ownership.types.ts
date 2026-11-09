export interface ExecutionOwner {
  id: string;
  processId: number;
}
export interface OwnershipStore {
  ownership(): ExecutionOwner | null;
  claimOwnership(owner: ExecutionOwner, expectedOwnerId: string | null): boolean;
  releaseOwnership(ownerId: string): boolean;
}
export interface OwnershipDependencies {
  store: OwnershipStore;
  owner: ExecutionOwner;
  isProcessAlive: (processId: number) => boolean;
}
