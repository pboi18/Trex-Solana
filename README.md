Full Devnet T‑Rex Wager (Next.js frontend)

Files included:
- `authority.json` (devnet test keypair) — KEEP PRIVATE
- `programs/` (Anchor program code and `idl.json`)
- `server/` (Node.js server wired to call the Anchor program)
- `frontend/` (Next.js app that calls the server; preferred frontend)

Quick Devnet run (recommended)
1. Install Solana & Anchor per Anchor docs.
2. Build & (optionally) deploy the program:

```bash
cd programs/trex_wager
anchor build
# anchor deploy --provider.cluster devnet  # deploy if you want to test on Devnet
```

3. Start the server (set `PROGRAM_ID` if you deployed a program):

```bash
cd server
npm install
PROGRAM_ID=<deployed_program_id> AUTHORITY_KEYPAIR=./server/authority.json npm start
```

4. Start the Next.js frontend (preferred):

```bash
cd frontend
npm install
NEXT_PUBLIC_SERVER_BASE=http://localhost:3000 NEXT_PUBLIC_PROGRAM_ID=<deployed_program_id> npm run dev
# Open http://localhost:3001 in the browser (Phantom for wallet flows)
```

Notes:
- The server expects `target/idl/trex_wager.json` to exist (run `anchor build` to generate it).
- `server/authority.json` must exist; it contains a devnet keypair. Do not commit real keys.
- Use `server/integration_test.js` in mock mode (`npm run integration:mock`) for a safe dry-run.
