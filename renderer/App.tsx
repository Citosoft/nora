import { AppRoot } from "@/components/app/views/AppRoot";
import { NativeRuntimeProvider } from "@/components/app/views/NativeRuntimeProvider";

export function App() {
  return <NativeRuntimeProvider><AppRoot /></NativeRuntimeProvider>;
}
