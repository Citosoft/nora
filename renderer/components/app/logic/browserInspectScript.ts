import { BROWSER_INSPECT_MESSAGE_PREFIX } from "@/components/app/logic/browserAnnotation";
import type { BrowserAnnotation, BrowserElementTarget } from "@shared/appTypes";

export { BROWSER_INSPECT_MESSAGE_PREFIX };

type RepinEntry = {
  id: string;
  index: number;
  selector: string;
  selectorFallbacks: string[];
};

function buildRepinEntries(annotations: BrowserAnnotation[]): RepinEntry[] {
  return annotations.map((annotation, index) => ({
    id: annotation.id,
    index: index + 1,
    selector: annotation.target.selector,
    selectorFallbacks: annotation.target.selectorFallbacks
  }));
}

const INSPECT_SCRIPT_BODY = `
(function () {
  if (window.__NORA_INSPECT_ACTIVE__) {
    return;
  }
  window.__NORA_INSPECT_ACTIVE__ = true;

  var MESSAGE_PREFIX = ${JSON.stringify(BROWSER_INSPECT_MESSAGE_PREFIX)};
  var HIGHLIGHT_ID = "nora-inspect-highlight";
  var ROOT_ID = "nora-inspect-root";

  function escapeCssIdent(value) {
    if (typeof CSS !== "undefined" && CSS.escape) {
      return CSS.escape(value);
    }
    return String(value).replace(/([^\\w-])/g, "\\\\$1");
  }

  function truncate(value, max) {
    var text = String(value || "").replace(/\\s+/g, " ").trim();
    if (text.length <= max) {
      return text;
    }
    return text.slice(0, max - 1) + "…";
  }

  function collectAttributes(element) {
    var attributes = {};
    if (element.id) {
      attributes.id = element.id;
    }
    if (element.className && typeof element.className === "string") {
      attributes.class = element.className;
    }
    if (element.getAttribute("name")) {
      attributes.name = element.getAttribute("name");
    }
    if (element.getAttribute("data-testid")) {
      attributes["data-testid"] = element.getAttribute("data-testid");
    }
    if (element.getAttribute("aria-label")) {
      attributes["aria-label"] = element.getAttribute("aria-label");
    }
    return attributes;
  }

  function buildNthOfTypePath(element) {
    var parts = [];
    var current = element;
    while (current && current.nodeType === 1 && current !== document.documentElement) {
      var selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += "#" + escapeCssIdent(current.id);
        parts.unshift(selector);
        break;
      }
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.prototype.filter.call(parent.children, function (child) {
          return child.tagName === current.tagName;
        });
        if (siblings.length > 1) {
          var index = siblings.indexOf(current) + 1;
          selector += ":nth-of-type(" + index + ")";
        }
      }
      parts.unshift(selector);
      current = parent;
    }
    return parts.join(" > ");
  }

  function buildSelectorCandidates(element) {
    var candidates = [];
    if (!element || element.nodeType !== 1) {
      return candidates;
    }

    if (element.id) {
      var idSelector = "#" + escapeCssIdent(element.id);
      if (document.querySelectorAll(idSelector).length === 1) {
        candidates.push(idSelector);
      }
    }

    var testId = element.getAttribute("data-testid");
    if (testId) {
      var testSelector = '[data-testid="' + testId.replace(/"/g, '\\\\"') + '"]';
      if (document.querySelectorAll(testSelector).length === 1) {
        candidates.push(testSelector);
      }
    }

    var ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      var ariaSelector = '[aria-label="' + ariaLabel.replace(/"/g, '\\\\"') + '"]';
      if (document.querySelectorAll(ariaSelector).length === 1) {
        candidates.push(ariaSelector);
      }
    }

    var className = typeof element.className === "string" ? element.className.trim().split(/\\s+/).filter(Boolean)[0] : "";
    if (className) {
      var classSelector = element.tagName.toLowerCase() + "." + escapeCssIdent(className);
      if (document.querySelectorAll(classSelector).length === 1) {
        candidates.push(classSelector);
      }
    }

    var nthPath = buildNthOfTypePath(element);
    if (nthPath) {
      candidates.push(nthPath);
    }

    var unique = [];
    candidates.forEach(function (candidate) {
      if (candidate && unique.indexOf(candidate) === -1) {
        unique.push(candidate);
      }
    });
    return unique;
  }

  function buildTargetPayload(element) {
    var selectors = buildSelectorCandidates(element);
    var selector = selectors[0] || buildNthOfTypePath(element) || element.tagName.toLowerCase();
    var fallbacks = selectors.filter(function (entry) {
      return entry !== selector;
    });
    return {
      selector: selector,
      selectorFallbacks: fallbacks,
      tagName: element.tagName,
      textPreview: truncate(element.innerText || element.textContent || "", 120),
      htmlSnippet: truncate(element.outerHTML || "", 500),
      attributes: collectAttributes(element)
    };
  }

  function ensureHighlight() {
    var existing = document.getElementById(HIGHLIGHT_ID);
    if (existing) {
      return existing;
    }
    var highlight = document.createElement("div");
    highlight.id = HIGHLIGHT_ID;
    highlight.style.position = "fixed";
    highlight.style.pointerEvents = "none";
    highlight.style.zIndex = "2147483646";
    highlight.style.border = "2px solid #3b82f6";
    highlight.style.background = "rgba(59, 130, 246, 0.12)";
    highlight.style.borderRadius = "2px";
    highlight.style.display = "none";
    highlight.style.boxSizing = "border-box";
    document.documentElement.appendChild(highlight);
    return highlight;
  }

  function positionHighlight(element) {
    var highlight = ensureHighlight();
    var rect = element.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.top = rect.top + "px";
    highlight.style.left = rect.left + "px";
    highlight.style.width = rect.width + "px";
    highlight.style.height = rect.height + "px";
  }

  function hideHighlight() {
    var highlight = document.getElementById(HIGHLIGHT_ID);
    if (highlight) {
      highlight.style.display = "none";
    }
  }

  function isInspectOverlayNode(node) {
    if (!node || node.nodeType !== 1) {
      return false;
    }
    var element = node;
    return element.id === HIGHLIGHT_ID || element.id === ROOT_ID || element.closest("#" + ROOT_ID) !== null;
  }

  function handleMouseOver(event) {
    var target = event.target;
    if (!(target instanceof Element) || isInspectOverlayNode(target)) {
      return;
    }
    positionHighlight(target);
  }

  function handleClick(event) {
    var target = event.target;
    if (!(target instanceof Element) || isInspectOverlayNode(target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    positionHighlight(target);
    console.log(MESSAGE_PREFIX + JSON.stringify(buildTargetPayload(target)));
  }

  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("click", handleClick, true);

  window.__NORA_INSPECT_TEARDOWN__ = function () {
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("click", handleClick, true);
    hideHighlight();
    var highlight = document.getElementById(HIGHLIGHT_ID);
    if (highlight) {
      highlight.remove();
    }
    var root = document.getElementById(ROOT_ID);
    if (root) {
      root.remove();
    }
    delete window.__NORA_INSPECT_ACTIVE__;
    delete window.__NORA_INSPECT_TEARDOWN__;
  };
})();
`;

