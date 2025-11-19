# homebridge-bose

[![npm](https://img.shields.io/npm/v/homebridge-bose.svg)](https://www.npmjs.com/package/homebridge-bose)
[![npm](https://img.shields.io/npm/dt/homebridge-bose.svg)](https://www.npmjs.com/package/homebridge-bose)

Homebridge plugin for controlling Bose speakers and soundbars through HomeKit.

## Supported Devices

- Bose Home Speaker 300
- Bose Home Speaker 500
- Bose Soundbar series
- Other Bose speakers with WebSocket API support

## Features

- 🔊 **Volume Control** - Control volume through HomeKit (0-100%)
- 🔇 **Mute/Unmute** - Quick mute toggle
- 🔍 **Auto-Discovery** - Automatically finds Bose speakers on your network
- 🔄 **Real-time Updates** - Synchronizes state with your speaker

## Installation

1. Install Homebridge (if not already installed):
```bash
npm install -g homebridge
```

2. Install the plugin:
```bash
npm install -g homebridge-bose
```

3. Configure the plugin in your Homebridge `config.json`

## Configuration

Add this to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "BoseSpeaker",
      "name": "Bose Speakers",
      "email": "your.email@example.com",
      "password": "your_bose_password",
      "autoDiscover": true,
      "pollInterval": 10
    }
  ]
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `platform` | string | Yes | - | Must be "BoseSpeaker" |
| `name` | string | Yes | - | Display name for the platform |
| `email` | string | Yes | - | Your Bose account email |
| `password` | string | Yes | - | Your Bose account password |
| `autoDiscover` | boolean | No | true | Automatically discover speakers |
| `pollInterval` | number | No | 10 | Status polling interval (seconds) |

## HomeKit Integration

The plugin exposes your Bose speaker as a **Lightbulb** accessory in HomeKit:

- **Brightness** = Volume (0-100%)
- **On/Off** = Unmute/Mute

### Why Lightbulb?

HomeKit doesn't have a native volume slider for speakers. Using a lightbulb accessory is a standard workaround that provides an intuitive slider interface for volume control.

## Example Automations

Create scenes in HomeKit:
- "Good Morning" → Set Bose to 30% volume
- "Party Time" → Set Bose to 80% volume
- "Quiet Time" → Mute the speaker

## Troubleshooting

### Speaker Not Appearing in HomeKit
1. Check your Bose account credentials in config.json
2. Ensure your speaker is on the same network as Homebridge
3. Restart Homebridge: `sudo systemctl restart homebridge`

### Volume Control Not Working
1. Check Homebridge logs: `sudo journalctl -u homebridge -f`
2. Verify speaker IP address is correct
3. Try controlling volume through Bose Music app to ensure speaker is responsive

## Technical Details

This plugin uses:
- Bose WebSocket API for local control
- Automatic token refresh for authentication
- mDNS/Bonjour for speaker discovery

## Known Limitations

- Power on/off is not supported by Bose local API (requires cloud API)
- Transport controls (play/pause) require cloud API access

## Support

For issues and feature requests, please visit:
https://github.com/jan-sevcik-snadnee/homebridge-bose/issues

## License

MIT

## Author

Jan Sedivy

## Acknowledgments

Thanks to the Homebridge community for the platform and inspiration.
