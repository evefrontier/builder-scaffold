/**
 * Example 4, buyer: buy 1 part for 20 EVE.
 *
 * Then checks that paying 19 EVE aborts.
 */
import { EVE } from '../../lib/world.js'
import { loadContext, requireTradePackage } from '../../lib/context.js'
import { expectTradeAborts, tradeAndCheck } from '../../lib/steps.js'
import { SHOP } from '../rules.js'

const ctx = loadContext()
requireTradePackage(ctx)
const rules = SHOP.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state })

await tradeAndCheck(ctx, SHOP, rules)
await expectTradeAborts(
  ctx,
  SHOP,
  { ...rules, payment: 19n * EVE },
  /EWrongAmount/,
  'paying 19 EVE instead of 20 is refused',
)
