# mri_devtools

A unified developer tools suite for **FiveM** that merges the functionalities of particle configuration and frontend sound auditing into a single standalone interface. Built with **React**, **Tailwind CSS v4**, and the **`@mriqbox/ui-kit`** layout guidelines.

---

## Features

### 🔊 Sound Tester
* **Virtualized List**: Renders up to 2,000+ standard GTA V frontend sound assets smoothly without NUI lag.
* **Auto-play on Move**: Automatically play sounds as you select them with keyboard keys.
* **Smart Filter & Search**: Search sounds by name or reference, and toggle `Hide Unsetted` to filter out default/empty AudioRefs.
* **Favorites & Recents**: Persistent tabs (`gst_favs` and `gst_recent`) stored in the browser's `localStorage`.
* **Keyboard-First Auditioning**:
  * <kbd>↑</kbd> <kbd>↓</kbd> : Navigate and automatically preview selected sounds.
  * <kbd>Enter</kbd> / <kbd>Space</kbd> : Replay current sound.
  * <kbd>R</kbd> : Replay current sound.
  * <kbd>S</kbd> : Stop all sounds.
  * <kbd>C</kbd> : Copy the ready-to-use `PlaySoundFrontend` Lua snippet to your clipboard.
  * <kbd>F</kbd> : Toggle Favorite status.
  * <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd> : Quick switch between *All*, *Favorites*, and *Recent* sub-tabs.

---

### ✨ Particle Viewer
* **Looped PTFX Preview**: Spawns looped particle effects attached to your player ped.
* **Live Adjustments**: Adjust particle scales, RGBA colors, and looped evolution parameters in real-time.
* **Orbit Camera Loop**: Triggers a scripted camera (`DEFAULT_SCRIPTED_CAMERA`) pointing at the ped:
  * **Rotate**: Right-click and drag anywhere on screen.
  * **Zoom**: Scroll wheel anywhere on screen (auto-blocked when hovering over the UI widget).
* **Lua Code Generator**: Builds dynamic Lua code snippets with current scale, color, and evolution attributes. Click "Copy" to instantly get the code block.

---

### 🎨 HUD UI & UX Design
* **Compact Footprint**: Locked to a sleek, draggable widget layout (~1/3 screen width, max `520px`) to prevent blocking view of the game world.
* **Collapsible Sidebar**: Starts collapsed showing icons only. Expands smoothly to `220px` showing labels on hover.
* **Persistent Window Coordinates**: Restores coordinates across sessions using `localStorage`.

---

## Installation & Setup

1. Copy the `mri_devtools` directory to your FiveM server's `resources` folder.
2. Add `ensure mri_devtools` in your server configuration file (`server.cfg`).
3. Once in-game, toggle the menu by typing:
   ```bash
   /devtools
   ```

---

## Integration Exports

You can open or close the menu programmatically from other client scripts:

```lua
-- Open the menu on the Particle Viewer tab
exports.mri_devtools:Open("particles")

-- Open the menu on the Sound Tester tab
exports.mri_devtools:Open("sounds")

-- Close the menu
exports.mri_devtools:Close()
```

---

## Credits

This resource is a unified, modernized port of the following original developer utilities:
* **[gta_sound_tester](https://github.com/mikigoalie/gta_sound_tester)**: Original frontend sound set tester and virtualized list.
* **[FiveM-ParticleViewer](https://github.com/freamee/FiveM-ParticleViewer)**: Original PTFX orbit view camera, scales, and looping handles.
