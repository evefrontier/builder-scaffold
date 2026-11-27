/**
 * Run every step in order on a fresh localnet and stop at the first failure.
 * Useful to check the scaffold still works after changing world-contracts.
 */
import { execFileSync } from 'node:child_process'

const steps = [
  'game:setup',
  'publish:trade',
  '1:setup',
  '1:trade',
  '2:setup',
  '2:trade',
  '3:setup',
  '3:trade',
  '4:setup',
  '4:trade',
]

for (const step of steps) {
  console.log(`\n=== pnpm ${step} ===`)
  // pnpm is a .cmd script on Windows, which Node only runs through a shell.
  execFileSync('pnpm', ['-s', step], { stdio: 'inherit', shell: process.platform === 'win32' })
}
console.log('\nAll steps passed.')
