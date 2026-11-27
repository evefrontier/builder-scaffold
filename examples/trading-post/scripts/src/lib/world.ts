/**
 * Transaction builders and reads shared by the scripts and the dApp. Nothing
 * here touches the file system or private keys, so it runs in a browser too.
 *
 * The world calls come from @evefrontier/world-sdk. The `trade` package calls
 * (allowlist and payment) are this scaffold's own Move code in move/trade.
 */
import {
  balanceOf,
  borrowAccess,
  type CapObjectRef,
  type VariantKeyInput,
  completeRequest,
  deposit,
  depositRequirement,
  enableAction,
  disableAction,
  eveCoinType,
  interact,
  mvrName,
  ownerRequirement,
  returnAccess,
  verifyOwner,
  withdraw,
  withdrawRequirement,
  type WorldConfig,
} from '@evefrontier/world-sdk'
import { bcs } from '@mysten/sui/bcs'
import type { ClientWithCoreApi } from '@mysten/sui/client'
import {
  coinWithBalance,
  Transaction,
  type TransactionArgument,
  type TransactionObjectArgument,
} from '@mysten/sui/transactions'

/**
 * An item and an amount. Items are NeoType variants: a key of tenant, type ID
 * and variant ID (`0n` for a type with no variants). Only identical keys stack.
 */
export interface ItemAmount {
  key: VariantKeyInput
  quantity: bigint
}

/** Read a variant key from JSON, where its numbers are strings. */
export function parseItem(raw: { tenant: string; typeId: string; variantId: string }): VariantKeyInput {
  return { tenant: raw.tenant, typeId: BigInt(raw.typeId), variantId: BigInt(raw.variantId) }
}

/** A player's ship (or any assembly they own) and the character that holds its cap. */
export interface OwnedAssembly {
  /** Object ID of the assembly entity. */
  entity: string
  /** Component ID of the inventory module on it. */
  inventory: bigint
  /** Object ID of the owner's character entity, which holds the assembly's AccessCap. */
  character: string
}

/** The rules a trade action is built from, in the order they run. */
export interface TradeRules {
  /** Inventory component ID on the trading post. */
  inventory: bigint
  /** Only characters on this allowlist may trade (example 2). */
  allowlist?: string
  /** The player pays this much EVE (smallest unit) to `paymentRecipient` (examples 3 and 4). */
  payment?: bigint
  paymentRecipient?: string
  /** What the player hands over (examples 1 to 3). Omit for a shop (example 4). */
  give?: ItemAmount
  /** What the player receives. */
  receive: ItemAmount
}

// ---------------------------------------------------------------------------
// Access caps
// ---------------------------------------------------------------------------

function coreId(world: WorldConfig): string {
  return world.packageOverrides?.core ?? mvrName(world.env, 'core')
}

/**
 * Find the `AccessCap` for `entity` held by `owner` (a wallet address or a
 * character's object ID). Returns its current object reference, which a
 * transaction needs to receive the cap from a character.
 */
export async function findAccessCap(
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
  entity: string,
): Promise<CapObjectRef> {
  let cursor: string | null = null
  do {
    const page: Awaited<ReturnType<typeof client.core.listOwnedObjects<{ json: true }>>> =
      await client.core.listOwnedObjects({
      owner,
      type: `${coreId(world)}::access_cap::AccessCap`,
      include: { json: true },
      cursor,
    })
    for (const object of page.objects) {
      const json = object.json as { entity?: string } | null
      if (json?.entity === entity) {
        return {
          objectId: object.objectId,
          version: object.version,
          digest: object.digest,
        }
      }
    }
    cursor = page.hasNextPage ? page.cursor : null
  } while (cursor)
  throw new Error(`no AccessCap for ${entity} owned by ${owner}`)
}

/**
 * Borrow the assembly's cap from its owner's character, run `body` with it,
 * and put it back, all in `tx`. The signer must own the character.
 */
