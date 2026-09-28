# Smart Gate example

Change who can pass your gate. Run from the repo root, signing each transaction in the
[zkLogin tool](../../zklogin/readme.md) after its build step:

```bash
# 1. Publish your extension package
pnpm publish-extension     # sign, then:
pnpm record-publish

# 2. Set the bounty and authorize your extension on gate 1, gate 2 and the storage unit
pnpm setup-gate            # sign, then:
pnpm tx-status

# 3. Hand in a corpse for a JumpPermit — your rule decides
pnpm collect-corpse-bounty # sign, then:
pnpm check-permit

# 4. Jump through your gate in the game
```

Your rule is `check_rule` in
[corpse_gate_bounty.move](../../move-contracts/smart_gate_extension/sources/corpse_gate_bounty.move),
between the `YOUR RULE` markers. After changing it, repeat all three steps.

Fallback rule with no inventory: set `RULE=tribe` and `TRIBE_ID` in `.env`, run
`pnpm setup-gate`, then `pnpm issue-tribe-jump-permit` instead of step 3.
