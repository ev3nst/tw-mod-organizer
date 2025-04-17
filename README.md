# TW Mod Organizer

### Supported Games

-   Total War: Warhammer 2
-   Total War: Warhammer 3
-   Total War: Three Kingdoms
-   Mount & Blade: Bannerlord

Requires Windows 10, Steam, 7z (for local mod installation).

![App image](https://i.imgur.com/tF8XXkH.png)

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
-   Pack Viewer — to check the contents of a total war mod (beta)
-   Version Checker — informs you about potential upgrades and automatic updates from steam
-   Simple, user-friendly UI

## Known Bugs

-   I could not find a way to properly drop steam api client and stopping the game from steam application (even when game is not actually open) causes this application to close and also if game is running and you close the application unexpected things can occur but i have not found any particular problem with this yet.

## Planned Improvements

*There are some advanced features under consideration; however, since I don't currently have a need for them myself, I’d only look into adding them if there's sufficient interest or feedback from users.*

This mod manager "should" support wider range of Total War titles but i don't have them so if you want those games to be supported you can ask to be a tester for it.

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

> You need Steam API SDK files. steamworks-rs dynamically loads without any manual setup while in development mode but for bundling you would want to put those files in ./src-tauri. There is also schema files thats used to decode .pack file's database data which can be found in [rpfm-schemas](https://github.com/Frodo45127/rpfm-schemas).

```sh
bun tauri build
```

## License

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🧾 Credits

This project uses third-party libraries and resources, which are greatly appreciated:

-   [steamworks.js](https://github.com/ceifa/steamworks.js)  
    Licensed under the MIT License.

-   Schema files from [rpfm-schemas](https://github.com/Frodo45127/rpfm-schemas)  
    Licensed under the MIT License.

Special thanks to Frodo45127 for creating [RPFM](https://github.com/Frodo45127/rpfm) — one of the key inspirations and tools behind this project.