export async function withAssemblyCap(
  tx: Transaction,
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
  assembly: OwnedAssembly,
  body: (cap: TransactionArgument) => void,
): Promise<void> {
  const characterCap = await findAccessCap(
    client,
    world,
    owner,
    assembly.character,
  )
  const assemblyCap = await findAccessCap(
    client,
    world,
    assembly.character,
    assembly.entity,
  )
  const character = tx.object(assembly.character)
  const [cap, receipt] = borrowAccess(
    tx,
    world,
    character,
    tx.object(characterCap.objectId),
    assemblyCap,
  )
  body(cap)
  returnAccess(tx, world, character, cap, receipt)
}

// ---------------------------------------------------------------------------
// Seller: enabling trade actions
// ---------------------------------------------------------------------------

/** Build the requirement list for a trade action, in the order it will run. */
export function tradeRequirements(
  tx: Transaction,
  world: WorldConfig,
  tradePackage: string,
  rules: TradeRules,
): TransactionObjectArgument[] {
  const requirements: TransactionObjectArgument[] = []
  // Builder rules go first, so they run before any item moves.
  if (rules.allowlist) {
    requirements.push(
      tx.moveCall({
        target: `${tradePackage}::allowlist::on_allowlist_requirement`,
        arguments: [tx.pure.id(rules.allowlist)],
      }),
    )
  }
  if (rules.payment !== undefined) {
    if (!rules.paymentRecipient) throw new Error('payment needs a recipient')
    requirements.push(
      tx.moveCall({
        target: `${tradePackage}::payment::payment_requirement`,
        arguments: [
          tx.pure.u64(rules.payment),
          tx.pure.address(rules.paymentRecipient),
        ],
      }),
    )
  }
  if (rules.give) {
    requirements.push(
      depositRequirement(tx, world, rules.inventory, {
        typeId: rules.give.key.typeId,
        variantId: rules.give.key.variantId,
        minQuantity: rules.give.quantity,
        maxQuantity: rules.give.quantity,
      }),
    )
  }
  requirements.push(
    withdrawRequirement(tx, world, rules.inventory, {
      typeId: rules.receive.key.typeId,
      variantId: rules.receive.key.variantId,
      minQuantity: rules.receive.quantity,
      maxQuantity: rules.receive.quantity,
    }),
  )
  return requirements
}

/**
 * Enable `name` on the trading post as an owner action built from `rules`. If
 * an action with that name already exists, it is replaced. Signed by the
 * trading post's owner.
 */
export async function enableTradeAction(
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
  post: OwnedAssembly,
  tradePackage: string,
  name: string,
  rules: TradeRules,
): Promise<Transaction> {
  const exists = await hasOwnerAction(client, world, owner, post.entity, name)
  const tx = new Transaction()
  await withAssemblyCap(tx, client, world, owner, post, (cap) => {
    const entity = tx.object(post.entity)
    if (exists) disableAction(tx, world, entity, name, cap)
    enableAction(
      tx,
      world,
      entity,
      name,
      tradeRequirements(tx, world, tradePackage, rules),
      cap,
    )
  })
  return tx
}

// ---------------------------------------------------------------------------
// Buyer: ship actions and the trade itself
// ---------------------------------------------------------------------------

/** Owner actions a player enables once on their own ship to move cargo in and out. */
export const SHIP_WITHDRAW = 'ship_withdraw'
export const SHIP_DEPOSIT = 'ship_deposit'

/**
 * Enable the ship's withdraw and deposit owner actions, skipping any that
 * already exist. Returns `undefined` when there is nothing to do.
 */
