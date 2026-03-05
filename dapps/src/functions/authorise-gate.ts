import { Transaction } from "@mysten/sui/transactions";
import { MODULES as WORLD_MODULE } from "../../../ts-scripts/utils/config";
import { MODULE as GATE_MODULE } from "../../../ts-scripts/smart_gate/modules";

const builderPackageId =
  "0xcbbe0c566c7a344aedba5ce1b75f4b0e279f736ae51db85962930192012c6989";

const PACKAGE_ID =
  "0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543";

function authoriseGate(
  characterId: string,
  gateId: string,
  gateOwnerCapId: string,
) {
  const tx = new Transaction();

  const [gateOwnerCap, returnReceipt] = tx.moveCall({
    target: `${PACKAGE_ID}::${WORLD_MODULE.CHARACTER}::borrow_owner_cap`,
    typeArguments: [`${PACKAGE_ID}::${WORLD_MODULE.GATE}::Gate`],
    arguments: [tx.object(characterId), tx.object(gateOwnerCapId)],
  });

  const authType = `${builderPackageId}::${GATE_MODULE.CONFIG}::XAuth`;

  tx.moveCall({
    target: `${PACKAGE_ID}::${WORLD_MODULE.GATE}::authorize_extension`,
    typeArguments: [authType],
    arguments: [tx.object(gateId), gateOwnerCap],
  });

  tx.moveCall({
    target: `${PACKAGE_ID}::${WORLD_MODULE.CHARACTER}::return_owner_cap`,
    typeArguments: [`${PACKAGE_ID}::${WORLD_MODULE.GATE}::Gate`],
    arguments: [tx.object(characterId), gateOwnerCap, returnReceipt],
  });

  return tx;
}

export default authoriseGate;
