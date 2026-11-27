import { BOT_EXPORT_FORMAT, BOT_EXPORT_VERSION } from "./botExport";

/**
 * What the user pastes into another app's main bot (e.g. Grok Bot) so it writes its bots out in Nora's format.
 * Apps like Grok Bot keep bot settings on their servers, so the bot itself is the only reliable exporter.
 */
export function botExportPrompt(): string {
  return `I'm moving my bots to another app called Nora. Please export every bot I have (including yourself) as JSON in exactly this format, and reply with only the JSON in a single code block:

{
  "format": "${BOT_EXPORT_FORMAT}",
  "version": ${BOT_EXPORT_VERSION},
  "source": "<the name of this app>",
  "bots": [
    {
      "name": "<bot name>",
      "role": "<one-line description of what the bot does>",
      "instructions": "<the bot's full instructions, purpose and personality, word for word where you have them>",
      "skills": [{ "name": "<skill name>", "description": "<when to use it>", "instructions": "<the skill's full instructions>" }],
      "model": { "provider": "<model provider, e.g. xai>", "model": "<model id>" },
      "avatar": { "shape": "<avatar shape name>", "color": "<avatar colour as #rrggbb>" },
      "memory": ["<one remembered fact per item>"],
      "routines": [
        {
          "name": "<routine name>",
          "instruction": "<what the bot does when it runs>",
          "timezone": "<IANA timezone, e.g. Europe/London>",
          "schedule": <one of: {"kind":"hourly","minute":0} | {"kind":"daily","time":"09:00"} | {"kind":"weekdays","time":"09:00"} | {"kind":"weekly","weekday":1,"time":"09:00"} (0 = Sunday) | {"kind":"monthly","day":1,"time":"09:00"} | {"kind":"custom","expression":"<five-field cron>"}>
        }
      ],
      "tools": [{ "name": "<connected tool or MCP server name>", "url": "<its server URL if it has one>" }]
    }
  ]
}

Rules:
- Include every bot, its complete instructions, all skills and everything you remember for it.
- Never include passwords, API keys, tokens, cookies or other secrets.
- Leave out any field you don't know rather than guessing.`;
}