export async function prepareShip(
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
  ship: OwnedAssembly,
): Promise<Transaction | undefined> {
  const [hasWithdraw, hasDeposit] = await Promise.all([
    hasOwnerAction(client, world, owner, ship.entity, SHIP_WITHDRAW),
    hasOwnerAction(client, world, owner, ship.entity, SHIP_DEPOSIT),
  ])
  if (hasWithdraw && hasDeposit) return undefined
  const tx = new Transaction()
  await withAssemblyCap(tx, client, world, owner, ship, (cap) => {
    const entity = tx.object(ship.entity)
    if (!hasWithdraw) {
      enableAction(
        tx,
        world,
        entity,
        SHIP_WITHDRAW,
        [
          ownerRequirement(tx, world),
          withdrawRequirement(tx, world, ship.inventory, {}),
        ],
        cap,
      )
    }
    if (!hasDeposit) {
      enableAction(
        tx,
        world,
        entity,
        SHIP_DEPOSIT,
        [
          ownerRequirement(tx, world),
          depositRequirement(tx, world, ship.inventory, {}),
        ],
        cap,
      )
    }
  })
  return tx
}

export interface TradeArgs {
  tradePackage: string
  /** The trading post's object ID. */
  post: string
  /** The trade action's name on the trading post. */
  action: string
  rules: TradeRules
  /** The buyer's ship, docked at the trading post. */
  ship: OwnedAssembly
}

/**
 * Build the buyer's trade: one transaction with up to three requests.
 *
 * 1. Ship: take the item the player gives out of their ship.
 * 2. Trading post: run the action's handlers in order, then complete it.
 * 3. Ship: put the item the player receives into their ship.
 */
