# Square Proof Player

This app is a Vite-based video player with:

- `Play`
- `Stop`
- a draggable scrubber thumb for frame seeking
- responsive resizing with the window
- an `Open Video` button for local files such as `mp4`, `webm`, `ogg`, `mov`, and `m4v`

## Prerequisites

- Node.js `24.15.0` LTS or newer
- npm `11` or newer

Check your versions:

```powershell
node -v
npm -v
```

If Node is older than `24.15.0`, install the current Node.js LTS release from https://nodejs.org/. If you cannot change the system Node installation yet, this project also includes a Windows bootstrapper that downloads a project-local Node `24.15.0` runtime into `.tools/`.

## Exact Steps To Start The App

1. Open PowerShell.
2. Go to the project folder:

```powershell
cd player
```

3. Install dependencies:

```powershell
npm install
```

If your system Node is still older than `24.15.0`, use the project-local Node bootstrapper for install instead:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\node24.ps1 install
```

4. Generate the bundled demo videos:

```powershell
npm run generate:videos
```

5. Start the development server:

```powershell
npm run dev
```

The `npm run dev`, `npm run build`, and `npm test` commands automatically run through the project-local Node `24.15.0` bootstrapper on Windows, so they work even if `node -v` still reports an older system Node.

6. Open this URL in your browser:

```text
http://127.0.0.1:4173
```

7. Keep the terminal open while the app is running.

8. To stop the app, return to the terminal and press:

```text
Ctrl+C
```

## If Port 4173 Is Already In Use

The app is configured with `strictPort`, so it will not automatically switch ports.
If startup fails because port `4173` is busy, stop the other process using that port and run:

```powershell
npm run dev
```

## Optional Verification

Run the full test suite:

```powershell
npm test
```

Build the production bundle:

```powershell
npm run build
```
