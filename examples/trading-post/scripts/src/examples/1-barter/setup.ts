/**
 * Example 1, seller: enable a barter action on the trading post.
 *
 * Players deposit exactly 10 ore and withdraw exactly 1 part. The action is
 * built only from the game's inventory requirements, so no Move code is needed.
 */
import { loadContext } from '../../lib/context.js'
import { enableExample } from '../../lib/steps.js'
import { BARTER } from '../rules.js'

const ctx = loadContext()
await enableExample(
  ctx,
  BARTER,
  BARTER.rules({ items: ctx.items, inventory: ctx.post.inventory, seller: ctx.seller.toSuiAddress(), state: ctx.state }),
)
