import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { OAuthDeviceCodeDialog } from "@/components/app/dialogs/OAuthDeviceCodeDialog";

export function OAuthDeviceCodeHarness() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  return <>
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[8999] bg-black/60" />
        <Dialog.Content className="fixed inset-12 z-[9000] bg-card p-6">
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.Description>Connect your GitHub account.</Dialog.Description>
          <button id="connect" onClick={() => setOpen(true)}>Connect GitHub</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <OAuthDeviceCodeDialog open={open} onOpenChange={setOpen}
      prompt={{ provider: "github", providerLabel: "GitHub", userCode: "ABCD-1234", verificationUri: "https://github.com/login/device" }}
      onCopyCode={async (code) => { setCopied(code); }} onOpenVerificationUrl={setVerificationUrl} />
    <output id="copied">{copied}</output>
    <output id="verification-url">{verificationUrl}</output>
  </>;
}

const root = document.getElementById("app");
if (!root) throw new Error("OAuth device-code acceptance root is missing");
createRoot(root).render(<OAuthDeviceCodeHarness />);
