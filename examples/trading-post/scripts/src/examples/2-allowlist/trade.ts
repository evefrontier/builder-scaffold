/**
 * Example 2, buyer: barter as a character on the allowlist.
 *
 * Then checks that a player who is not on the list (PLAYER_C, also docked
 * with ore in their ship) can't use the action.
 */
import { loadContext, requireTradePackage } from '../../lib/context.js'
import { ensureShipReady, expectTradeAborts, tradeAndCheck } from '../../lib/steps.js'
import { ALLOWLIST } from '../rules.js'

const ctx = loadContext()
requireTradePackage(ctx)
const rules = ALLOWLIST.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state })

await tradeAndCheck(ctx, ALLOWLIST, rules)

if (ctx.outsider && ctx.outsiderShip) {
  await ensureShipReady(ctx, ctx.outsider, ctx.outsiderShip)
  await expectTradeAborts(
    ctx,
    ALLOWLIST,
    rules,
    /ENotOnAllowlist/,
    'a character who is not on the allowlist is refused',
    ctx.outsider,
    ctx.outsiderShip,
  )
}
