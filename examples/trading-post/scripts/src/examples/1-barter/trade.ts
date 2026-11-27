/**
 * Example 1, buyer: trade 10 ore from your ship for 1 part from the trading post.
 *
 * Then checks that the action enforces its rules: asking for 2 parts instead
 * of 1 aborts, and nothing changes.
 */
import { loadContext } from '../../lib/context.js'
import { expectTradeAborts, tradeAndCheck } from '../../lib/steps.js'
import { BARTER } from '../rules.js'

const ctx = loadContext()
const rules = BARTER.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state })

await tradeAndCheck(ctx, BARTER, rules)
await expectTradeAborts(
  ctx,
  BARTER,
  { ...rules, receive: { ...rules.receive, quantity: 2n } },
  /EQuantityAboveMax/,
  'withdrawing 2 parts instead of 1 is refused',
)
