/**
 * Everything a script needs: the network, the world config, a client, the
 * players' keys, and the IDs of the assemblies the examples use.
 *
 * The network is localnet unless a script is run with `--network testnet`, for
 * example `pnpm publish:trade --network testnet`. Localnet uses the chain from
 * `pnpm localnet:start` and its public test accounts. Testnet reads
 * scripts/testnet.json (see scripts/testnet.example.json) and scripts/.env.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deriveObjectId,
  getWorldConfig,
  loadWorldConfig,
  mvrName,
  type Env,
  type VariantKeyInput,
  type WorldConfig,
} from '@evefrontier/world-sdk'
import type { Signer } from '@mysten/sui/cryptography'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import type { Transaction } from '@mysten/sui/transactions'
import type { OwnedAssembly } from './world.js'

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
/** What `pnpm localnet:start` copies out of the snapshot image. */
const LOCALNET = join(ROOT, 'vendor/localnet')

export type Network = 'localnet' | 'testnet'

/**
 * The network from `--network <name>` (or `--network=<name>`), so it reads the
 * same in every shell. The NETWORK environment variable is a fallback, for
 * tools such as Vite that don't take the flag.
 */
function networkFromArgs(): Network {
  const args = process.argv
  const i = args.indexOf('--network')
  const value =
    (i >= 0 ? args[i + 1] : args.find((a) => a.startsWith('--network='))?.slice(10)) ??
    process.env.NETWORK ??
    'localnet'
  if (value !== 'localnet' && value !== 'testnet') {
    throw new Error(`Unknown network "${value}". Use localnet or testnet.`)
  }
  return value
}

export const NETWORK: Network = networkFromArgs()

/**
 * Example items, as NeoType variant keys. On a real server, use the keys of
 * real items: your tenant, the item's type ID, and its variant ID.
 */
export interface Items {
  /** What the buyer gives in the barter examples. */
  ore: VariantKeyInput
  /** What the trading post sells. */
  parts: VariantKeyInput
}

/** IDs the examples create and later steps read. Saved in scripts/.state/. */
export interface State {
  tradePackage?: string
  allowlist?: string
  allowlistCap?: string
}

export interface Context {
  network: Network
  world: WorldConfig
  client: SuiGrpcClient
  /** Owns the trading post and enables the trade actions. */
  seller: Signer
  /** Owns a ship docked at the trading post and trades with it. */
  buyer: Signer
  /** Another player with a docked ship, who is not on the allowlist (localnet only). */
  outsider?: Signer
  post: OwnedAssembly
  buyerShip: OwnedAssembly
  outsiderShip?: OwnedAssembly
  items: Items
  state: State
  saveState(update: State): void
}

// ---------------------------------------------------------------------------
// Localnet scenario. The game stand-in (src/game/setup.ts) creates these.
// ---------------------------------------------------------------------------

/** Tenant and character IDs seeded by world-contracts (its test-resources.json). */
export const LOCAL_TENANT = 'local'
export const LOCAL_CHARACTERS = {
  PLAYER_A: 900000001n,
  PLAYER_B: 900000002n,
  PLAYER_C: 900000003n,
} as const

/** In-game IDs for the assemblies the game stand-in creates. */
export const LOCAL_ASSEMBLIES = {
  tradingPost: 7000001n,
  buyerShip: 7000002n,
  outsiderShip: 7000003n,
} as const

/** The inventory component ID on each assembly. */
export const LOCAL_INVENTORY = 1n

/** Two item types the game stand-in registers. Neither has variants, so the variant ID is 0. */
export const LOCAL_ITEMS: Items = {
  ore: { tenant: LOCAL_TENANT, typeId: 100001n, variantId: 0n },
  parts: { tenant: LOCAL_TENANT, typeId: 100002n, variantId: 0n },
}

type LocalAccount = 'ADMIN' | 'SPONSOR' | 'EXCHANGE' | 'PLAYER_A' | 'PLAYER_B' | 'PLAYER_C'

/** A localnet genesis account. These keys are public: never use them elsewhere. */
export function localAccount(name: LocalAccount): Ed25519Keypair {
  const file = JSON.parse(
    readFileSync(join(LOCALNET, 'accounts.json'), 'utf8'),
  ) as { accounts: Record<string, { privateKey: string }> }
  const key = file.accounts[name]?.privateKey
  if (!key) throw new Error(`accounts.json has no ${name}`)
  return Ed25519Keypair.fromSecretKey(key)
}

