/**
 * Publish the trade Move package (move/trade) as the seller and save its ID.
 *
 * It prints the network first. On localnet the Sui CLI inside the localnet
 * container publishes it, so its version matches the node and your own Sui
 * CLI's settings are not used. With --network testnet, your own Sui CLI
 * publishes it with its active address, and only if its active environment is
 * testnet.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadContext, report, ROOT } from './lib/context.js'

const ctx = loadContext()

interface PublishOutput {
  objectChanges?: { type: string; packageId?: string }[]
  changed_objects?: unknown
}

function packageIdFrom(output: string): string {
  // The CLI may print build lines before the JSON.
  const json = JSON.parse(output.slice(output.indexOf('{'))) as PublishOutput
  const published = json.objectChanges?.find((c) => c.type === 'published')
  if (!published?.packageId) throw new Error(`no published package in:\n${output}`)
  return published.packageId
}

console.log(`Publishing to ${ctx.network}`)

let packageId: string
if (ctx.network === 'localnet') {
  // test-publish looks up the world packages in a "pubfile" that
  // `pnpm localnet:start` writes, and adds this package to it. Start from a
  // fresh copy each time, so publishing again gives a new package instead of
  // failing.
  const stateDir = join(ROOT, 'scripts/.state')
  mkdirSync(stateDir, { recursive: true })
  copyFileSync(
    join(ROOT, 'vendor/world-contracts/Pub.localnet.toml'),
    join(stateDir, 'Pub.localnet.toml'),
  )
  const seller = ctx.seller.toSuiAddress()
  const uid = process.getuid?.()
  const gid = process.getgid?.()
  const chown = uid === undefined || gid === undefined ? 'true' : `chown -R ${uid}:${gid}`
  const output = execFileSync(
    'docker',
    [
      'exec',
      '-w',
      '/scaffold/move/trade',
      'frontier-localnet',
      'sh',
      '-c',
      `sui client switch --address ${seller} >/dev/null && ` +
        'sui client test-publish --build-env testnet ' +
        '--pubfile-path /scaffold/scripts/.state/Pub.localnet.toml --json; ' +
        'status=$?; sui client switch --address ADMIN >/dev/null; ' +
        // The container runs as root; on Linux, hand the build output back.
        `${chown} /scaffold/move/trade/build /scaffold/scripts/.state; exit $status`,
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  packageId = packageIdFrom(output)
} else {
  // Your own Sui CLI publishes to its active environment, whatever that is.
  // Stop unless it is the network the scripts use.
  const env = execFileSync('sui', ['client', 'active-env'], { encoding: 'utf8' }).trim()
  const address = execFileSync('sui', ['client', 'active-address'], { encoding: 'utf8' }).trim()
  if (env !== ctx.network) {
    throw new Error(
      `Your Sui CLI's active environment is "${env}", not "${ctx.network}". ` +
        `Switch with: sui client switch --env ${ctx.network}`,
    )
  }
  console.log(`  Sui CLI environment  ${env}`)
  console.log(`  publisher address    ${address}`)
  const output = execFileSync('sui', ['client', 'publish', '--json'], {
    cwd: join(ROOT, 'move/trade'),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  packageId = packageIdFrom(output)
}

ctx.saveState({ tradePackage: packageId, allowlist: undefined, allowlistCap: undefined })
report('Published the trade package', { 'package ID': packageId })
