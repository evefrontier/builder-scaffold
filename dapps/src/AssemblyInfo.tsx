import { useSmartObject } from "@evefrontier/dapp-kit";
import authoriseGate from "./functions/authorise-gate";
import authoriseSSU from "./functions/authorise-ssu";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";

export function AssemblyInfo() {
  /**
   * STEP 4 — useSmartObject() (@evefrontier/dapp-kit) uses VITE_ITEM_ID / URL params and the kit's GraphQL. Returns assembly, character, loading, error, refetch, optional setSelectedObjectId. Render name, type, state, id, owner character.
   */
  const { assembly, character, loading, error } = useSmartObject();
  const dappKit = useDAppKit();
  const currentAccount = useCurrentAccount();

  if (loading) return <div>Loading assembly...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!assembly) return <div>No assembly found</div>;
  if (!character) return <div>No character found</div>;

  // @ts-ignore
  const ownerCapId = assembly._raw.contents.json.owner_cap_id;

  return (
    <>
      <div>
        <p>Name: {assembly.name || assembly.typeDetails?.name}</p>
        <p>Type: {assembly.type}</p>
        <p>State: {assembly.state}</p>
        <p>ID: {assembly.id}</p>
        {character && <p>Owner: {character.name}</p>}
      </div>

      <button
        onClick={async () => {
          if (!currentAccount) throw new Error("No account found");

          console.log("assemblyId", assembly.id);
          console.log("characterId", character.id);
          console.log("ownerCapId", ownerCapId);

          // const tx = authoriseSSU(assembly.id, character.id, ownerCapId);
          const tx = authoriseGate(assembly.id, character.id, ownerCapId);
          // const tx = new Transaction();
          tx.setSender(currentAccount?.address);

          tx.build();

          const result = await dappKit.signAndExecuteTransaction({
            transaction: tx,
          });

          console.log(result);
        }}
      >
        Authorise Gate
      </button>
    </>
  );
}