export function buildBrowserInspectInstallScript(): string {
  return INSPECT_SCRIPT_BODY.trim();
}

export function buildBrowserInspectTeardownScript(): string {
  return `
    (function () {
      if (typeof window.__NORA_INSPECT_TEARDOWN__ === "function") {
        window.__NORA_INSPECT_TEARDOWN__();
      }
      delete window.__NORA_INSPECT_ACTIVE__;
      delete window.__NORA_INSPECT_TEARDOWN__;
      var highlight = document.getElementById("nora-inspect-highlight");
      if (highlight) {
        highlight.remove();
      }
      var root = document.getElementById("nora-inspect-root");
      if (root) {
        root.remove();
      }
    })();
  `.trim();
}

export function buildBrowserInspectRepinScript(annotations: BrowserAnnotation[]): string {
  const entries = buildRepinEntries(annotations);
  return `
    (function () {
      var ROOT_ID = "nora-inspect-root";
      var existing = document.getElementById(ROOT_ID);
      if (existing) {
        existing.remove();
      }

      var entries = ${JSON.stringify(entries)};
      if (!entries.length) {
        return;
      }

      var root = document.createElement("div");
      root.id = ROOT_ID;
      root.style.position = "fixed";
      root.style.inset = "0";
      root.style.pointerEvents = "none";
      root.style.zIndex = "2147483645";

      function findElement(entry) {
        var selectors = [entry.selector].concat(entry.selectorFallbacks || []);
        for (var i = 0; i < selectors.length; i += 1) {
          try {
            var match = document.querySelector(selectors[i]);
            if (match) {
              return match;
            }
          } catch (_error) {
            continue;
          }
        }
        return null;
      }

      entries.forEach(function (entry) {
        var element = findElement(entry);
        if (!element) {
          return;
        }
        var rect = element.getBoundingClientRect();
        if (!rect.width && !rect.height) {
          return;
        }
        var badge = document.createElement("div");
        badge.setAttribute("data-nora-annotation-id", entry.id);
        badge.textContent = String(entry.index);
        badge.style.position = "fixed";
        badge.style.top = Math.max(0, rect.top - 10) + "px";
        badge.style.left = Math.max(0, rect.left - 4) + "px";
        badge.style.minWidth = "18px";
        badge.style.height = "18px";
        badge.style.padding = "0 4px";
        badge.style.borderRadius = "9999px";
        badge.style.background = "#3b82f6";
        badge.style.color = "#ffffff";
        badge.style.font = "600 10px/18px ui-sans-serif, system-ui, sans-serif";
        badge.style.textAlign = "center";
        badge.style.boxShadow = "0 1px 4px rgba(0,0,0,0.25)";
        root.appendChild(badge);
      });

      if (root.childElementCount > 0) {
        document.documentElement.appendChild(root);
      }
    })();
  `.trim();
}

export function parseBrowserInspectTargetMessage(
  message: string,
  pageUrl: string,
  pageTitle: string
): BrowserElementTarget | null {
  if (!message.startsWith(BROWSER_INSPECT_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(message.slice(BROWSER_INSPECT_MESSAGE_PREFIX.length)) as {
      selector?: string;
      selectorFallbacks?: string[];
      tagName?: string;
      textPreview?: string;
      htmlSnippet?: string;
      attributes?: Record<string, string>;
    };

    if (typeof payload.selector !== "string" || !payload.selector.trim()) {
      return null;
    }
    if (typeof payload.tagName !== "string" || !payload.tagName.trim()) {
      return null;
    }

    return {
      pageUrl,
      pageTitle,
      selector: payload.selector,
      selectorFallbacks: Array.isArray(payload.selectorFallbacks)
        ? payload.selectorFallbacks.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [],
      tagName: payload.tagName,
      textPreview: typeof payload.textPreview === "string" ? payload.textPreview : "",
      htmlSnippet: typeof payload.htmlSnippet === "string" ? payload.htmlSnippet : "",
      attributes:
        payload.attributes && typeof payload.attributes === "object"
          ? Object.fromEntries(
              Object.entries(payload.attributes).filter(
                (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
              )
            )
          : {}
    };
  } catch {
    return null;
  }
}