function localWorld(): WorldConfig {
  const manifest = join(LOCALNET, 'world.json')
  if (!existsSync(manifest)) {
    throw new Error(`${manifest} not found. Start the local network first: pnpm localnet:start`)
  }
  return loadWorldConfig(manifest)
}

/** A client that resolves @evefrontier MVR names to the localnet package IDs. */
function localClient(world: WorldConfig): SuiGrpcClient {
  const packages: Record<string, string> = {}
  for (const [pkg, id] of Object.entries(world.packageOverrides ?? {})) {
    packages[mvrName(world.env, pkg)] = id
  }
  return new SuiGrpcClient({
    network: 'localnet',
    baseUrl: 'http://127.0.0.1:9000',
    mvr: { overrides: { packages } },
  })
}

function localContext(): Omit<Context, 'state' | 'saveState'> {
  const world = localWorld()
  const id = (inGameId: bigint) =>
    deriveObjectId(world, { id: inGameId, tenant: LOCAL_TENANT })
  const assembly = (inGameId: bigint, character: bigint): OwnedAssembly => ({
    entity: id(inGameId),
    inventory: LOCAL_INVENTORY,
    character: id(character),
  })
  return {
    network: 'localnet',
    world,
    client: localClient(world),
    seller: localAccount('PLAYER_A'),
    buyer: localAccount('PLAYER_B'),
    outsider: localAccount('PLAYER_C'),
    post: assembly(LOCAL_ASSEMBLIES.tradingPost, LOCAL_CHARACTERS.PLAYER_A),
    buyerShip: assembly(LOCAL_ASSEMBLIES.buyerShip, LOCAL_CHARACTERS.PLAYER_B),
    outsiderShip: assembly(LOCAL_ASSEMBLIES.outsiderShip, LOCAL_CHARACTERS.PLAYER_C),
    items: LOCAL_ITEMS,
  }
}

// ---------------------------------------------------------------------------
// Sui testnet. Not yet verified: the v1 world packages are not yet on a public
// server.
// ---------------------------------------------------------------------------

interface TestnetFile {
  /** The world deployment's MVR suffix, for example "test". */
  worldEnv: Env
  grpcUrl?: string
  post: { entity: string; inventory: string; character: string }
  buyerShip: { entity: string; inventory: string; character: string }
  items: { ore: RawItem; parts: RawItem }
}

type RawItem = { tenant: string; typeId: string; variantId: string }

function parseItem(raw: RawItem): VariantKeyInput {
  return { tenant: raw.tenant, typeId: BigInt(raw.typeId), variantId: BigInt(raw.variantId) }
}

function testnetContext(): Omit<Context, 'state' | 'saveState'> {
  const path = join(ROOT, 'scripts/testnet.json')
  if (!existsSync(path)) {
    throw new Error(`${path} not found. Copy scripts/testnet.example.json and fill it in.`)
  }
  const file = JSON.parse(readFileSync(path, 'utf8')) as TestnetFile
  const envFile = join(ROOT, 'scripts/.env')
  if (existsSync(envFile)) process.loadEnvFile(envFile)
  const sellerKey = process.env.SELLER_PRIVATE_KEY
  const buyerKey = process.env.BUYER_PRIVATE_KEY
  if (!sellerKey || !buyerKey) {
    throw new Error('Set SELLER_PRIVATE_KEY and BUYER_PRIVATE_KEY (suiprivkey1...) in scripts/.env')
  }
  const world = getWorldConfig(file.worldEnv)
  const assembly = (a: TestnetFile['post']): OwnedAssembly => ({
    entity: a.entity,
    inventory: BigInt(a.inventory),
    character: a.character,
  })
  return {
    network: 'testnet',
    world,
    client: new SuiGrpcClient({
      network: 'testnet',
      baseUrl: file.grpcUrl ?? 'https://fullnode.testnet.sui.io:443',
      mvr: { url: 'https://testnet.mvr.mystenlabs.com' },
    }),
    seller: Ed25519Keypair.fromSecretKey(sellerKey),
    buyer: Ed25519Keypair.fromSecretKey(buyerKey),
    post: assembly(file.post),
    buyerShip: assembly(file.buyerShip),
    items: { ore: parseItem(file.items.ore), parts: parseItem(file.items.parts) },
  }
}

