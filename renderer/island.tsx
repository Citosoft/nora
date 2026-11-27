import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Island } from "@/components/island/Island";

const rootElement = document.getElementById("island");
if (!rootElement) throw new Error("Missing #island root");

createRoot(rootElement).render(<StrictMode><Island bridge={window.noraIsland} /></StrictMode>);
