# TW Mod Organizer

#### _Mod manager tool for Total War: Warhammer 2 & 3 & Total War: Three Kingdoms_

Requires Windows 10, Steam, 7z (for local mod installation).

![App image](https://imgur.com/a/rM3e5qg)

## Features

-   Mod profiles
-   Re-ordering mods with a simple drag and drop
-   Viewing mod conflicts
-	Separators to group your mods
-   Installing manual mods within app with profile in mind. This ensures you do not have to extract mod files into to the game installation and possibly over complicating folder structure for further management
-   Nexus Mods integration - downloading directly with deep links
-   Simple UI

## Known Bugs

- I could not find a way to properly drop steam api client and stopping the game from steam application (even when game is not actually open) causes this application to close and also if game is running and you close the application unexpected things can occur but i have not found any particular problem with this yet.

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

MIT

## Credits

This project includes code from [steamworks.js](https://github.com/ceifa/steamworks.js), licensed under the MIT License.