export async function buildTrade(
  client: ClientWithCoreApi,
  world: WorldConfig,
  buyer: string,
  args: TradeArgs,
): Promise<Transaction> {
  const { rules, ship } = args
  const tx = new Transaction()
  tx.setSender(buyer)

  await withAssemblyCap(tx, client, world, buyer, ship, (shipCap) => {
    const shipEntity = tx.object(ship.entity)
    const post = tx.object(args.post)

    // 1. Ship: withdraw what the player gives.
    let given: TransactionArgument | undefined
    if (rules.give) {
      const request = interact(tx, world, shipEntity, SHIP_WITHDRAW)
      verifyOwner(tx, world, shipEntity, request, shipCap)
      given = withdraw(tx, world, shipEntity, request, rules.give)
      completeRequest(tx, world, shipEntity, request)
    }

    // 2. Trading post: satisfy each requirement in the order the action lists them.
    const request = interact(tx, world, post, args.action)
    if (rules.allowlist) {
      tx.moveCall({
        target: `${args.tradePackage}::allowlist::assert_on_allowlist`,
        arguments: [request, tx.object(rules.allowlist), tx.object(ship.character)],
      })
    }
    if (rules.payment !== undefined) {
      const coin = coinWithBalance({
        type: eveCoinType(world),
        balance: rules.payment,
      })
      tx.moveCall({
        target: `${args.tradePackage}::payment::pay`,
        arguments: [request, coin],
      })
    }
    if (given) deposit(tx, world, post, request, given)
    const received = withdraw(tx, world, post, request, rules.receive)
    completeRequest(tx, world, post, request)

    // 3. Ship: deposit what the player receives.
    const shipRequest = interact(tx, world, shipEntity, SHIP_DEPOSIT)
    verifyOwner(tx, world, shipEntity, shipRequest, shipCap)
    deposit(tx, world, shipEntity, shipRequest, received)
    completeRequest(tx, world, shipEntity, shipRequest)
  })
  return tx
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Run read-only Move calls without sending a transaction and return the raw results. */
async function simulateReads(
  client: ClientWithCoreApi,
  sender: string,
  build: (tx: Transaction) => void,
): Promise<Uint8Array[]> {
  const tx = new Transaction()
  tx.setSender(sender)
  build(tx)
  const res = await client.core.simulateTransaction({
    transaction: tx,
    include: { commandResults: true },
  })
  if (res.$kind === 'FailedTransaction') {
    throw new Error(
      `read failed: ${res.FailedTransaction.status.error?.message ?? 'unknown'}`,
    )
  }
  return res.commandResults.map((r) => r.returnValues[0]?.bcs ?? new Uint8Array())
}

/** Balance of each item in an assembly's inventory. */
export async function itemBalances(
  client: ClientWithCoreApi,
  world: WorldConfig,
  sender: string,
  entity: string,
  inventory: bigint,
  keys: VariantKeyInput[],
): Promise<bigint[]> {
  const values = await simulateReads(client, sender, (tx) => {
    for (const key of keys) {
      balanceOf(tx, world, tx.object(entity), { componentId: inventory, key })
    }
  })
  // Each read is two commands: build the variant key, then `balance_of`.
  return values.filter((_, i) => i % 2 === 1).map((v) => BigInt(bcs.u64().parse(v)))
}

/** Whether `entity` has an owner action called `name`. */
export async function hasOwnerAction(
  client: ClientWithCoreApi,
  world: WorldConfig,
  sender: string,
  entity: string,
  name: string,
): Promise<boolean> {
  const [value] = await simulateReads(client, sender, (tx) => {
    tx.moveCall({
      target: `${coreId(world)}::entity::has_owner_action`,
      arguments: [tx.object(entity), tx.pure.string(name)],
    })
  })
  return bcs.bool().parse(value)
}

/** Names of the owner actions an entity exposes. */
export async function ownerActionNames(
  client: ClientWithCoreApi,
  world: WorldConfig,
  sender: string,
  entity: string,
): Promise<string[]> {
  const [value] = await simulateReads(client, sender, (tx) => {
    tx.moveCall({
      target: `${coreId(world)}::entity::owner_action_names`,
      arguments: [tx.object(entity)],
    })
  })
  return bcs.vector(bcs.string()).parse(value)
}

/** Entity IDs of every `AccessCap` held by `owner` (a wallet or a character). */
export async function accessCapEntities(
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
): Promise<string[]> {
  const entities: string[] = []
  let cursor: string | null = null
  do {
    const page: Awaited<ReturnType<typeof client.core.listOwnedObjects<{ json: true }>>> =
      await client.core.listOwnedObjects({
        owner,
        type: `${coreId(world)}::access_cap::AccessCap`,
        include: { json: true },
        cursor,
      })
    for (const object of page.objects) {
      const entity = (object.json as { entity?: string } | null)?.entity
      if (entity) entities.push(entity)
    }
    cursor = page.hasNextPage ? page.cursor : null
  } while (cursor)
  return entities
}

/** IDs of the entities docked at `entity`. */
export async function dockedEntities(
  client: ClientWithCoreApi,
  world: WorldConfig,
  sender: string,
  entity: string,
): Promise<string[]> {
  const [value] = await simulateReads(client, sender, (tx) => {
    tx.moveCall({
      target: `${coreId(world)}::entity::docked_entities`,
      arguments: [tx.object(entity)],
    })
  })
  return bcs.struct('VecSet', { contents: bcs.vector(bcs.Address) }).parse(value).contents
}

/**
 * Find a ship the wallet `owner` controls that is docked at `post`: the
 * wallet holds its character's cap, and the character holds the ship's cap.
 */
export async function findDockedShip(
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
  post: string,
  inventory: bigint,
): Promise<OwnedAssembly | undefined> {
  const docked = new Set(await dockedEntities(client, world, owner, post))
  for (const character of await accessCapEntities(client, world, owner)) {
    for (const entity of await accessCapEntities(client, world, character)) {
      if (docked.has(entity)) return { entity, inventory, character }
    }
  }
  return undefined
}

/** An address's EVE balance, in the smallest unit. */
export async function eveBalance(
  client: ClientWithCoreApi,
  world: WorldConfig,
  owner: string,
): Promise<bigint> {
  const { balance } = await client.core.getBalance({
    owner,
    coinType: eveCoinType(world),
  })
  return BigInt(balance.balance)
}

/** 1 EVE in its smallest unit (EVE has 9 decimals). */
export const EVE = 1_000_000_000n
