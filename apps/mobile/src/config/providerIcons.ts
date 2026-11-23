// Logos are the same product marks Nora Desktop ships under renderer/product-icons, bundled here by provider kind.
import claudeLogo from "../../assets/provider-icons/claude.png";
import codexLogo from "../../assets/provider-icons/codex.png";
import piLogo from "../../assets/provider-icons/pi.png";
import cursorLogo from "../../assets/provider-icons/cursor.png";
import gooseLogo from "../../assets/provider-icons/goose.png";
import qwenLogo from "../../assets/provider-icons/qwen.png";
import opencodeLogo from "../../assets/provider-icons/opencode.png";
import antigravityLogo from "../../assets/provider-icons/antigravity.png";
import grokLogo from "../../assets/provider-icons/grok.png";
import copilotLogo from "../../assets/provider-icons/copilot.png";
import clineLogo from "../../assets/provider-icons/cline.png";
import ampLogo from "../../assets/provider-icons/amp.png";
import kiloLogo from "../../assets/provider-icons/kilo.png";
import kiroLogo from "../../assets/provider-icons/kiro.png";
import augLogo from "../../assets/provider-icons/aug.png";
import autohandLogo from "../../assets/provider-icons/autohand.png";
import droidLogo from "../../assets/provider-icons/droid.png";
import kimiLogo from "../../assets/provider-icons/kimi.png";
import mistralVibeLogo from "../../assets/provider-icons/mistral-vibe.png";
import type { ProviderKind } from "@shared/types/provider/providerKind.types";
import type { ProviderPresentation } from "@/types/providerIcon.types";
import { brandImages } from "./brandImages";

/** Every provider a chat can run on; exhaustive so a new provider kind fails the typecheck until it has a logo. */
export const providerPresentations: Readonly<Record<ProviderKind, ProviderPresentation>> = Object.freeze({
  claude: { label: "Claude Code", source: claudeLogo },
  codex: { label: "Codex", source: codexLogo },
  pi: { label: "Pi", source: piLogo },
  cursor: { label: "Cursor Agent", source: cursorLogo },
  goose: { label: "Goose", source: gooseLogo },
  qwen: { label: "Qwen Code", source: qwenLogo },
  opencode: { label: "OpenCode", source: opencodeLogo },
  antigravity: { label: "Antigravity", source: antigravityLogo },
  grok: { label: "Grok Build", source: grokLogo },
  copilot: { label: "GitHub Copilot CLI", source: copilotLogo },
  cline: { label: "Cline", source: clineLogo },
  amp: { label: "Amp", source: ampLogo },
  kilo: { label: "Kilocode", source: kiloLogo },
  kiro: { label: "Kiro", source: kiroLogo },
  aug: { label: "Auggie", source: augLogo },
  autohand: { label: "Autohand Code", source: autohandLogo },
  droid: { label: "Droid", source: droidLogo },
  kimi: { label: "Kimi", source: kimiLogo },
  "mistral-vibe": { label: "Mistral Vibe", source: mistralVibeLogo },
  nora: { label: "Nora", source: brandImages.appIcon }
});
