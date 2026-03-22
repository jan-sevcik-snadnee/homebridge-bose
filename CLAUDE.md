# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Homebridge plugin that exposes Bose speakers (Home Speaker 300/500, Soundbar series) as HomeKit accessories. Speakers appear as Lightbulb accessories where brightness = volume (0-100%) and on/off = unmute/mute.

## Development

```bash
npm install          # install dependencies
npm link             # link plugin locally for testing with Homebridge
```

No build step — plain JavaScript (CommonJS). No test framework configured yet.

To test locally, run Homebridge with this plugin linked and a valid `config.json` containing Bose account credentials.

## Architecture

Two files, three classes:

**`bose-api.js`** — All Bose communication:
- `BoseAuth` — Multi-step auth flow: Gigya SDK config → Gigya login → Gigya JWT → Bose access token exchange. Uses OAuth1 signature for JWT request. Handles token refresh.
- `BoseDiscovery` — mDNS/Bonjour discovery for `_soundtouch._tcp` services on the local network.
- `BoseSpeaker` — WebSocket client (WSS, `eco2` subprotocol, self-signed cert) for real-time control. Sends JSON requests with auth tokens, handles responses via reqID matching, maintains internal state from notifications. Supports volume, mute, power, transport controls, and now playing.

**`index.js`** — Homebridge integration:
- `BosePlatform` — Dynamic platform plugin. On launch: authenticates → discovers devices (auto + manual config) → registers/updates/removes platform accessories.
- `BoseAccessory` — Maps speaker to Lightbulb service. Subscribes to WebSocket updates for real-time state sync, plus polling fallback at configurable interval.

## Key Technical Details

- Auth uses Gigya (SAP Customer Data Cloud) as identity provider — API keys and user-agent strings are reverse-engineered from the Bose Music iOS app.
- WebSocket connection uses `rejectUnauthorized: false` because Bose speakers use self-signed certificates.
- The `handleUpdate` callback in `BoseAccessory` expects `message.updates.volume` format, while `BoseSpeaker.updateState` uses `message.body.value`/`message.body.muted` — these are different message formats (notifications vs request responses).
- Platform is registered as `BoseSpeaker` (pluginAlias in `config.schema.json`).

## Workflow

Every change MUST follow this process:

1. **Implement** — make the change
2. **Code review** — run `/code-review` (quality, correctness, maintainability)
3. **Security review** — explicitly review for OWASP top 10, credential handling, injection risks
4. **Commit** — use `/commit` to commit with a descriptive message
5. **Push** — push to GitHub
6. **Release** — when ready, create a GitHub release (`gh release create`) with semver tag and changelog
7. **Publish** — publish to npm (`npm publish`)

Package is published at https://www.npmjs.com/package/homebridge-bose
