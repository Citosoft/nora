import { useCopyToClipboard } from "@/components/app/hooks/useCopyToClipboard";
import type { AppImportBotExportPanelProps } from "@/components/app/types/appImport.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BOT_EXPORT_MAX_BYTES } from "@shared/app-import/botExport";
import { botExportPrompt } from "@shared/app-import/botExportPrompt";
import { Check, Copy, FileUp, LoaderCircle } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

/** Paste or choose a Nora bot export, with the prompt that gets one out of an app that keeps its bots elsewhere. */
export function AppImportBotExportPanel({ guide, botExport, disabled }: AppImportBotExportPanelProps) {
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const prompt = useMemo(() => botExportPrompt(), []);
  const { copied, copy } = useCopyToClipboard();
  const reading = botExport.readingTab === guide.tab;
  const busy = disabled || botExport.readingTab !== null;
  const exportError = botExport.error?.tab === guide.tab ? botExport.error.message : null;

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setFileError(null);
    if (!file) return;
    if (file.size > BOT_EXPORT_MAX_BYTES) { setFileError("That file is larger than 2 MB."); return; }
    void file.text().then((content) => botExport.add(guide.tab, content), () => setFileError("Nora couldn't open that file."));
  };

  return (
    <section className="space-y-3 rounded-lg border border-border/70 p-3" aria-label={`Import a bot export from ${guide.appName}`}>
      <div>
        <h3 className="text-sm font-medium">{guide.title}</h3>
        <p className="text-xs text-muted-foreground">{guide.description}</p>
      </div>
      <details className="rounded-md border border-border/60 px-3 py-2">
        <summary className="cursor-pointer text-sm">Get an export from {guide.appName}</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Copy the prompt below.</li>
          <li>{guide.sendStep}</li>
          <li>Copy the bot's whole reply and paste it into the box underneath.</li>
        </ol>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-[11px] leading-relaxed">{prompt}</pre>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => copy(prompt)}>
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </details>
      <label htmlFor={textareaId} className="sr-only">Bot export</label>
      <Textarea id={textareaId} value={text} onChange={(event) => setText(event.target.value)} placeholder='Paste the export here (it starts with {"format": "nora-bot-export" …)'
        spellCheck={false} className="min-h-[96px] font-mono text-xs" disabled={busy} />
      {exportError || fileError ? <p role="alert" className="text-xs text-destructive">{fileError ?? exportError}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={() => { botExport.add(guide.tab, text); setText(""); }}>
          {reading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : null}
          Add these bots
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>
          <FileUp className="size-3.5" aria-hidden />Choose a file…
        </Button>
        <input ref={fileInput} type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={readFile} />
      </div>
    </section>
  );
}
