/**
 * Game stand-in for localnet. On a real server the game does all of this when
 * players build, fuel, load and dock; builders never call these functions,
 * because each one needs a game admin or sponsor key.
 *
 * Creates:
 *  - the NeoType variants for ore, parts and fuel
 *  - a trading post owned by PLAYER_A (the seller), stocked with 100 parts
 *  - a ship owned by PLAYER_B (the buyer) carrying 100 ore and 1,000 EVE
 *  - a ship owned by PLAYER_C (the outsider) carrying 100 ore and 1,000 EVE
 * Every assembly is powered and online, and both ships are docked at the
 * trading post.
 */
import {
  bridgeInRequirement,
  completeRequest,
  componentIdFromName,
  createStorageUnit,
  deriveObjectId,
  dock,
  enableAdminAction,
  eveCoinType,
  gameItemToChain,
  installFuelBay,
  installGenerator,
  installLayout,
  interact,
  mintAccess,
  operateGridRequirement,
  ownerRequirement,
  verifyOwner,
  depositFuel,
  depositFuelRequirement,
  deriveVariantId,
  MASS_UNIT,
  POWER_SCALE,
  registerVariant,
  VALUE_SCALE,
  type VariantKeyInput,
  setDesiredState,
  setFuelBay,
  setGenerator,
  setPowerGrid,
  setShell,
} from '@evefrontier/world-sdk'
import type { Signer } from '@mysten/sui/cryptography'
import { coinWithBalance, Transaction } from '@mysten/sui/transactions'
import {
  type Context,
  execute,
  executeSponsored,
  LOCAL_ASSEMBLIES,
  LOCAL_CHARACTERS,
  LOCAL_INVENTORY,
  LOCAL_TENANT,
  localAccount,
  loadContext,
  report,
} from '../lib/context.js'
import { EVE, type OwnedAssembly, withAssemblyCap } from '../lib/world.js'

const ctx = loadContext()
if (ctx.network !== 'localnet') {
  throw new Error('The game stand-in only runs on localnet. On a server, the game does this.')
}

const admin = localAccount('ADMIN')
const sponsor = localAccount('SPONSOR')
const exchange = localAccount('EXCHANGE')
const { world } = ctx

const GENERATOR = componentIdFromName('generator')
const FUEL_BAY = componentIdFromName('fuel')
const GRID = componentIdFromName('power_grid')
const SHELL = '0x5e11'
const FUEL_TYPE = 7n
/** The fuel the generators burn: a mass variant with the four fuel properties. */
// Variant ID 0 means "no variant" and can hold no values, so fuel uses 1.
const FUEL: VariantKeyInput = { tenant: LOCAL_TENANT, typeId: FUEL_TYPE, variantId: 1n }
const BRIDGE_IN = `bridge_in_${LOCAL_INVENTORY}`

const players = [
  { name: 'PLAYER_A (seller)', signer: ctx.seller, assembly: ctx.post, inGameId: LOCAL_ASSEMBLIES.tradingPost, characterId: LOCAL_CHARACTERS.PLAYER_A },
  { name: 'PLAYER_B (buyer)', signer: ctx.buyer, assembly: ctx.buyerShip, inGameId: LOCAL_ASSEMBLIES.buyerShip, characterId: LOCAL_CHARACTERS.PLAYER_B },
  { name: 'PLAYER_C (outsider)', signer: ctx.outsider!, assembly: ctx.outsiderShip!, inGameId: LOCAL_ASSEMBLIES.outsiderShip, characterId: LOCAL_CHARACTERS.PLAYER_C },
]

async function exists(ctx: Context, objectId: string): Promise<boolean> {
  try {
    await ctx.client.getObject({ objectId })
    return true
  } catch {
    return false
  }
}

if (await exists(ctx, ctx.post.entity)) {
  console.log('The game setup has already run on this localnet. Nothing to do.')
  process.exit(0)
}

// 1. Register the NeoType variants. Each item's volume and properties live in
//    one frozen record; inventories keep only its key. Volumes are m³ per item
//    (or per kg for mass) at VALUE_SCALE.
{
  const tx = new Transaction()
  registerVariant(tx, world, { key: ctx.items.ore, kind: 'units', unitVolume: VALUE_SCALE / 100n, values: [] })
  registerVariant(tx, world, { key: ctx.items.parts, kind: 'units', unitVolume: VALUE_SCALE, values: [] })
  registerVariant(tx, world, {
    key: FUEL,
    kind: 'mass',
    unitVolume: VALUE_SCALE / 1_000n,
    values: [
      { propertyId: 208, magnitude: 90n * VALUE_SCALE }, // impulse
      { propertyId: 209, magnitude: 0n }, // thermal inefficiency
      { propertyId: 210, magnitude: 14n * VALUE_SCALE }, // containment burden
      { propertyId: 211, magnitude: 5n * VALUE_SCALE }, // volatility
    ],
  })
  await execute(ctx, tx, admin)
  console.log('registered the ore, parts and fuel variants')
}

// 2. Create the three assemblies, each with an inventory of 10,000 m³
//    (capacity is in nano-m³).
{
  const tx = new Transaction()
  for (const p of players) {
    createStorageUnit(tx, world, {
      inGameId: p.inGameId,
      tenant: LOCAL_TENANT,
      componentId: LOCAL_INVENTORY,
      typeId: 1n,
      name: p.name,
      capacity: 10_000n * VALUE_SCALE,
    })
  }
  await execute(ctx, tx, admin)
  console.log('created the trading post and two ships')
}

