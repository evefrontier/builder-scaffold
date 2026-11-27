/**
 * Example 3, seller: the same barter, plus a 5 EVE fee paid to you.
 *
 * The fee is the trade package's Payment requirement. It goes first, so the
 * payment is checked before any item moves.
 */
import { loadContext, requireTradePackage } from '../../lib/context.js'
import { enableExample } from '../../lib/steps.js'
import { FEE } from '../rules.js'

const ctx = loadContext()
requireTradePackage(ctx)
await enableExample(
  ctx,
  FEE,
  FEE.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state }),
)
