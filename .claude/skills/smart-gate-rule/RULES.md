# Rule catalogue

Every shape below compiles and lints clean against the live world. Each replaces the
`check_rule` function (and adds constants/errors) between the `YOUR RULE` markers. Start
from the closest one and change the constants — that's usually all a rule needs.

Inputs `check_rule` receives:

| Input | Useful calls |
|---|---|
| `bounty_cfg` | `bounty_cfg.bounty_type_id` — the item type set by `pnpm setup-gate` (from `CORPSE_TYPE_ID`) |
| `item` | `item.type_id()`, `item.quantity()` (u32) |
| `character` | `character.tribe()` (u32), `character.key().item_id()` (u64, the character item ID) |
| `clock` | `clock.timestamp_ms()` (u64, UTC) |

Conventions:

- A parameter the rule uses loses its leading underscore (`_character` → `character`); one
  it doesn't use keeps it, or the linter warns.
- Bind a vector constant to a local before calling a method on it
  (`let allies = ALLIED_TRIBES;`), or the linter warns about an implicit copy.
- Number your own errors from 100 up. Each denial reason gets its own error, with a
  message a player would understand — it's what they see when they're refused.
- `item.quantity()` is the number handed in, set by `CORPSE_QUANTITY` in `.env`. A rule
  that needs more than one means raising `CORPSE_QUANTITY` too.

## 1. Corpse bounty (the default)

Hand in one corpse of the right type to pass.

```move
fun check_rule(bounty_cfg: &BountyConfig, item: &Item, _character: &Character, _clock: &Clock) {
    assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
}
```

## 2. Bulk bounty

"Pay three corpses to pass." Set `CORPSE_QUANTITY=3` in `.env`.

```move
#[error(code = 100)]
const ENotEnoughCorpses: vector<u8> = b"Hand in more corpses to pass";

const MIN_CORPSES: u32 = 3;

fun check_rule(bounty_cfg: &BountyConfig, item: &Item, _character: &Character, _clock: &Clock) {
    assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
    assert!(item.quantity() >= MIN_CORPSES, ENotEnoughCorpses);
}
```

## 3. Allies only

"Only my allies may pass." Tribe IDs are numbers; the team's own is on its kit card.

```move
#[error(code = 100)]
const ENotAnAlly: vector<u8> = b"Only allied tribes may use this gate";

const ALLIED_TRIBES: vector<u32> = vector[1000167, 1000168];

fun check_rule(bounty_cfg: &BountyConfig, item: &Item, character: &Character, _clock: &Clock) {
    assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
    let allies = ALLIED_TRIBES;
    assert!(allies.contains(&character.tribe()), ENotAnAlly);
}
```

## 4. Opening hours

"The gate is only open during the day." Hours are UTC.

```move
#[error(code = 100)]
const EGateClosed: vector<u8> = b"The gate is closed at this hour";

const OPEN_HOUR_UTC: u64 = 8;
const CLOSE_HOUR_UTC: u64 = 20;

fun check_rule(bounty_cfg: &BountyConfig, item: &Item, _character: &Character, clock: &Clock) {
    assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
    let hour = (clock.timestamp_ms() / 3_600_000) % 24;
    assert!(hour >= OPEN_HOUR_UTC && hour < CLOSE_HOUR_UTC, EGateClosed);
}
```

## 5. Ban list

"Let everyone through except these characters." Uses character item IDs.

```move
#[error(code = 100)]
const EBanned: vector<u8> = b"You are banned from this gate";

const BANNED_CHARACTERS: vector<u64> = vector[2112000001, 2112000002];

fun check_rule(bounty_cfg: &BountyConfig, item: &Item, character: &Character, _clock: &Clock) {
    assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
    let banned = BANNED_CHARACTERS;
    assert!(!banned.contains(&character.key().item_id()), EBanned);
}
```

## 6. Allies free, everyone else pays

"My allies pass with anything; everyone else pays the bounty." A composite — the model for
combining any two shapes.

```move
const ALLIED_TRIBES: vector<u32> = vector[1000167];

fun check_rule(bounty_cfg: &BountyConfig, item: &Item, character: &Character, _clock: &Clock) {
    // Allies pass with any item; everyone else pays the bounty.
    let allies = ALLIED_TRIBES;
    if (!allies.contains(&character.tribe())) {
        assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
    }
}
```
