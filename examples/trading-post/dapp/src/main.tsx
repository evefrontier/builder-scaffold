import '@mysten/dapp-kit/dist/index.css'
import './main.css'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { config } from './config'

const { networkConfig } = createNetworkConfig({
  [config.network]: { url: config.rpcUrl, network: config.network },
})
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* The wallet connection uses this provider. Reads and transaction building
          use the client in config.ts, which resolves the world's MVR names. */}
      <SuiClientProvider networks={networkConfig} defaultNetwork={config.network}>
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
)
