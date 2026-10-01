---
name: smart-gate-rule
description: EVE Frontier Smart Gate jump rules in this repo. Use when a participant wants to write or change who may pass their gate, publish and set up their gate, hand in a corpse for a jump permit, or when a transaction in that flow failed.
---

# Smart Gate rule

The participant describes, in plain English, who may pass their gate. You turn that into
a Move rule; then the team's **signer** sends three transactions on Sui testnet. The session
is 30 minutes and most participants have never written Move — keep every reply short,
concrete, and one step at a time.

## Roles

Participants work in teams of four that share one game account, one character and one pair
of gates. Each laptop is a **builder** or the team's one **signer**:

- A **builder** writes and builds a rule, then hands the finished rule block to the team.
  Their part ends at a clean build.
- The **signer** does the same, then publishes the team's chosen rule and signs every
  transaction. All transactions for the team run on the signer's laptop.

At the start, ask once: "Are you your team's signer?" Someone working alone is their own
signer. Remember the answer for the rest of the session.

Transactions stay on the signer's laptop because every teammate's `.env` holds the same
`ZKLOGIN_ADDRESS`: transactions built on two laptops at once compete for the same gas coins
and owner caps, and conflicting ones can lock the team's gas coin for the rest of the
epoch. So on a builder's laptop, the `pnpm` steps you run are `preflight` and
`resolve-ids` — the read-only ones.

**The signer signs; you prepare.** On the signer's laptop you run the builder scripts, which
write unsigned transactions to `zklogin/pending/`, and the signer signs each one in their
zkLogin terminal. You never see the login: leave `zklogin/.env`, the JWT and the id_token
entirely to them, and never ask for them. The account details are on the team's login slip,
which stays with the signer.

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

Run each command from the repo root.

### Everyone

1. **Preflight.** `pnpm preflight`. Done when it prints `PREFLIGHT PASSED`. Anything else:
   show the failing lines and the fix each one prints; kit problems (offline, frozen, no
   corpses) go to a facilitator. Note the build env on the `World:` line it prints first —
   `testnet_stillness` for Liminality.
2. **Write the rule.** Restate the rule back in one sentence, edit the rule block, then
   `sui move build --path move-contracts/smart_gate_extension -e <build env> --lint`.
   Done when the build prints no warnings and no errors.
3. **Hand it to the team.** Print the finished rule block — everything between the markers —
   so they can share it, and summarise the rule in one line for the team's pick.
   - **Builder:** done. Tell them their part is complete and to help their team choose.
     If they want to keep going, offer to try a variation and rebuild.
   - **Signer:** continue once the team has picked a rule.

### Signer only

4. **Load the team's rule.** If the pick isn't the rule already in the block, take the
   teammate's pasted block (or their description) and put it between the markers, then
   rebuild as in step 2. Done when the build is clean.
5. **Log in.** The signer runs `cd zklogin && pnpm zklogin` in a second terminal with the
   account on the login slip. Done when it prints `Ready to execute transactions`.

After each transaction step, tell the signer the exact file path the script printed and
wait for them to say they've signed it.

6. **Publish.** `pnpm publish-extension`, they sign it, then `pnpm record-publish`. Done when
   `record-publish` prints both IDs saved to `.env`.
7. **Set up the gate.** `pnpm setup-gate`, they sign it, then `pnpm tx-status`. This one
   transaction sets the bounty and points gate 1, gate 2 and the storage unit at the
   team's package. Done when `tx-status` prints ✅.
8. **Hand in a corpse.** `pnpm collect-corpse-bounty`, they sign it, then `pnpm check-permit`.
   Done when it prints `You hold a JumpPermit`. A failure with the team's own error
   (code 100+) is their rule working — say so, and offer to change the rule or the input.
   The corpses are shared by the team; `pnpm preflight` shows how many are left.
9. **Jump.** The team's ship jumps through their gate in the game client.

When a transaction fails, read [DIAGNOSTICS.md](DIAGNOSTICS.md) and match the error name
`tx-status` or the zkLogin terminal reports.

## Changing the rule after publishing

A published package is immutable, and the gates trust its exact `XAuth` type. A new rule
means a new package: the team agrees the change, then the signer repeats steps 4 and 6–8.
`setup-gate` points the gates at the new package, replacing the old one.

## Guardrails

- The extension stays unfrozen. `freeze_extension_config` is permanent and would make the
  kit unusable for anyone after this team, so never call it and never suggest it.
- A rule decides using only the item handed in, the character, and the clock — the inputs
  `check_rule` receives. For "charge a toll", the handed-in item *is* the toll. A SUI
  payment, an off-chain list or anything needing new function arguments is a bigger project
  than this session: say so in one sentence and point them to `docs/` for later.
- For questions outside this flow, give a one-line answer and bring them back to the next
  step.
