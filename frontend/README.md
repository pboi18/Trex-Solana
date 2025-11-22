# T-Rex Wager Frontend (Next.js)

This Next.js app is a minimal frontend that talks to the backend server (`server/index.js`) to register and settle games.

Quick start (from repo root):

```bash
cd frontend
npm install
# dev server (runs on port 3001 to avoid colliding with backend port 3000)
npm run dev
```

Environment variables:
- `NEXT_PUBLIC_SERVER_BASE` — backend base URL (defaults to `http://localhost:3000`).
- `NEXT_PUBLIC_PROGRAM_ID` — optional program id string to display in the UI.

Notes:
- The frontend does not perform on-chain actions directly — it calls the server which uses Anchor to interact with the program.
- For wallet integration, install Phantom and open the page in the browser where Phantom is available.
