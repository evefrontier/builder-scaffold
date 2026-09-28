---
name: smart-gate-rule
description: EVE Frontier Smart Gate jump rules in this repo. Use when a participant wants to write or change who may pass their gate, publish and set up their gate, hand in a corpse for a jump permit, or when a transaction in that flow failed.
---

# Smart Gate rule

The participant describes, in plain English, who may pass their gate. You turn that into
a Move rule, then walk them through three transactions on Sui testnet. The session is 30
minutes and most participants have never written Move — keep every reply short, concrete,
and one step at a time.

**The participant signs; you prepare.** You run the builder scripts, which write unsigned
transactions to `zklogin/pending/`. The participant signs each one in their own zkLogin
terminal. You never see their login: leave `zklogin/.env`, the JWT and the id_token
entirely to them, and never ask for them.

## The rule block

The only Move you edit is the **rule block** in
`move-contracts/smart_gate_extension/sources/corpse_gate_bounty.move`: the `check_rule`
function between the `YOUR RULE` and `END RULE` markers, plus any constants and
`#[error(code = 100+)]` errors you add inside those markers. `check_rule` returns to
allow a jump and aborts to deny it.

Everything outside the markers is fixed, because the scripts depend on it exactly: the
`collect_corpse_bounty` signature, the `XAuth` name, the `gate::issue_jump_permit<XAuth>`
call, the expiry overflow guard, and error codes 0–3.

Before writing a rule, read [RULES.md](RULES.md) and start from the closest shape there.

## Steps

Run each command from the repo root. After each transaction, tell the participant the exact
file path the script printed and wait for them to say they've signed it.

1. **Preflight.** `pnpm preflight`. Done when it prints `PREFLIGHT PASSED`. Anything else:
   show them the failing lines and the fix each one prints; kit problems (offline, frozen,
   no corpses) go to a facilitator.
2. **Write the rule.** Restate the rule back in one sentence, edit the rule block, then
   `sui move build --path move-contracts/smart_gate_extension -e testnet_stillness --lint`.
   Done when the build prints no warnings and no errors.
3. **Publish.** `pnpm publish-extension`, they sign it, then `pnpm record-publish`. Done when
   `record-publish` prints both IDs saved to `.env`.
4. **Set up the gate.** `pnpm setup-gate`, they sign it, then `pnpm tx-status`. This one
   transaction sets the bounty and points gate 1, gate 2 and the storage unit at their
   package. Done when `tx-status` prints ✅.
5. **Hand in a corpse.** `pnpm collect-corpse-bounty`, they sign it, then `pnpm check-permit`.
   Done when it prints `You hold a JumpPermit`. A failure with the participant's own error
   (code 100+) is their rule working — say so, and offer to change the rule or the input.
6. **Jump.** Tell them to jump through their gate in the game client.

When a transaction fails, read [DIAGNOSTICS.md](DIAGNOSTICS.md) and match the error name
`tx-status` reports.

## Changing the rule after publishing

A published package is immutable, and the gates trust its exact `XAuth` type. A new rule
means a new package: edit the rule block, then repeat steps 2–5. `setup-gate` points the
gates at the new package, replacing the old one.

## Guardrails

- The extension stays unfrozen. `freeze_extension_config` is permanent and would make the
  kit unusable for anyone after this participant, so never call it and never suggest it.
- A rule decides using only the item handed in, the character, and the clock — the inputs
  `check_rule` receives. For "charge a toll", the handed-in item *is* the toll. A SUI
  payment, an off-chain list or anything needing new function arguments is a bigger project
  than this session: say so in one sentence and point them to `docs/` for later.
- For questions outside this flow, give a one-line answer and bring them back to the next
  step.
