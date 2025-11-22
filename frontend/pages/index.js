import { useEffect, useState } from 'react'

const SERVER_BASE = process.env.NEXT_PUBLIC_SERVER_BASE || 'http://localhost:3000'
const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || ''

export default function Home() {
  const [pubkey, setPubkey] = useState('Not connected')
  const [walletKey, setWalletKey] = useState(null)
  const [registerResult, setRegisterResult] = useState('')
  const [gamesList, setGamesList] = useState('')
  const [settleResult, setSettleResult] = useState('')

  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      window.solana.on('connect', () => setPubkey(window.solana.publicKey.toString()))
      window.solana.on('disconnect', () => setPubkey('Not connected'))
    }
  }, [])

  async function connect() {
    if (window.solana && window.solana.isPhantom) {
      try {
        const resp = await window.solana.connect()
        setPubkey(resp.publicKey.toString())
        setWalletKey(resp.publicKey.toString())
      } catch (e) {
        setPubkey('Connection rejected')
      }
    } else {
      setPubkey('Phantom not found — use manual pubkeys')
    }
  }

  async function registerGame(e) {
    e && e.preventDefault()
    const player = walletKey || document.getElementById('playerIn').value
    const escrow = document.getElementById('escrowIn').value || player
    const wager = Number(document.getElementById('wagerIn').value || '0')
    const nonce = document.getElementById('nonceIn').value || undefined
    const body = { player, escrow, wager }
    if (nonce) body.nonce = Number(nonce)

    const res = await fetch(SERVER_BASE + '/api/register_game', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    })
    const txt = await res.text()
    try { setRegisterResult(JSON.stringify(JSON.parse(txt), null, 2)) } catch(e) { setRegisterResult(txt) }
  }

  async function listGames() {
    const res = await fetch(SERVER_BASE + '/api/games')
    const json = await res.json()
    setGamesList(JSON.stringify(json, null, 2))
  }

  async function settleGame(e) {
    e && e.preventDefault()
    const gamePubkey = document.getElementById('gameIn').value
    const winner = document.getElementById('winnerIn').value || walletKey
    const winnerAmount = Number(document.getElementById('winnerAmtIn').value || '0')
    const adminAmount = Number(document.getElementById('adminAmtIn').value || '0')
    const body = { gamePubkey, player: walletKey || '', winner, winnerAmount, adminAmount }

    const res = await fetch(SERVER_BASE + '/api/settle', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    })
    const txt = await res.text()
    try { setSettleResult(JSON.stringify(JSON.parse(txt), null, 2)) } catch(e) { setSettleResult(txt) }
  }

  return (
    <main className="container">
      <h1>T‑Rex Wager — Next.js Demo</h1>
      <div className="wallet">
        <button onClick={connect}>Connect Wallet (Phantom)</button>
        <div className="pubkey">{pubkey}</div>
      </div>

      <section className="card">
        <h2>Register Game</h2>
        <label>Player pubkey (if not using Phantom)</label>
        <input id="playerIn" placeholder="player pubkey" />
        <label>Escrow pubkey (or leave blank to use wallet)</label>
        <input id="escrowIn" placeholder="escrow pubkey" />
        <label>Wager (lamports)</label>
        <input id="wagerIn" defaultValue="1000" />
        <label>Nonce (optional)</label>
        <input id="nonceIn" placeholder="nonce" />
        <div className="actions">
          <button onClick={registerGame}>Register Game</button>
        </div>
        <pre>{registerResult}</pre>
      </section>

      <section className="card">
        <h2>List Games</h2>
        <button onClick={listGames}>List Games</button>
        <pre>{gamesList}</pre>
      </section>

      <section className="card">
        <h2>Settle Game</h2>
        <label>Game PDA</label>
        <input id="gameIn" placeholder="game PDA" />
        <label>Winner pubkey</label>
        <input id="winnerIn" placeholder="winner pubkey" />
        <label>Winner Amount</label>
        <input id="winnerAmtIn" defaultValue="500" />
        <label>Admin Amount</label>
        <input id="adminAmtIn" defaultValue="500" />
        <div className="actions">
          <button onClick={settleGame}>Settle</button>
        </div>
        <pre>{settleResult}</pre>
      </section>

      <div className="footer">Server: {SERVER_BASE} {PROGRAM_ID ? `• Program: ${PROGRAM_ID}` : ''}</div>
    </main>
  )
}
