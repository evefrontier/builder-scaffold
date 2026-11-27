/**
 * Start or stop the local network. Runs with plain Node (no install needed), so
 * it works the same in any shell on Windows, macOS and Linux:
 *
 *   node localnet/localnet.ts start    (pnpm localnet:start)
 *   node localnet/localnet.ts stop     (pnpm localnet:stop)
 *   node localnet/localnet.ts move-test (pnpm move:test)
 *
 * The network runs from a world-contracts snapshot image, which has the world
 * already deployed. The image is set in world.env, and world.local.env (not
 * committed) can override it, for example with an image you built yourself.
 *
 * When it is ready:
 *   - RPC is at http://127.0.0.1:9000 (faucet on 9123, GraphQL on 9125)
 *   - vendor/localnet/ has world.json and accounts.json from the image
 *   - vendor/world-contracts/contracts/ has the world's Move sources
 *   - vendor/world-contracts/Pub.localnet.toml lists the deployed packages,
 *     for `sui client test-publish`
 *   - vendor/world-sdk.tgz is the world SDK, for `pnpm install`
 *
 * The snapshot image does not yet include the Move sources or the SDK, so they
 * come from the image's world-contracts commit (or WORLD_CONTRACTS_SOURCES).
 *
 * The test accounts' private keys are public. Never use them anywhere else.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const VENDOR = join(ROOT, 'vendor')
const COMPOSE = ['compose', '-f', join(ROOT, 'localnet/compose.yaml')]
const CONTAINER = 'frontier-localnet'
const REPO = 'https://github.com/evefrontier/world-contracts.git'

function log(message: string): void {
  console.log(`[localnet] ${message}`)
}

function fail(message: string): never {
  console.error(`[localnet] ${message}`)
  process.exit(1)
}

/** Run a command with its output shown. Throws if it fails. */
function run(cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env })
  if (res.error) fail(`could not run ${cmd}: ${res.error.message}`)
  if (res.status !== 0) fail(`${cmd} ${args.slice(0, 3).join(' ')} ... exited with ${res.status}`)
}

/** Run a command and return its output, or undefined if it fails. */
function read(cmd: string, args: string[]): string | undefined {
  const res = spawnSync(cmd, args, { encoding: 'utf8' })
  return res.status === 0 ? res.stdout.trim() : undefined
}

/** KEY=VALUE lines from world.env, overridden by world.local.env if present. */
function loadConfig(): Record<string, string> {
  const config: Record<string, string> = {}
  for (const file of ['world.env', 'world.local.env']) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (match) config[match[1]] = match[2]
    }
  }
  return config
}

/** Files the containers write are owned by root on Linux; hand them back. */
function chownArgs(paths: string): string {
  const uid = process.getuid?.()
  const gid = process.getgid?.()
  return uid === undefined || gid === undefined ? 'true' : `chown -R ${uid}:${gid} ${paths}`
}

function stop(): void {
  run('docker', [...COMPOSE, 'down', '--volumes', '--remove-orphans'], {
    ...process.env,
    WORLD_IMAGE: 'unused',
  })
  // A container left by an older version of this example, started without compose.
  spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore' })
  log('stopped')
}