// 3. Give each one power: a generator, a fuel bay, a Shell, and the game's
//    admin actions for power and for bridging items in.
{
  const tx = new Transaction()
  for (const p of players) {
    const entity = tx.object(p.assembly.entity)
    installGenerator(tx, world, entity, {
      componentId: GENERATOR,
      fuelType: FUEL_TYPE,
      maxOutputMw: 15n,
      impulseLimit: 100n * POWER_SCALE,
      volatilityLimit: 1n,
    })
    installFuelBay(tx, world, entity, { componentId: FUEL_BAY, capacity: 1_000n * POWER_SCALE })
    installLayout(tx, world, entity, [{ sectionId: 1n, moduleIds: [GRID] }])
    setShell(tx, world, entity, SHELL, GRID)
    for (const action of ['set_power_grid', 'set_generator', 'set_fuel_bay', 'set_desired_state']) {
      enableAdminAction(tx, world, entity, action, [operateGridRequirement(tx, world)])
    }
    enableAdminAction(tx, world, entity, 'deposit_fuel', [depositFuelRequirement(tx, world)])
    // Bridging needs the owner, and the game sponsors it.
    enableAdminAction(tx, world, entity, BRIDGE_IN, [
      ownerRequirement(tx, world),
      bridgeInRequirement(tx, world, LOCAL_INVENTORY, {}),
    ])
  }
  await execute(ctx, tx, admin)
  console.log('installed power and the bridge action')
}

// 4. Ownership: each player gets their character's cap in their wallet, and
//    the assembly's cap is kept on their character, as in the game.
{
  const tx = new Transaction()
  for (const p of players) {
    const character = deriveObjectId(world, { id: p.characterId, tenant: LOCAL_TENANT })
    mintAccess(tx, world, { entity: character, owner: p.signer.toSuiAddress(), transferable: false })
    mintAccess(tx, world, { entity: p.assembly.entity, owner: character, transferable: true })
  }
  await execute(ctx, tx, admin)
  console.log('minted the access caps')
}

// 5. Each owner fuels their assembly and switches the inventory on. The game
//    sponsors these actions.
for (const p of players) {
  const tx = new Transaction()
  await withAssemblyCap(tx, ctx.client, world, p.signer.toSuiAddress(), p.assembly, (cap) => {
    powerOn(tx, p.assembly, cap)
  })
  await executeSponsored(ctx, tx, p.signer, sponsor)
}
console.log('powered the inventories on')

function powerOn(tx: Transaction, a: OwnedAssembly, cap: Parameters<typeof setFuelBay>[4]) {
  const entity = tx.object(a.entity)
  const fuel = interact(tx, world, entity, 'deposit_fuel')
  // 100 kg of the fuel variant; its type and stats come from the record.
  depositFuel(tx, world, entity, fuel, cap, {
    fuelBayId: FUEL_BAY,
    variant: deriveVariantId(world, FUEL),
    amount: 100n * MASS_UNIT,
  })
  completeRequest(tx, world, entity, fuel)
  const steps: [string, (r: ReturnType<typeof interact>) => void][] = [
    ['set_fuel_bay', (r) => setFuelBay(tx, world, entity, r, cap, FUEL_BAY, true)],
    ['set_power_grid', (r) => setPowerGrid(tx, world, entity, r, cap, true)],
    ['set_generator', (r) => setGenerator(tx, world, entity, r, cap, GENERATOR, true)],
    ['set_desired_state', (r) => setDesiredState(tx, world, entity, r, cap, a.inventory, true)],
  ]
  for (const [action, step] of steps) {
    const request = interact(tx, world, entity, action)
    step(request)
    completeRequest(tx, world, entity, request)
  }
}

// 6. Bridge items in: parts into the trading post, ore into both ships. In the
//    game, this is the player moving items from their container to the
//    airlock: the owner signs, and the game sponsors the gas.
{
  const loads: [Signer, OwnedAssembly, VariantKeyInput][] = [
    [ctx.seller, ctx.post, ctx.items.parts],
    [ctx.buyer, ctx.buyerShip, ctx.items.ore],
    [ctx.outsider!, ctx.outsiderShip!, ctx.items.ore],
  ]
  for (const [owner, a, key] of loads) {
    const tx = new Transaction()
    await withAssemblyCap(tx, ctx.client, world, owner.toSuiAddress(), a, (cap) => {
      const entity = tx.object(a.entity)
      const request = interact(tx, world, entity, BRIDGE_IN)
      verifyOwner(tx, world, entity, request, cap)
      gameItemToChain(tx, world, entity, request, { variant: deriveVariantId(world, key), quantity: 100n })
      completeRequest(tx, world, entity, request)
    })
    await executeSponsored(ctx, tx, owner, sponsor)
  }
  console.log('bridged items in')
}

// 7. Dock both ships at the trading post.
{
  const tx = new Transaction()
  dock(tx, world, tx.object(ctx.post.entity), tx.object(ctx.buyerShip.entity))
  dock(tx, world, tx.object(ctx.post.entity), tx.object(ctx.outsiderShip!.entity))
  await execute(ctx, tx, admin)
  console.log('docked both ships at the trading post')
}

// 8. Give the two players some EVE to pay with.
{
  const tx = new Transaction()
  tx.setSender(exchange.toSuiAddress())
  for (const player of [ctx.buyer, ctx.outsider!]) {
    tx.transferObjects(
      [coinWithBalance({ type: eveCoinType(world), balance: 1_000n * EVE })],
      player.toSuiAddress(),
    )
  }
  await execute(ctx, tx, exchange)
  console.log('sent 1,000 EVE to each player')
}

report('Game setup done', {
  'trading post': ctx.post.entity,
  'buyer ship': ctx.buyerShip.entity,
  'outsider ship': ctx.outsiderShip!.entity,
})
