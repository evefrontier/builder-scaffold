import { ConnectButton } from '@mysten/dapp-kit'
import { useState } from 'react'
import { config } from './config'
import { type AppSigner, testSigner, useWalletSigner } from './signer'
import { TradingPost } from './TradingPost'

export function App() {
  const wallet = useWalletSigner()
  const [choice, setChoice] = useState(config.testAccounts.length ? '0' : 'wallet')
  const signer: AppSigner | undefined =
    choice === 'wallet'
      ? wallet
      : testSigner(config.testAccounts[Number(choice)].name, config.testAccounts[Number(choice)].key)

  return (
    <main>
      <header>
        <h1>Trading Post</h1>
        <div className="signer">
          <select value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Signer">
            <option value="wallet">Wallet</option>
            {config.testAccounts.map((a, i) => (
              <option key={a.name} value={String(i)}>
                Test account: {a.name}
              </option>
            ))}
          </select>
          {choice === 'wallet' && <ConnectButton />}
        </div>
      </header>
      {signer ? (
        <TradingPost key={signer.address} signer={signer} />
      ) : (
        <section>Connect a wallet that owns a character with a ship docked at the trading post.</section>
      )}
    </main>
  )
}
