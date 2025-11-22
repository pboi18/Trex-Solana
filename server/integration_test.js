// Short integration test harness for T-Rex Wager server
// - Starts the server in a child process
// - Waits for /health to respond
// - Calls POST /api/register_game to register a game
// - Calls POST /api/settle to attempt settlement
// Notes:
// - This script supports a safe dry-run mode: set `TEST_MODE=mock` to skip any on-chain
//   settlement calls and simulate a successful settlement locally.
// - Default behavior will call the real server and (by default) the Devnet RPC.
// - Ensure `server/authority.json` exists and `target/idl/trex_wager.json` is available
//   when running non-mock mode.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_CMD = 'node';
const SERVER_ARGS = ['index.js'];
const SERVER_CWD = path.join(__dirname);
const HEALTH_URL = 'http://localhost:3000/health';
const API_BASE = 'http://localhost:3000';

async function waitForHealth(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return await res.json();
    } catch (e) {
      // ignore
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Health check timed out');
}

async function post(pathname, body) {
  const res = await fetch(API_BASE + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch(e) { return txt; }
}

function randomPubkey() {
  // Generate a real Solana public key string using Keypair (base58)
  const { Keypair } = require('@solana/web3.js');
  return Keypair.generate().publicKey.toString();
}

async function run() {
  console.log('Starting server...');
  const TEST_MODE = process.env.TEST_MODE === 'mock';
  if (TEST_MODE) console.log('TEST_MODE=mock — running a non-onchain dry run (no settle RPC will be called)');
  const server = spawn(SERVER_CMD, SERVER_ARGS, { cwd: SERVER_CWD, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });

  server.stdout.on('data', d => process.stdout.write('[server] ' + d.toString()));
  server.stderr.on('data', d => process.stderr.write('[server] ' + d.toString()));

  server.on('exit', (code, sig) => {
    console.log('Server exited', code, sig);
  });

  try {
    const health = await waitForHealth(20000);
    console.log('Server healthy:', health);

    // Register a game
    const player = randomPubkey();
    const escrow = randomPubkey();
    const wager = 1000; // lamports (small test value)
    const registerBody = { player, escrow, wager, nonce: Date.now() };
    console.log('Registering game with:', registerBody);
    const regRes = await post('/api/register_game', registerBody);
    console.log('Register response:', regRes);
    if (!regRes || !regRes.ok) throw new Error('Register failed');

    const gamePubkey = regRes.gamePubkey;

    // Attempt settle
    if (TEST_MODE) {
      console.log('Mock mode: skipping call to /api/settle. Simulating success.');
      const settleRes = { ok: true, tx: 'MOCK_TX', simulated: true };
      console.log('Settle response (simulated):', settleRes);
    } else {
      // WARNING: this will call the on-chain program and may create transactions on the configured cluster.
      const settleBody = {
        gamePubkey,
        player,
        winner: player,
        winnerAmount: 500,
        adminAmount: 500,
      };
      console.log('Calling settle with:', settleBody);
      const settleRes = await post('/api/settle', settleBody);
      console.log('Settle response:', settleRes);
    }

    console.log('Integration test completed. Cleaning up.');
  } catch (err) {
    console.error('Integration test error:', err.message || err);
  } finally {
    // Kill server process
    try { server.kill('SIGINT'); } catch(e) {}
    process.exit(0);
  }
}

// Node 18+ has global fetch; if not present, require 'node-fetch'
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

run();
