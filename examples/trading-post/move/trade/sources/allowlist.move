/// A builder-defined requirement: only characters on the owner's allowlist may
/// use the action.
///
/// The owner adds `on_allowlist_requirement(allowlist_id)` to an action. A
/// player's transaction satisfies it by calling `assert_on_allowlist` with that
/// allowlist and their own character.
module trade::allowlist;

use character::identity;
use core::entity::Entity;
use core::request::{Self, Request};
use core::requirement::{Self, Requirement};
use sui::bcs;
use sui::table::{Self, Table};

#[error(code = 0)]
const ENotYourCharacter: vector<u8> = b"The character does not belong to the sender";
#[error(code = 1)]
const EWrongAllowlist: vector<u8> = b"This is not the allowlist the requirement names";
#[error(code = 2)]
const ENotOnAllowlist: vector<u8> = b"The character is not on the allowlist";

/// The characters allowed to use the action. Shared, so any transaction can
/// read it.
public struct Allowlist has key {
    id: UID,
    members: Table<ID, bool>,
}

/// Lets its holder change one allowlist.
public struct AllowlistAdminCap has key, store {
    id: UID,
    allowlist_id: ID,
}

/// The requirement type. Its field says which allowlist to check.
public struct OnAllowlist has drop {
    allowlist_id: ID,
}

/// Create an empty allowlist and share it. Returns the cap that can change it.
public fun create(ctx: &mut TxContext): AllowlistAdminCap {
    let allowlist = Allowlist { id: object::new(ctx), members: table::new(ctx) };
    let cap = AllowlistAdminCap { id: object::new(ctx), allowlist_id: object::id(&allowlist) };
    transfer::share_object(allowlist);
    cap
}

/// Add a character to the allowlist. Adding a member twice does nothing.
public fun add(allowlist: &mut Allowlist, cap: &AllowlistAdminCap, character_id: ID) {
    assert!(cap.allowlist_id == object::id(allowlist), EWrongAllowlist);
    if (!allowlist.members.contains(character_id)) {
        allowlist.members.add(character_id, true);
    }
}

/// Remove a character from the allowlist. Removing a non-member does nothing.
public fun remove(allowlist: &mut Allowlist, cap: &AllowlistAdminCap, character_id: ID) {
    assert!(cap.allowlist_id == object::id(allowlist), EWrongAllowlist);
    if (allowlist.members.contains(character_id)) {
        allowlist.members.remove(character_id);
    }
}

/// Whether `character_id` is on the allowlist.
public fun contains(allowlist: &Allowlist, character_id: ID): bool {
    allowlist.members.contains(character_id)
}

/// Build the requirement, to add to an owner action.
public fun on_allowlist_requirement(allowlist_id: ID): Requirement {
    requirement::from_config(option::none(), OnAllowlist { allowlist_id })
}

/// Handler: satisfies the next requirement if the sender's character is on the
/// allowlist named in the requirement.
public fun assert_on_allowlist(
    req: &mut Request,
    allowlist: &Allowlist,
    character: &Entity,
    ctx: &TxContext,
) {
    let (requirement, frame) = req.take_next(internal::permit<OnAllowlist>());
    // The settings are the allowlist's ID, which BCS encodes as an address.
    let allowlist_id = bcs::new(requirement.data()).peel_address().to_id();
    // Allowlists are shared, so a player could pass in a list of their own.
    assert!(object::id(allowlist) == allowlist_id, EWrongAllowlist);
    // Characters are shared, so a player could pass in someone else's.
    assert!(identity::owner(character) == ctx.sender(), ENotYourCharacter);
    assert!(allowlist.members.contains(character.id()), ENotOnAllowlist);
    request::destroy_empty_frame(frame);
}

public fun allowlist_id(cap: &AllowlistAdminCap): ID { cap.allowlist_id }
