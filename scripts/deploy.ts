import { Signer, ContractMethodArgs, Overrides, Block } from "ethers";
import { ContractName, ENV } from "models/Configuration";
import Deployment from "models/Deployment";
import Storage, { StorageDeployResult } from "models/Storage";
import StorageUpgr, { StorageUpgrDeployResult } from "models/StorageUpgr";

/**
 * Performs a regular deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be deployed
 * @param deployer signer used to sign deploy transacciation
 * @param _args arguments to use in the constructor
 * @param txValue contract creation transaccion value
 */
export async function deploy(
  contractName: ContractName,
  deployer: Signer,
  args: ContractMethodArgs<any[]>,
  overrides?: Overrides,
  save: boolean = false,
  tag?: string,
) {
  let deployResult: StorageDeployResult | StorageUpgrDeployResult;
  switch (String(contractName)) {
    case "Storage":
      deployResult = await Storage.deployStorage(deployer, args[0], overrides);
      break;
    case "StorageUpgr":
      deployResult = await StorageUpgr.deployStorage(
        deployer,
        args[0],
        overrides,
      );
      break;
    default:
      throw new Error(`❌ 🔎 No contract found with name: ${contractName}`);
  }
  const deployment = await Deployment.fromReceipt(
    contractName,
    deployResult.receipt,
    deployResult.contract.address,
    (deployResult as StorageUpgrDeployResult)
      ? (deployResult as StorageUpgrDeployResult).contract.logicAddress
      : undefined,
    tag,
  );
  if (save) {
    await deployment.toJson();
  }
  return deployment;
}

export async function upgrade(
  contractName: ContractName,
  upgrader: Signer,
  args: ContractMethodArgs<any[]>,
  overrides?: Overrides,
  address?: string,
  logic?: string,
  tag?: string,
) {
  let deployment: Deployment | undefined;
  try {
    deployment = await Deployment.fromJson(
      undefined,
      undefined,
      contractName,
      tag,
    );
  } catch (error) {}
  if (!deployment || !address) {
    throw new Error(`❌ Address nor provided and deployment not found`);
  }
  let deployResult: StorageUpgrDeployResult;
  let deployBlock: Promise<Block | null>;
  switch (String(contractName)) {
    case "StorageUpgr":
      const storage = new StorageUpgr(
        address || deployment?.address,
        logic || deployment?.logic,
        upgrader,
      );
      deployResult = await storage.upgradeStorage(undefined, overrides);
      deployBlock = ENV.provider.getBlock(deployResult.receipt.blockHash);
      break;
    default:
      throw new Error(`❌ 🔎 No contract found with name: ${contractName}`);
  }
  if (deployment) {
    deployment.updateLogic(
      deployResult.contract.logicAddress,
      (await deployBlock)!.timestamp,
    );
  }
  return { deployResult: deployResult, deployment: deployment };
}

// export const changeLogic = async (
//   proxy: string,
//   newLogic: string,
//   signer: Signer,
//   proxyAdmin?: string,
// ) => {
//   proxyAdmin = proxyAdmin || (await getProxyAdminDeployment(proxy))?.address;
//   if (!proxyAdmin) {
//     throw new Error(`ERROR: ${proxy} NOT found in this network`);
//   }
//   // instanciate the ProxyAdmin
//   const proxyAdminContract = await getContractInstance<ProxyAdmin>(
//     "ProxyAdmin",
//     signer,
//     proxyAdmin,
//   );

//   try {
//     const proxyAdminCode = await signer.provider!.getCode(proxyAdmin);
//     if (keccak256(proxyAdminCode) != PROXY_ADMIN_CODEHASH) {
//       throw new Error(
//         `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
//       );
//     }
//   } catch (error) {
//     throw new Error(
//       `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
//     );
//   }
//   // Get logic|implementation address
//   const previousLogic = proxyAdminContract.getProxyImplementation(proxy);
//   // Change logic contract
//   const receipt = await (
//     await proxyAdminContract.upgrade(proxy, newLogic, GAS_OPT.max)
//   ).wait();
//   // Get logic|implementation address
//   const actualLogic = proxyAdminContract.getProxyImplementation(proxy);

//   return { previousLogic, actualLogic, receipt };
// };
