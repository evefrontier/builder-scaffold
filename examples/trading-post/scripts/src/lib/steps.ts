/**
 * The steps every example repeats: enable an action as the seller, trade as
 * the buyer, and compare balances before and after.
 */
import type { Signer } from '@mysten/sui/cryptography'
import type { Example } from '../examples/rules.js'
import { type Context, check, execute, report, simulateFailure } from './context.js'
import {
  buildTrade,
  enableTradeAction,
  EVE,
  eveBalance,
  itemBalances,
  type OwnedAssembly,
  prepareShip,
  type TradeRules,
} from './world.js'

/** Item and EVE balances on both sides of a trade. */
export interface Snapshot {
  postOre: bigint
  postParts: bigint
  shipOre: bigint
  shipParts: bigint
  sellerEve: bigint
  buyerEve: bigint
}

export async function snapshot(
  ctx: Context,
  buyer: Signer = ctx.buyer,
  ship: OwnedAssembly = ctx.buyerShip,
): Promise<Snapshot> {
  const types = [ctx.items.ore, ctx.items.parts]
  const sender = buyer.toSuiAddress()
  const [[postOre, postParts], [shipOre, shipParts], sellerEve, buyerEve] = await Promise.all([
    itemBalances(ctx.client, ctx.world, sender, ctx.post.entity, ctx.post.inventory, types),
    itemBalances(ctx.client, ctx.world, sender, ship.entity, ship.inventory, types),
    eveBalance(ctx.client, ctx.world, ctx.seller.toSuiAddress()),
    eveBalance(ctx.client, ctx.world, sender),
  ])
  return { postOre, postParts, shipOre, shipParts, sellerEve, buyerEve }
}

function eve(amount: bigint): string {
  return `${amount / EVE}.${(amount % EVE).toString().padStart(9, '0').replace(/0+$/, '') || '0'} EVE`
}

export function printSnapshot(title: string, s: Snapshot): void {
  report(title, {
    'trading post ore': s.postOre,
    'trading post parts': s.postParts,
    'buyer ship ore': s.shipOre,
    'buyer ship parts': s.shipParts,
    'seller EVE': eve(s.sellerEve),
    'buyer EVE': eve(s.buyerEve),
  })
}

/** Seller: enable (or replace) the example's action on the trading post. */
export async function enableExample(
  ctx: Context,
  example: Example,
  rules: TradeRules,
): Promise<void> {
  const tx = await enableTradeAction(
    ctx.client,
    ctx.world,
    ctx.seller.toSuiAddress(),
    ctx.post,
    ctx.state.tradePackage ?? '',
    example.action,
    rules,
  )
  const { digest } = await execute(ctx, tx, ctx.seller)
  report(`Enabled "${example.action}" on the trading post`, {
    rules: describe(rules),
    transaction: digest,
  })
}

export function describe(rules: TradeRules): string {
  const parts: string[] = []
  if (rules.allowlist) parts.push('caller on allowlist')
  if (rules.payment !== undefined) parts.push(`pay ${eve(rules.payment)}`)
  if (rules.give) parts.push(`deposit ${rules.give.quantity} x type ${rules.give.key.typeId}`)
  parts.push(`withdraw ${rules.receive.quantity} x type ${rules.receive.key.typeId}`)
  return parts.join(', then ')
}

/** Buyer: enable the ship's cargo actions once, if they are missing. */
export async function ensureShipReady(
  ctx: Context,
  buyer: Signer = ctx.buyer,
  ship: OwnedAssembly = ctx.buyerShip,
): Promise<void> {
  const tx = await prepareShip(ctx.client, ctx.world, buyer.toSuiAddress(), ship)
  if (!tx) return
  await execute(ctx, tx, buyer)
  console.log('enabled ship_withdraw and ship_deposit on the ship')
}

/** Buyer: run the trade and check that balances moved exactly as the rules say. */
export async function tradeAndCheck(
  ctx: Context,
  example: Example,
  rules: TradeRules,
): Promise<void> {
  await ensureShipReady(ctx)
  const before = await snapshot(ctx)
  printSnapshot('Before', before)

  const tx = await buildTrade(ctx.client, ctx.world, ctx.buyer.toSuiAddress(), {
    tradePackage: ctx.state.tradePackage ?? '',
    post: ctx.post.entity,
    action: example.action,
    rules,
    ship: ctx.buyerShip,
  })
  const { digest } = await execute(ctx, tx, ctx.buyer)
  console.log(`\nTraded with "${example.action}": ${digest}`)

  const after = await snapshot(ctx)
  printSnapshot('After', after)

  console.log('\nChecks')
  const gave = rules.give?.quantity ?? 0n
  const got = rules.receive.quantity
  const paid = rules.payment ?? 0n
  check(after.shipOre === before.shipOre - gave, `the ship gave ${gave} ore`)
  check(after.postOre === before.postOre + gave, `the trading post received ${gave} ore`)
  check(after.shipParts === before.shipParts + got, `the ship received ${got} parts`)
  check(after.postParts === before.postParts - got, `the trading post gave ${got} parts`)
  check(after.sellerEve === before.sellerEve + paid, `the seller received ${eve(paid)}`)
  // The buyer also pays gas in SUI, not EVE, so EVE changes by the price only.
  check(after.buyerEve === before.buyerEve - paid, `the buyer paid ${eve(paid)}`)
}

/** Simulate a trade that must abort, and check the abort message. Nothing is sent. */
export async function expectTradeAborts(
  ctx: Context,
  example: Example,
  rules: TradeRules,
  expected: RegExp,
  why: string,
  buyer: Signer = ctx.buyer,
  ship: OwnedAssembly = ctx.buyerShip,
): Promise<void> {
  const tx = await buildTrade(ctx.client, ctx.world, buyer.toSuiAddress(), {
    tradePackage: ctx.state.tradePackage ?? '',
    post: ctx.post.entity,
    action: example.action,
    rules,
    ship,
  })
  const failure = await simulateFailure(ctx, tx, buyer.toSuiAddress())
  check(failure !== undefined && expected.test(failure), `${why} (aborts: ${shorten(failure)})`)
}

function shorten(message: string | undefined): string {
  if (!message) return 'it did not abort'
  // "MoveAbort in 8th command, 'ENotOnAllowlist': The character ..., in '0x...'"
  return message.replace(/^MoveAbort in \d+\w+ command, /, '').replace(/, in '.*$/, '')
}
