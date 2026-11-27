/**
 * Who signs: the connected wallet (EVE Vault, or any Sui wallet), or on
 * localnet one of the public test accounts.
 */
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { useMemo } from 'react'
import { client, config } from './config'

export interface AppSigner {
  address: string
  label: string
  /** Build `tx` against our client, sign it, send it, and wait for it. Returns the digest. */
  run(tx: Transaction): Promise<string>
}

/** Resolve MVR names and gas with our client, so any wallet can sign the result. */
async function resolve(tx: Transaction, sender: string): Promise<Uint8Array> {
  tx.setSenderIfNotSet(sender)
  return tx.build({ client })
}

async function waitFor(digest: string): Promise<string> {
  const result = await client.waitForTransaction({ digest, include: { effects: true } })
  if (result.$kind === 'FailedTransaction') {
    throw new Error(result.FailedTransaction.status.error?.message ?? 'transaction failed')
  }
  return digest
}

export function useWalletSigner(): AppSigner | undefined {
  const account = useCurrentAccount()
  const { mutateAsync } = useSignAndExecuteTransaction()
  return useMemo(() => {
    if (!account) return undefined
    return {
      address: account.address,
      label: `Wallet ${account.address.slice(0, 10)}…`,
      async run(tx) {
        const bytes = await resolve(tx, account.address)
        const { digest } = await mutateAsync({
          transaction: Transaction.from(bytes),
          chain: `sui:${config.network}`,
        })
        return waitFor(digest)
      },
    }
  }, [account, mutateAsync])
}

export function testSigner(name: string, key: string): AppSigner {
  const keypair = Ed25519Keypair.fromSecretKey(key)
  const address = keypair.toSuiAddress()
  return {
    address,
    label: name,
    async run(tx) {
      const bytes = await resolve(tx, address)
      const { signature } = await keypair.signTransaction(bytes)
      const result = await client.executeTransaction({ transaction: bytes, signatures: [signature] })
      if (result.$kind === 'FailedTransaction') {
        throw new Error(result.FailedTransaction.status.error?.message ?? 'transaction failed')
      }
      return waitFor(result.Transaction.digest)
    },
  }
}
