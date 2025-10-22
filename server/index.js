// Devnet-ready server that registers games and calls the Anchor program to settle payouts.
// Uses the provided authority.json (devnet test keypair) to sign transactions.

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const anchor = require('@project-serum/anchor');
const { Keypair, PublicKey, Connection } = anchor.web3;

const PORT = process.env.PORT || 3000;
const NETWORK = process.env.SOLANA_CLUSTER || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'DevnetExample1111111111111111111111111111111111');
const AUTHORITY_KEYPAIR_PATH = process.env.AUTHORITY_KEYPAIR || './authority.json';

if (!fs.existsSync(AUTHORITY_KEYPAIR_PATH)) {
  console.error('Authority keypair not found at', AUTHORITY_KEYPAIR_PATH);
  console.error('Create one with: solana-keygen new --outfile authority.json');
  process.exit(1);
}

const authorityKey = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(AUTHORITY_KEYPAIR_PATH))));
const connection = new Connection(NETWORK, 'confirmed');
const wallet = new anchor.Wallet(authorityKey);
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
anchor.setProvider(provider);

const idl = JSON.parse(fs.readFileSync('../program/idl.json'));
const program = new anchor.Program(idl, PROGRAM_ID, provider);

const app = express();
app.use(bodyParser.json());

function loadGames() {
  try { return JSON.parse(fs.readFileSync('./games.json')); } catch(e) { return []; }
}
function saveGames(games) { fs.writeFileSync('./games.json', JSON.stringify(games, null, 2)); }

app.post('/api/register_game', async (req, res) => {
  try {
    const { player, escrow, wager, cluster, adminWallet, nonce } = req.body;
    const games = loadGames();
    const id = games.length + 1;
    const record = { id, player, escrow, wager, cluster, adminWallet, nonce, createdAt: Date.now() };
    games.push(record);
    saveGames(games);
    return res.json({ ok: true, gamePubkey: 'game_' + id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error: err.toString() });
  }
});

app.post('/api/settle', async (req, res) => {
  try {
    const { gamePubkey, player, winner, winnerAmount, adminAmount } = req.body;
    const games = loadGames();
    const rec = games.find(g => ('game_' + g.id) === gamePubkey);
    if (!rec) return res.status(400).json({ ok:false, error: 'game not found' });

    const escrowPubkey = new PublicKey(rec.escrow);
    const winnerPubkey = new PublicKey(winner);
    const adminPubkey = new PublicKey(rec.adminWallet || 'bNAVCT7agwQPPwaMBDThUryzr39a5x2MhjhS69iqGWD');

    const tx = await program.rpc.settleGame(new anchor.BN(winnerAmount), new anchor.BN(adminAmount), {
      accounts: {
        game: new PublicKey(rec.gameAccount || anchor.web3.SystemProgram.programId),
        escrow: escrowPubkey,
        winner: winnerPubkey,
        admin: adminPubkey,
        authority: authorityKey.publicKey,
      },
      signers: [authorityKey]
    });

    console.log('settle tx', tx);
    return res.json({ ok:true, tx });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, error: err.toString() });
  }
});

app.listen(PORT, () => console.log('Server running on port', PORT, 'network', NETWORK));