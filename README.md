# Modulus - _Mod Organizer Application_

### Supported Games

-   Total War: Warhammer 2
-   Total War: Warhammer 3
-   Total War: Three Kingdoms
-   Mount & Blade: Bannerlord

Requires Windows 10, Steam, 7z (for local mod installation).

![App image](https://i.imgur.com/zm0GGFP.png)

## Features

-   Lightweight and small bundle size
-   Mod profiles — easily switch between different mod configurations
-   Import & Export Mod Lists — to share your entire mod profile
-   Drag-and-drop mod reordering
-   Custom category and title assignment
-   Save game mod compatibility — to freely experiment with mods
-   View mod conflicts to spot compatibility issues
-   Smart mod dependency tracking
-   Use separators to group mods for better organization
-   Fast and smart filtering to quickly find your mods
-   Manual mod installation directly within the app, keeping your game folders clean
-   Nexus Mods integration — direct download with deep links
-   Force update for Steam Workshop mods — manually check for mod updates when Steam doesn’t
-   Simple, user-friendly UI

## Known Bugs

-   I could not find a way to properly drop steam api client and stopping the game from steam application (even when game is not actually open) causes this application to close and also if game is running and you close the application unexpected things can occur but i have not found any particular problem with this yet.

## Planned Improvements

Here are some ideas I might add in the future, depending on feedback and time:

-   Selective file exclusion from conflicts — choose files to exclude or ignore specific conflicts
-   Load order patching — unit size multiplier, language fix etc.
-   Create Steam collections from mod lists — publish your load order as a Steam collection
-   More games to support under Total War title

## For Developers

Install packages

```sh
bun install
```

Start the Tauri app

```sh
bun tauri dev
```

Build the Tauri app

> You need Steam API SDK files. steamworks-rs dynamically loads without any manual setup while in development mode but for bundling you would want to put those files in ./src-tauri.

```sh
bun tauri build
```

## License

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Credits

This project includes code from [steamworks.js](https://github.com/ceifa/steamworks.js), licensed under the MIT License.

Thanks [Frodo45127](https://github.com/Frodo45127) for creating [rpfm](https://github.com/Frodo45127/rpfm) which is one of the fundamental part of this app.
