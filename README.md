# Retyped

I wanted to read a book online and the font was more suited to a printed book than an online one. I couldn't find a simple extension to change it, so I built Retyped.

Retyped is a Chrome extension that lets you change the font on any website. Pick a font, click Apply, and it sticks — per site, across reloads.

## Features

- **Per-site font override** — each domain remembers its own font choice
- **JetBrains Mono Nerd Font** bundled out of the box
- **Custom font upload** — bring your own `.woff2` or `.ttf` files
- **Instant toggle** — apply or remove with one click, no reload needed
- **Badge indicator** — green "ON" badge on tabs with an active override
- **Persistent** — settings persist on browser restarts

## Install

1. Clone or download this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `retyped/` directory

## Usage

1. Navigate to any website
2. Click the Retyped extension icon
3. Pick a font from the dropdown
4. Click **Apply** — all text on the page changes
5. Click **Remove** to revert

To use a custom font: click the file input, select a `.woff2` or `.ttf` file, and it will be added to the dropdown. Custom fonts can be deleted with the **Delete font** button.
