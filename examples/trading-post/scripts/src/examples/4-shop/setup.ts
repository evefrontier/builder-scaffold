/**
 * Example 4, seller: sell 1 part for 20 EVE.
 *
 * No item comes in: the action is the Payment requirement followed by a
 * withdrawal.
 */
import { loadContext, requireTradePackage } from '../../lib/context.js'
import { enableExample } from '../../lib/steps.js'
import { SHOP } from '../rules.js'

const ctx = loadContext()
requireTradePackage(ctx)
await enableExample(
  ctx,
  SHOP,
  SHOP.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state }),
)
