/**
 * @evefrontier/world-sdk imports node:fs, node:path and node:url for
 * loadWorldConfig and getWorldConfig, which read files. The dApp never calls
 * them (vite.config.ts passes the config in), so the browser build swaps those
 * modules for these stubs. Path helpers run when the SDK loads, so they return
 * harmless values; reading a file throws.
 */
export function readFileSync(): never {
  throw new Error('Reading files is not available in the browser')
}
export const fileURLToPath = (url: string | URL): string => String(url)
export const dirname = (path: string): string => path
export const join = (...parts: string[]): string => parts.join('/')
export default {}
