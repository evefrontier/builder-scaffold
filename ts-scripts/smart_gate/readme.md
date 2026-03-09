# Smart Gate example

After publishing [move-contracts/smart_gate](../../move-contracts/smart_gate/), run these scripts from the repo root in order:

```bash
# 1. Configure extension rules (tribe config + bounty config)
pnpm configure-rules

# 2. Authorize the extension on gates and storage unit
pnpm authorise-gate
pnpm authorise-storage-unit

# 3. Issue a jump permit (tribe-based) — typically in a dApp
pnpm issue-tribe-jump-permit

# 4. Jump using the permit — typically in the game UI
pnpm jump-with-permit

# 5. Collect corpse bounty for a jump permit
pnpm collect-corpse-bounty
```
