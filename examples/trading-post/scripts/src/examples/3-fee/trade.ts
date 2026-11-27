/**
 * Example 3, buyer: barter and pay the 5 EVE fee in the same transaction.
 *
 * Then checks that paying 4 EVE instead of 5 aborts.
 */
import { EVE } from '../../lib/world.js'
import { loadContext, requireTradePackage } from '../../lib/context.js'
import { expectTradeAborts, tradeAndCheck } from '../../lib/steps.js'
import { FEE } from '../rules.js'

const ctx = loadContext()
requireTradePackage(ctx)
const rules = FEE.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state })

await tradeAndCheck(ctx, FEE, rules)
await expectTradeAborts(
  ctx,
  FEE,
  { ...rules, payment: 4n * EVE },
  /EWrongAmount/,
  'paying 4 EVE instead of 5 is refused',
)
