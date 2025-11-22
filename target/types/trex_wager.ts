/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/trex_wager.json`.
 */
export type TrexWager = {
  "address": "6hSxQA2kW3meffPhw3jGLixfyCki3X3HGv9mPT92VLBY",
  "metadata": {
    "name": "trexWager",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "cancelGame",
      "discriminator": [
        121,
        194,
        154,
        118,
        103,
        235,
        149,
        52
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "relations": [
            "game"
          ]
        },
        {
          "name": "player",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeGame",
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "nonce",
          "type": "u8"
        },
        {
          "name": "wagerLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleGame",
      "discriminator": [
        96,
        54,
        24,
        189,
        239,
        198,
        86,
        29
      ],
      "accounts": [
        {
          "name": "game",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "relations": [
            "game"
          ]
        },
        {
          "name": "winner",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "winnerAmount",
          "type": "u64"
        },
        {
          "name": "adminAmount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "gameState",
      "discriminator": [
        144,
        94,
        208,
        172,
        248,
        99,
        134,
        120
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadySettled",
      "msg": "Game already settled"
    },
    {
      "code": 6001,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6002,
      "name": "insufficientEscrow",
      "msg": "Insufficient escrow"
    }
  ],
  "types": [
    {
      "name": "gameState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "wager",
            "type": "u64"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "nonce",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
