# Remote Browser Debug

A lightweight, peer-to-peer JavaScript remote debugging tool built on [VDO.Ninja](https://vdo.ninja)'s WebRTC data channels.

## Features

- Execute JavaScript remotely on any connected browser
- Real-time code execution and response
- No installation required - works in any modern browser
- Simple room-based pairing system
- Execute code locally or remotely
- Dark mode interface optimized for debugging
- Zero server dependencies - all communication is P2P

## How It Works

1. Open the tool in your browser
2. Enter a room name (or use the auto-generated one)
3. Click "Connect" to join the room
4. Share the generated link with the device you want to debug
5. Once connected (green indicator), type JavaScript in the editor
6. Click "Execute Remote" to run code on the connected device

## Use Cases

- Debug mobile devices without developer tools
- Test JavaScript on IoT or embedded browsers
- Remote troubleshooting across networks
- Teaching and pair programming sessions
- Testing cross-browser compatibility issues

## Security Note

All code is executed using `eval()`. Only share connection links with trusted devices and users.

## Getting Started

Simply clone this repository and open the HTML file in your browser, or access the hosted version at [your-hosted-url.com](https://your-hosted-url.com).

```
git clone https://github.com/username/remote-browser-debug.git
cd remote-browser-debug
# Open index.html in your browser
```

## How It's Built

Remote Browser Debug leverages VDO.Ninja's WebRTC data channels to establish peer-to-peer connections between browsers. It requires no server-side components, making it easy to deploy and use anywhere.

## Contributions

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/username/remote-browser-debug/issues).
