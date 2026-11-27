/**
 * Buyer, once: enable the owner actions that move cargo out of and into your
 * ship (ship_withdraw and ship_deposit). Every trade uses them. The trade
 * scripts also run this step if it's missing.
 */
import { loadContext } from './lib/context.js'
import { ensureShipReady } from './lib/steps.js'

const ctx = loadContext()
await ensureShipReady(ctx)
console.log('The ship is ready to trade.')
