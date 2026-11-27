import react from '@vitejs/plugin-react'
import { loadContext, localAccount } from 'frontier-trade-scripts/context'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { AppConfig } from './src/config'

/**
 * The dApp reads the same configuration as the scripts: the world manifest,
 * the trading post, the item types, and the published trade package. It is
 * read when the dev server starts, so restart it after `pnpm publish:trade`
 * or `pnpm 2:setup`.
 */
function appConfig(): AppConfig {
  const ctx = loadContext()
  return {
    network: ctx.network,
    rpcUrl: ctx.network === 'localnet' ? 'http://127.0.0.1:9000' : 'https://fullnode.testnet.sui.io:443',
    world: ctx.world,
    post: ctx.post,
    shipInventory: ctx.buyerShip.inventory.toString(),
    items: JSON.parse(JSON.stringify(ctx.items, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))),
    seller: ctx.seller.toSuiAddress(),
    state: ctx.state,
    // Localnet only: the public test keys, so the dApp can be tried without a
    // wallet. Never ship real keys to a browser.
    testAccounts:
      ctx.network === 'localnet'
        ? [
            { name: 'PLAYER_B (on the allowlist)', key: localAccount('PLAYER_B').getSecretKey() },
            { name: 'PLAYER_C (not on the allowlist)', key: localAccount('PLAYER_C').getSecretKey() },
          ]
        : [],
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_CONFIG__: JSON.stringify(appConfig(), (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  },
  resolve: {
    // One copy of the Sui SDK for the dApp and the shared trade code.
    dedupe: ['@mysten/sui'],
    // The world SDK's file-reading helpers import Node modules; see src/node-stubs.ts.
    alias: Object.fromEntries(
      ['node:fs', 'node:path', 'node:url'].map((m) => [
        m,
        fileURLToPath(new URL('./src/node-stubs.ts', import.meta.url)),
      ]),
    ),
  },
})
