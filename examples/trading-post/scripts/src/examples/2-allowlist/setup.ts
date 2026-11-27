/**
 * Example 2, seller: only characters on your allowlist may barter.
 *
 * 1. Create an allowlist (a shared object from the trade package) and keep its
 *    admin cap.
 * 2. Add the buyer's character to it.
 * 3. Enable an action whose first requirement is the allowlist check, followed
 *    by the same barter as example 1.
 */
import { Transaction } from '@mysten/sui/transactions'
import { execute, loadContext, report, requireTradePackage } from '../../lib/context.js'
import { enableExample } from '../../lib/steps.js'
import { ALLOWLIST } from '../rules.js'

const ctx = loadContext()
const pkg = requireTradePackage(ctx)
const seller = ctx.seller.toSuiAddress()

// 1. Create the allowlist once, and transfer its cap to the seller.
if (!ctx.state.allowlist || !ctx.state.allowlistCap) {
  const tx = new Transaction()
  const cap = tx.moveCall({ target: `${pkg}::allowlist::create` })
  tx.transferObjects([cap], seller)
  const { created } = await execute(ctx, tx, ctx.seller)
  ctx.saveState({
    allowlist: created[`${pkg}::allowlist::Allowlist`],
    allowlistCap: created[`${pkg}::allowlist::AllowlistAdminCap`],
  })
  report('Created an allowlist', {
    allowlist: ctx.state.allowlist!,
    'admin cap': ctx.state.allowlistCap!,
  })
}

// 2. Add the buyer's character. The list holds character IDs, not wallet addresses.
{
  const tx = new Transaction()
  tx.moveCall({
    target: `${pkg}::allowlist::add`,
    arguments: [
      tx.object(ctx.state.allowlist!),
      tx.object(ctx.state.allowlistCap!),
      tx.pure.id(ctx.buyerShip.character),
    ],
  })
  await execute(ctx, tx, ctx.seller)
  report('Added the buyer to the allowlist', { character: ctx.buyerShip.character })
}

// 3. Enable the action.
await enableExample(
  ctx,
  ALLOWLIST,
  ALLOWLIST.rules({ items: ctx.items, inventory: ctx.post.inventory, seller, state: ctx.state }),
)
