// Devnet-ready server that registers games and calls the Anchor program to settle payouts.
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { AnchorProvider, Program, web3, BN, setProvider } = require('@coral-xyz/anchor');
const { Keypair, PublicKey, Connection, SystemProgram } = require('@solana/web3.js');

const PORT = process.env.PORT || 3000;
const NETWORK = process.env.SOLANA_CLUSTER || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || '6hSxQA2kW3meffPhw3jGLixfyCki3X3HGv9mPT92VLBY');
const AUTHORITY_KEYPAIR_PATH = process.env.AUTHORITY_KEYPAIR || './authority.json';

// Check for authority keypair
if (!fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
  console.error('Authority keypair not found at', AUTHORITY_KEYPAIR_PATH);
  console.error('Create one with: solana-keygen new --outfile ./server/authority.json');
  process.exit(1);
}

const authorityKey = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH)))
);

const connection = new Connection(NETWORK, 'confirmed');

// Create a simple wallet implementation
class NodeWallet {
  constructor(payer) {
    this.payer = payer;
  }
  
  async signTransaction(tx) {
    tx.partialSign(this.payer);
    return tx;
  }
  
  async signAllTransactions(txs) {
    return txs.map(tx => {
      tx.partialSign(this.payer);
      return tx;
    });
  }
  
  get publicKey() {
    return this.payer.publicKey;
  }
}

const wallet = new NodeWallet(authorityKey);
const provider = new AnchorProvider(connection, wallet, { 
  preflightCommitment: 'confirmed' 
});
setProvider(provider);

// Load IDL from correct path
const idlPath = '../target/idl/trex_wager.json';
if (!fs.existsSync(idlPath)) {
  console.error('IDL not found at', idlPath);
  console.error('Make sure you have run: anchor build');
  process.exit(1);
}

let idl;
try {
  const idlContent = fs.readFileSync(idlPath, 'utf8');
  idl = JSON.parse(idlContent);
  console.log('✓ IDL loaded successfully');
  console.log('  Name:', idl.name);
  console.log('  Version:', idl.version || 'N/A');
} catch (err) {
  console.error('✗ Error loading IDL:', err.message);
  process.exit(1);
}

let program;
try {
  // The IDL uses the new format, so we pass it directly
  program = new Program(idl, provider);
  console.log('✓ Program initialized successfully');
  console.log('  Program ID from IDL:', program.programId.toString());
} catch (err) {
  console.error('✗ Error initializing program:', err.message);
  console.error('  Stack:', err.stack);
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function loadGames() {
  try { 
    return JSON.parse(fs.readFileSync('./games.json')); 
  } catch(e) { 
    return []; 
  }
}

function saveGames(games) { 
  fs.writeFileSync('./games.json', JSON.stringify(games, null, 2)); 
}

// Register a new game
app.post('/api/register_game', async (req, res) => {
  try {
    const { player, escrow, wager, cluster, adminWallet, nonce } = req.body;
    
    if (!player || !escrow || !wager) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: player, escrow, wager' 
      });
    }

    const games = loadGames();
    const id = games.length + 1;
    
    // Derive game PDA
    const useNonce = nonce || Date.now();
    const [gamePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('game'),
        new PublicKey(player).toBuffer(),
        new BN(useNonce).toArrayLike(Buffer, 'le', 8)
      ],
      new PublicKey(program.programId)
    );

    const record = { 
      id, 
      player, 
      escrow, 
      wager, 
      cluster, 
      adminWallet, 
      nonce: useNonce,
      gameAccount: gamePDA.toString(),
      createdAt: Date.now() 
    };
    
    games.push(record);
    saveGames(games);
    
    console.log('Registered game #' + id + ':', gamePDA.toString());
    
    return res.json({ 
      ok: true, 
      gamePubkey: gamePDA.toString(),
      gameId: id 
    });
  } catch (err) {
    console.error('Error registering game:', err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
});

// Settle a game and distribute funds
app.post('/api/settle', async (req, res) => {
  try {
    const { gamePubkey, player, winner, winnerAmount, adminAmount } = req.body;
    
    if (!gamePubkey || !winner || winnerAmount === undefined || adminAmount === undefined) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields' 
      });
    }

    const games = loadGames();
    const rec = games.find(g => g.gameAccount === gamePubkey);
    
    if (!rec) {
      return res.status(400).json({ ok: false, error: 'Game not found' });
    }

    const escrowPubkey = new PublicKey(rec.escrow);
    const winnerPubkey = new PublicKey(winner);
    const adminPubkey = new PublicKey(
      rec.adminWallet || authorityKey.publicKey.toString()
    );
    const gamePDA = new PublicKey(gamePubkey);

    console.log('Settling game:', {
      game: gamePDA.toString(),
      escrow: escrowPubkey.toString(),
      winner: winnerPubkey.toString(),
      admin: adminPubkey.toString(),
      authority: authorityKey.publicKey.toString(),
      winnerAmount,
      adminAmount
    });

    // Call the settle_game instruction
    const tx = await program.methods
      .settleGame(
        new BN(winnerAmount),
        new BN(adminAmount)
      )
      .accounts({
        game: gamePDA,
        escrow: escrowPubkey,
        winner: winnerPubkey,
        admin: adminPubkey,
        authority: authorityKey.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorityKey])
      .rpc();

    console.log('Settlement transaction:', tx);
    
    // Mark game as settled
    rec.settled = true;
    rec.settlementTx = tx;
    rec.settledAt = Date.now();
    saveGames(games);

    return res.json({ ok: true, tx });
  } catch (err) {
    console.error('Error settling game:', err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
});

// Get game info
app.get('/api/game/:id', (req, res) => {
  const games = loadGames();
  const game = games.find(g => g.id === parseInt(req.params.id));
  if (!game) return res.status(404).json({ ok: false, error: 'Not found' });
  return res.json({ ok: true, game });
});

// List all games
app.get('/api/games', (req, res) => {
  const games = loadGames();
  return res.json({ ok: true, games });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    network: NETWORK, 
    programId: program.programId.toString(),
    authority: authorityKey.publicKey.toString()
  });
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log('T-Rex Wager Server Started');
  console.log('=================================');
  console.log('Port:', PORT);
  console.log('Network:', NETWORK);
  console.log('Program ID:', program.programId.toString());
  console.log('Authority:', authorityKey.publicKey.toString());
  console.log('=================================');
});