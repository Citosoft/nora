// Clerk publishes subpath types through an exports map. Bridge those declarations
// for Nora's legacy Node resolver without changing runtime imports or SDK types.
declare module "@clerk/electron/storage" {
  export { storage } from "@clerk/electron/dist/types/storage";
}
declare module "@clerk/electron/preload" {
  export { exposeClerkBridge } from "@clerk/electron/dist/types/preload";
}
declare module "@clerk/electron/react" {
  export * from "@clerk/electron/dist/types/react";
}
declare module "@clerk/shared/types" {
  export * from "@clerk/shared/dist/types";
}
