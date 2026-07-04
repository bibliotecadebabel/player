# Square Screen Recorder

Windows Electron app for selecting a rectangular bounding box anywhere on the screen and recording that region to an `.mp4` until you stop the recording.

## Prerequisites

- Windows
- PowerShell
- Internet access for the first setup run

The app bootstraps its own portable Node.js runtime and bundled ffmpeg binary under `.runtime` and `node_modules`. Do not rely on each Windows user's global `node`, `npm`, or `ffmpeg` PATH.

## Start The App

1. Open PowerShell.
2. Change into the project folder:

```powershell
cd screeh
```

3. Run the reproducible shared setup:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

4. Start the app with the project runtime:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

For later launches, repeat only step 4. Running `npm install` or `npm start` directly is not recommended because it uses the current user's global Node.js and PATH instead of the project runtime.

## Validate The App

Run the full audit and test suite with the same project runtime:

```powershell
powershell -ExecutionPolicy Bypass -File .\validate.ps1
```

## Use The App

1. Click `Record`.
2. The main app window hides and a full-screen transparent selection overlay appears.
3. Press and hold the mouse anywhere on the screen, then drag to define the initial bounding box.
4. Resize the box by dragging its edges or corners.
5. Click `Start Recording` in the overlay.
6. Click the floating `Stop Recording` button to finish.
7. The main app window returns after recording stops.
8. Recordings are saved as `.mp4` files under `output\recordings\`, and test proof artifacts are written under `output\test-results\`.