function start(): void {
  if (read('docker', ['version', '--format', '{{.Server.Version}}']) === undefined) {
    fail('Docker is not running. Start Docker Desktop (or the Docker service) and try again.')
  }
  if (read('docker', ['ps', '-aq', '--filter', `name=^${CONTAINER}$`])) {
    fail(`A container named ${CONTAINER} already exists. Run: pnpm localnet:stop`)
  }

  const config = loadConfig()
  const image = config.WORLD_IMAGE
  if (!image) fail('Set WORLD_IMAGE in world.env')
  const sources = config.WORLD_CONTRACTS_SOURCES
    ? resolve(ROOT, config.WORLD_CONTRACTS_SOURCES)
    : undefined

  log(`Image ${image}`)
  if (read('docker', ['image', 'inspect', image]) === undefined) {
    log('Pulling the image (about 2 GB, first time only) ...')
    run('docker', ['pull', image])
  }
  const revision = read('docker', [
    'image',
    'inspect',
    image,
    '--format',
    '{{index .Config.Labels "org.opencontainers.image.revision"}}',
  ])
  if (sources) {
    if (!existsSync(join(sources, 'contracts'))) {
      fail(`WORLD_CONTRACTS_SOURCES: ${sources} is not a world-contracts checkout`)
    }
    log(`Move sources and SDK from ${sources} (read-only)`)
  } else if (revision) {
    log(`world-contracts commit ${revision}`)
  } else {
    fail(
      'The image has no world-contracts commit label, so its Move sources and SDK ' +
        'cannot be found. Set WORLD_CONTRACTS_SOURCES in world.local.env to the ' +
        'world-contracts checkout the image was built from.',
    )
  }

  // Fetch the Move sources and pack the SDK inside a container, so Git, line
  // endings and the host's file system don't matter. The checkout given in
  // WORLD_CONTRACTS_SOURCES is mounted read-only and copied, never changed.
  log('Preparing the Move sources and the world SDK ...')
  mkdirSync(VENDOR, { recursive: true })
  const prepare = [
    'set -e',
    'rm -rf /scaffold/vendor/localnet /scaffold/vendor/world-contracts /scaffold/vendor/world-sdk.tgz',
    'mkdir -p /scaffold/vendor/localnet /scaffold/vendor/world-contracts /tmp/wc',
    sources
      ? 'cd /src && tar --exclude=./node_modules --exclude=./.git -cf - . | tar -xf - -C /tmp/wc'
      : `git clone --quiet ${REPO} /tmp/wc && git -C /tmp/wc checkout --quiet ${revision}`,
    'cp -r /tmp/wc/contracts /scaffold/vendor/world-contracts/contracts',
    'cd /tmp/wc && pnpm install --frozen-lockfile --silent',
    'cd /tmp/wc/sdk/world-sdk && pnpm run --silent build >/dev/null',
    'pnpm pack --out /scaffold/vendor/world-sdk.tgz >/dev/null',
    chownArgs('/scaffold/vendor'),
  ].join(' && ')
  run('docker', [
    'run',
    '--rm',
    '--entrypoint',
    'sh',
    '-v',
    `${ROOT}:/scaffold`,
    ...(sources ? ['-v', `${sources}:/src:ro`] : []),
    image,
    '-c',
    prepare,
  ])

  log('Starting the network ...')
  run('docker', [...COMPOSE, 'up', '--detach', '--wait'], { ...process.env, WORLD_IMAGE: image })
  run('docker', ['exec', CONTAINER, 'sh', '-c', chownArgs('/data/deployment')])

  const worldPath = join(VENDOR, 'localnet/world.json')
  if (!existsSync(worldPath)) fail(`The image did not write ${worldPath}`)
  writePubfile(worldPath)

  log('Ready. RPC http://127.0.0.1:9000')
  log('World manifest: vendor/localnet/world.json')
}

/**
 * Write the "pubfile" that `sui client test-publish` reads to find the world
 * packages on this chain. Paths are as the container sees them (/scaffold).
 */
function writePubfile(worldPath: string): void {
  const world = JSON.parse(readFileSync(worldPath, 'utf8')) as {
    /** For example "Base58: E84M...\nHex: c2f6ca6b". */
    chainId: string
    packages: Record<
      string,
      { originalId: string; publishedAt: string; upgradeCap: string; version: number }
    >
  }
  const chainId = /Hex:\s*([0-9a-f]+)/i.exec(world.chainId)?.[1]
  const toolchain = /sui (\d+\.\d+\.\d+)/.exec(
    read('docker', ['exec', CONTAINER, 'sui', '--version']) ?? '',
  )?.[1]
  if (!chainId || !toolchain) fail('Could not read the chain ID or the Sui version')

  const lines = [
    '# Written by localnet/localnet.ts from vendor/localnet/world.json.',
    '',
    'build-env = "testnet"',
    `chain-id = "${chainId}"`,
  ]
  for (const [name, pkg] of Object.entries(world.packages)) {
    lines.push(
      '',
      '[[published]]',
      `source = { local = "/scaffold/vendor/world-contracts/contracts/${name}" }`,
      `published-at = "${pkg.publishedAt}"`,
      `original-id = "${pkg.originalId}"`,
      `version = ${pkg.version}`,
      `toolchain-version = "${toolchain}"`,
      'build-config = { flavor = "sui", edition = "2024" }',
      `upgrade-capability = "${pkg.upgradeCap}"`,
    )
  }
  writeFileSync(join(VENDOR, 'world-contracts/Pub.localnet.toml'), `${lines.join('\n')}\n`)
}

/**
 * Run the trade package's Move unit tests with the Sui CLI inside the localnet
 * container, so you don't need the Sui CLI on your machine and its version
 * matches the node. Extra arguments go to `sui move test`.
 */
function moveTest(args: string[]): void {
  if (!read('docker', ['ps', '-q', '--filter', `name=^${CONTAINER}$`])) {
    fail('The local network is not running. Run: pnpm localnet:start')
  }
  // The container runs as root; on Linux, hand the build output back.
  const res = spawnSync(
    'docker',
    [
      'exec',
      '-w',
      '/scaffold/move/trade',
      CONTAINER,
      'sh',
      '-c',
      'sui move test --build-env testnet "$@"; status=$?; ' +
        `${chownArgs('/scaffold/move/trade/build')}; exit $status`,
      'sh',
      ...args,
    ],
    { stdio: 'inherit' },
  )
  process.exit(res.status ?? 1)
}

const command = process.argv[2]
if (command === 'start') start()
else if (command === 'stop') stop()
else if (command === 'move-test') moveTest(process.argv.slice(3))
else fail('Usage: node localnet/localnet.ts start|stop|move-test')
