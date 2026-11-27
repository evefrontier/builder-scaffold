/**
 * The four trade actions the examples enable on the trading post. The setup
 * scripts, the trade scripts, and the dApp all read them from here.
 */
import type { Items, State } from '../lib/context.js'
import { EVE, type TradeRules } from '../lib/world.js'

export interface Example {
  /** Owner action name on the trading post. Prefixed so it can't clash with the game's actions. */
  action: string
  title: string
  rules: (args: RuleArgs) => TradeRules
}

export interface RuleArgs {
  items: Items
  inventory: bigint
  /** The seller's wallet address, which receives payments. */
  seller: string
  state: State
}

const ORE_FOR_PARTS = ({ items }: RuleArgs) => ({
  give: { key: items.ore, quantity: 10n },
  receive: { key: items.parts, quantity: 1n },
})

export const BARTER: Example = {
  action: 'example_barter',
  title: '1. Barter: 10 ore for 1 part',
  rules: (a) => ({ inventory: a.inventory, ...ORE_FOR_PARTS(a) }),
}

export const ALLOWLIST: Example = {
  action: 'example_allowlist',
  title: '2. Barter for allowlisted characters only',
  rules: (a) => {
    if (!a.state.allowlist) throw new Error('No allowlist yet. Run: pnpm 2:setup')
    return { inventory: a.inventory, allowlist: a.state.allowlist, ...ORE_FOR_PARTS(a) }
  },
}

export const FEE: Example = {
  action: 'example_fee',
  title: '3. Barter with a 5 EVE fee',
  rules: (a) => ({
    inventory: a.inventory,
    payment: 5n * EVE,
    paymentRecipient: a.seller,
    ...ORE_FOR_PARTS(a),
  }),
}

export const SHOP: Example = {
  action: 'example_shop',
  title: '4. Shop: 1 part for 20 EVE',
  rules: (a) => ({
    inventory: a.inventory,
    payment: 20n * EVE,
    paymentRecipient: a.seller,
    receive: { key: a.items.parts, quantity: 1n },
  }),
}

export const EXAMPLES = [BARTER, ALLOWLIST, FEE, SHOP]