// ---------------------------------------------------------------------------

export function loadContext(): Context {
  const base = NETWORK === 'testnet' ? testnetContext() : localContext()
  const stateDir = join(ROOT, 'scripts/.state')
  const statePath = join(stateDir, `${NETWORK}.json`)
  const state: State = existsSync(statePath)
    ? (JSON.parse(readFileSync(statePath, 'utf8')) as State)
    : {}
  return {
    ...base,
    state,
    saveState(update) {
      Object.assign(state, update)
      mkdirSync(stateDir, { recursive: true })
      writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`)
    },
  }
}

/** The published trade package's ID, or a hint to publish it first. */
export function requireTradePackage(ctx: Context): string {
  if (!ctx.state.tradePackage) {
    throw new Error('The trade package is not published yet. Run: pnpm publish:trade')
  }
  return ctx.state.tradePackage
}

// ---------------------------------------------------------------------------
// Sending transactions
// ---------------------------------------------------------------------------

/** A sent transaction's digest and the objects it created, by type. */
export interface Sent {
  digest: string
  /** Object IDs created by the transaction, keyed by their full Move type. */
  created: Record<string, string>
}

/** Sign and send `tx`, wait for it, and throw if it failed. */
export async function execute(
  ctx: Context,
  tx: Transaction,
  signer: Signer,
): Promise<Sent> {
  const result = await ctx.client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    include: { effects: true, objectTypes: true },
  })
  if (result.$kind === 'FailedTransaction') {
    throw new Error(
      `transaction failed: ${result.FailedTransaction.status.error?.message ?? 'unknown'}`,
    )
  }
  const { digest, effects, objectTypes } = result.Transaction
  await ctx.client.waitForTransaction({ digest })
  const created: Record<string, string> = {}
  for (const change of effects.changedObjects) {
    if (change.idOperation === 'Created') {
      created[objectTypes[change.objectId] ?? 'unknown'] = change.objectId
    }
  }
  return { digest, created }
}

/**
 * Send `tx` from `sender` with `sponsor` paying gas, as the game does for game
 * actions such as fuelling and bridging.
 */
export async function executeSponsored(
  ctx: Context,
  tx: Transaction,
  sender: Signer,
  sponsor: Signer,
): Promise<string> {
  tx.setSender(sender.toSuiAddress())
  tx.setGasOwner(sponsor.toSuiAddress())
  const bytes = await tx.build({ client: ctx.client })
  const signatures = await Promise.all(
    [sender, sponsor].map(async (s) => (await s.signTransaction(bytes)).signature),
  )
  const result = await ctx.client.executeTransaction({
    transaction: bytes,
    signatures,
    include: { effects: true },
  })
  if (result.$kind === 'FailedTransaction') {
    throw new Error(
      `transaction failed: ${result.FailedTransaction.status.error?.message ?? 'unknown'}`,
    )
  }
  await ctx.client.waitForTransaction({ digest: result.Transaction.digest })
  return result.Transaction.digest
}

/**
 * Simulate `tx` from `sender` and return the abort message, or `undefined` if
 * it would succeed. Nothing is sent.
 */
export async function simulateFailure(
  ctx: Context,
  tx: Transaction,
  sender: string,
): Promise<string | undefined> {
  tx.setSender(sender)
  const res = await ctx.client.simulateTransaction({ transaction: tx })
  if (res.$kind === 'FailedTransaction') {
    return res.FailedTransaction.status.error?.message ?? 'unknown error'
  }
  return undefined
}

/** Print a heading and a two-column table. */
export function report(title: string, rows: Record<string, string | bigint | number>): void {
  console.log(`\n${title}`)
  const width = Math.max(...Object.keys(rows).map((k) => k.length))
  for (const [k, v] of Object.entries(rows)) console.log(`  ${k.padEnd(width)}  ${v}`)
}

/** Throw with `message` unless `condition` holds. */
export function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`check failed: ${message}`)
  console.log(`  ok: ${message}`)
}
