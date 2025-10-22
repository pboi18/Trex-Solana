Full Devnet T-Rex Wager Bundle (Playable Frontend)
Files included:
- authority.json (devnet test keypair) -- KEEP PRIVATE
- program/ (Anchor program scaffold with idl.json)
- server/ (Node.js server wired to call Anchor program)
- index.html, app.js, style.css (playable frontend)

How to run (devnet):
1. Install Solana & Anchor.
2. cd program && anchor build && anchor deploy --provider.cluster devnet
3. Update PROGRAM_ID in server/index.js and in app.js (replace DevnetExample... with deployed program id)
4. cd server && npm install && node index.js
5. Serve frontend: npx http-server .
6. Open frontend in browser (Phantom set to Devnet). Lock wager, sign tx, play, and test settlement.
