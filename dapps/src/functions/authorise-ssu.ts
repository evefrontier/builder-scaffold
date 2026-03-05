import { Transaction } from "@mysten/sui/transactions";
import { MODULES } from "../../../ts-scripts/utils/config";
import { MODULE } from "../../../ts-scripts/smart_gate/modules";

const config = {
  packageId:
    "0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543",
};

function authoriseSSU(
  characterId: string,
  storageUnitId: string,
  storageUnitOwnerCapId: string,
) {
  const tx = Transaction.from("0x...");  };

  // const tx = new Transaction();

  // const [storageUnitOwnerCap, returnReceipt] = tx.moveCall({
  //   target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
  //   typeArguments: [
  //     `${config.packageId}::${MODULES.STORAGE_UNIT}::StorageUnit`,
  //   ],
  //   arguments: [tx.object(characterId), tx.object(storageUnitOwnerCapId)],
  // });

  // tx.moveCall({
  //   target: `${config.packageId}::${MODULES.STORAGE_UNIT}::authorize_extension`,
  //   typeArguments: [authType],
  //   arguments: [tx.object(storageUnitId), storageUnitOwnerCap],
  // });

  // tx.moveCall({
  //   target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
  //   typeArguments: [
  //     `${config.packageId}::${MODULES.STORAGE_UNIT}::StorageUnit`,
  //   ],
  //   arguments: [tx.object(characterId), storageUnitOwnerCap, returnReceipt],
  // });

  // tx.build();

  return tx;
}

export default authoriseSSU;
