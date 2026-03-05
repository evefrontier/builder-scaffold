import { Transaction } from "@mysten/sui/transactions";
import { MODULES } from "../../../ts-scripts/utils/config";
import { MODULE } from "../../../ts-scripts/smart_gate/modules";

const builderPackageId =
  "0xcbbe0c566c7a344aedba5ce1b75f4b0e279f736ae51db85962930192012c6989";

function authoriseGate(
  characterId: string,
  gateId: string,
  gateOwnerCapId: string,
) {
  const tx = new Transaction();

  const packageId =
    "0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543";
  const authType = `0xcbbe0c566c7a344aedba5ce1b75f4b0e279f736ae51db85962930192012c6989::config::XAuth`;

  const [gateOwnerCap, returnReceipt] = tx.moveCall({
    target: `0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543::character::borrow_owner_cap`,
    typeArguments: [
      `0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543::gate::Gate`,
    ],
    arguments: [
      tx.object(
        "0xbc56460e6a4fdc9d264e7ef2714427f07ea348b63891e2ff60cac1a630ab1c66",
      ),
      tx.object(
        "0x24a78dc4a72142774451bc6490f3b34c5d2c874146e7f114c53d2a45158ce692",
      ),
    ],
  });

  //   tx.moveCall({
  //     target: `0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543::gate::authorize_extension`,
  //     typeArguments: [authType],
  //     arguments: [
  //       tx.object(
  //         "0x50c403cd61904deeed39a0b9e401dbdcf4e81dbb99dccb3590536e7fbd2ffe30",
  //       ),
  //       tx.object(
  //         "0x24a78dc4a72142774451bc6490f3b34c5d2c874146e7f114c53d2a45158ce692",
  //       ),
  //     ],
  //   });

  tx.moveCall({
    target: `0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543::${MODULES.CHARACTER}::return_owner_cap`,
    typeArguments: [
      `0xf115375112eab1dcc1bb4af81a37d47ca7e95c2eb990cefa1f12f82d689e9543::${MODULES.GATE}::Gate`,
    ],
    arguments: [tx.object(characterId), gateOwnerCap, returnReceipt],
  });

  return tx;
}

export default authoriseGate;
