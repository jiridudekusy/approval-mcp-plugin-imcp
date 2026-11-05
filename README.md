# Approval MCP plugin: iMCP

Presentation plugin for [Approval MCP](https://github.com/jiridudekusy/approval-mcp-wrapper).
This repository contains the approval UI plugin, not the upstream MCP server.

Install and manage it from Approval MCP's **Plugins** page. Installed artifacts
are cached in its persistent plugin directory; restarting Docker does not
download the plugin again. Tool permissions and approval policies remain in
the wrapper's access profiles.

## Development

Use Node.js 24:

```bash
npm ci
npm run verify
```

Edit `src/plugin.ts` and the tests, then commit both source and the generated
`dist/plugin.mjs` and `plugin.json`. The bundle has no runtime dependencies;
the wrapper verifies its SHA-256 before loading it. The copied `src/sdk`
contract snapshot defines plugin API v1 and supports standalone type checking.

For each release, increment the version in `package.json` and the plugin
implementation together. Increment `normalizationVersion` whenever normalized
context or grant predicate semantics change. Existing grants must not silently
apply to a changed interpretation of arguments.

## Host API

The module exports `createPlugin(host)`. The host supplies bounded, read-only
contact, chat, message, calendar, wellness-catalog, and Minutes resource lookups
as needed. The plugin returns localized titles, readable fields, normalized
context, and optional proposed grant scopes. The wrapper validates its output
and falls back to a generic presentation on errors.

Updates are installed by immutable Git commit. The wrapper's approved catalog
is the trust boundary: plugin code runs with the server's privileges, so only
install code from maintainers you trust. No npm lifecycle scripts run during
installation.

