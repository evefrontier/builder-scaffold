import type { WorldConfig } from '@evefrontier/world-sdk'
import type { State } from 'frontier-trade-scripts/context'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { type OwnedAssembly, parseItem } from 'frontier-trade-scripts/world'

/** Built by vite.config.ts from the same files the scripts read. */
export interface AppConfig {
  network: 'localnet' | 'testnet'
  rpcUrl: string
  world: WorldConfig
  post: OwnedAssembly
  /** Inventory component ID on players' ships. */
  shipInventory: string
  items: { ore: RawItem; parts: RawItem }
  seller: string
  state: State
  testAccounts: { name: string; key: string }[]
}

type RawItem = { tenant: string; typeId: string; variantId: string }

declare const __APP_CONFIG__: AppConfig

const raw = __APP_CONFIG__
export const config = {
  ...raw,
  post: { ...raw.post, inventory: BigInt(raw.post.inventory) },
  shipInventory: BigInt(raw.shipInventory),
  items: { ore: parseItem(raw.items.ore), parts: parseItem(raw.items.parts) },
}

/**
 * Reads and builds use this client. On localnet it maps the @evefrontier MVR
 * names the world SDK uses to the local package IDs; on testnet it asks the
 * MVR registry.
 */
export const client = new SuiGrpcClient({
  network: config.network,
  baseUrl: config.rpcUrl,
  mvr:
    config.network === 'localnet'
      ? {
          overrides: {
            packages: Object.fromEntries(
              Object.entries(config.world.packageOverrides ?? {}).map(([pkg, id]) => [
                pkg === 'currency' ? '@evefrontier/currency' : `@evefrontier/world-${pkg.replace(/_/g, '-')}`,
                id,
              ]),
            ),
          },
        }
      : { url: 'https://testnet.mvr.mystenlabs.com' },
})
