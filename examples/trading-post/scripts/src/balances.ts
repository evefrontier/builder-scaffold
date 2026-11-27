/** Print the item and EVE balances of the trading post, the buyer's ship, and both players. */
import { loadContext } from './lib/context.js'
import { printSnapshot, snapshot } from './lib/steps.js'

const ctx = loadContext()
printSnapshot('Balances', await snapshot(ctx))
