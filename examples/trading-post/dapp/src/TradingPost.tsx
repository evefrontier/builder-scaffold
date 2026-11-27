import { useQuery, useQueryClient } from '@tanstack/react-query'
import { EXAMPLES, type Example } from 'frontier-trade-scripts/rules'
import {
  buildTrade,
  EVE,
  eveBalance,
  findDockedShip,
  hasOwnerAction,
  itemBalances,
  type OwnedAssembly,
  ownerActionNames,
  prepareShip,
  SHIP_DEPOSIT,
  SHIP_WITHDRAW,
  type TradeRules,
} from 'frontier-trade-scripts/world'
import { useState } from 'react'
import { client, config } from './config'
import type { AppSigner } from './signer'

const { world, post, items } = config

function eve(amount: bigint): string {
  return `${(Number(amount) / Number(EVE)).toLocaleString()} EVE`
}

function describe(rules: TradeRules): string[] {
  const lines: string[] = []
  if (rules.allowlist) lines.push('Only characters on the seller’s allowlist')
  if (rules.payment !== undefined) lines.push(`Pay ${eve(rules.payment)}`)
  if (rules.give) lines.push(`Give ${rules.give.quantity} ore`)
  lines.push(`Receive ${rules.receive.quantity} part${rules.receive.quantity === 1n ? '' : 's'}`)
  return lines
}

/** The trade offers this dApp knows, with their rules, if the seller has enabled them. */
function offers(enabled: string[]): { example: Example; rules: TradeRules }[] {
  const result = []
  for (const example of EXAMPLES) {
    if (!enabled.includes(example.action)) continue
    try {
      const rules = example.rules({ items, inventory: post.inventory, seller: config.seller, state: config.state })
      result.push({ example, rules })
    } catch {
      // Not set up yet, for example no allowlist.
    }
  }
  return result
}

export function TradingPost({ signer }: { signer: AppSigner }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<{ ok: boolean; text: string }>()
  const [busy, setBusy] = useState(false)

  const ship = useQuery({
    queryKey: ['ship', signer.address],
    queryFn: async () =>
      (await findDockedShip(client, world, signer.address, post.entity, config.shipInventory)) ?? null,
  })

  const view = useQuery({
    queryKey: ['view', signer.address, ship.data?.entity],
    enabled: ship.data !== undefined,
    queryFn: async () => {
      const types = [items.ore, items.parts]
      const s: OwnedAssembly | null = ship.data ?? null
      const [postStock, actions, eveOwned, shipCargo, ready] = await Promise.all([
        itemBalances(client, world, signer.address, post.entity, post.inventory, types),
        ownerActionNames(client, world, signer.address, post.entity),
        eveBalance(client, world, signer.address),
        s ? itemBalances(client, world, signer.address, s.entity, s.inventory, types) : null,
        s
          ? Promise.all([
              hasOwnerAction(client, world, signer.address, s.entity, SHIP_WITHDRAW),
              hasOwnerAction(client, world, signer.address, s.entity, SHIP_DEPOSIT),
            ]).then(([w, d]) => w && d)
          : false,
      ])
      return { postStock, actions, eveOwned, shipCargo, ready }
    },
  })

  /** Simulate, then sign and send. `label` names the step in the status line. */
  async function run(label: string, build: () => Promise<import('@mysten/sui/transactions').Transaction | undefined>) {
    setBusy(true)
    setStatus(undefined)
    try {
      const tx = await build()
      if (!tx) return
      // Simulate first, so a refused trade shows its reason without asking the wallet to sign.
      tx.setSender(signer.address)
      const dryRun = await client.simulateTransaction({ transaction: tx })
      if (dryRun.$kind === 'FailedTransaction') {
        throw new Error(dryRun.FailedTransaction.status.error?.message ?? 'the transaction would fail')
      }
      const digest = await signer.run((await build())!)
      setStatus({ ok: true, text: `${label} succeeded: ${digest}` })
    } catch (e) {
      // "MoveAbort in 8th command, 'ENotOnAllowlist': The character ..., in '0x...'"
      const reason = (e as Error).message.replace(/^MoveAbort in \d+\w+ command, /, '').replace(/, in '.*$/, '')
      setStatus({ ok: false, text: `${label} refused: ${reason}` })
    } finally {
      setBusy(false)
      await queryClient.invalidateQueries()
    }
  }

  if (ship.isLoading) return <section>Looking for your ship…</section>
  if (ship.error) return <section className="bad">{String(ship.error)}</section>
  if (!ship.data) {
    return (
      <section>
        No ship of yours is docked at this trading post. Dock a ship there in the game, then reload.
        <div className="muted mono">{signer.address}</div>
      </section>
    )
  }
  const myShip = ship.data
  const v = view.data

  return (
    <>
      <div className="grid">
        <section>
          <h2>Trading post</h2>
          <div className="row"><span>Parts in stock</span><b>{v?.postStock[1]?.toString() ?? '…'}</b></div>
          <div className="row"><span>Ore received</span><b>{v?.postStock[0]?.toString() ?? '…'}</b></div>
          <div className="muted mono">{post.entity}</div>
        </section>
        <section>
          <h2>Your ship</h2>
          <div className="row"><span>Ore</span><b>{v?.shipCargo?.[0]?.toString() ?? '…'}</b></div>
          <div className="row"><span>Parts</span><b>{v?.shipCargo?.[1]?.toString() ?? '…'}</b></div>
          <div className="row"><span>EVE</span><b>{v ? eve(v.eveOwned) : '…'}</b></div>
          <div className="muted mono">{myShip.entity}</div>
        </section>
      </div>

      {v && !v.ready && (
        <section>
          <h2>Prepare your ship</h2>
          <p className="muted">
            Trades move cargo out of and into your ship, so it needs two owner actions:
            {' '}<code>{SHIP_WITHDRAW}</code> and <code>{SHIP_DEPOSIT}</code>. You enable them once.
          </p>
          <button
            disabled={busy}
            onClick={() => run('Preparing the ship', () => prepareShip(client, world, signer.address, myShip))}
          >
            Enable cargo actions
          </button>
        </section>
      )}

      <section>
        <h2>Offers</h2>
        {v && offers(v.actions).length === 0 && <p className="muted">The seller has not enabled any offers yet.</p>}
        <div className="grid">
          {v &&
            offers(v.actions).map(({ example, rules }) => (
              <div className="offer" key={example.action}>
                <h3>{example.title}</h3>
                <ul className="muted">
                  {describe(rules).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <button
                  disabled={busy || !v.ready}
                  onClick={() =>
                    run(example.title, () =>
                      buildTrade(client, world, signer.address, {
                        tradePackage: config.state.tradePackage ?? '',
                        post: post.entity,
                        action: example.action,
                        rules,
                        ship: myShip,
                      }),
                    )
                  }
                >
                  Trade
                </button>
              </div>
            ))}
        </div>
      </section>

      {status && (
        <section className={status.ok ? 'ok' : 'bad'}>
          <span className="mono">{status.text}</span>
        </section>
      )}
    </>
  )
}
