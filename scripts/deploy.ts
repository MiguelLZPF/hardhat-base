import {
  Contract,
  BaseContract,
  ContractFactory,
  Signer,
  Provider,
  ContractMethodArgs,
  keccak256,
  Overrides,
  Block,
  isAddress,
} from "ethers";
import { ContractName, ENV } from "models/Configuration";
import {
  IDeployReturn,
  INetworkDeployment,
  IRegularDeployment,
  IUpgradeDeployment,
  IUpgrDeployReturn,
} from "models/Deploy";
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

//   //* Store contract deployment information
//   contractDeployment.logic = upgradeResult.contract.logicAddress;
//   contractDeployment.contractName = contractName;
//   contractDeployment.logicDeployTxHash = upgradeResult.receipt.hash;
//   contractDeployment.byteCodeHash = keccak256(
//     await deployer.provider!.getCode(contractDeployment.logic),
//   );
//   contractDeployment.upgradeTimestamp = await getContractTimestamp(
//     upgradeResult.contract.proxy,
//   );
//   if (save) {
//     // store deployment information
//     await saveDeployment(contractDeployment);
//   }
//   return {
//     deployment: contractDeployment,
//     adminDeployment: await getProxyAdminDeployment(
//       upgradeResult.contract.proxyAddress,
//     ),
//     contract: upgradeResult.contract,
//   };
// }

// export const getLogic = async (
//   proxy: string,
//   // proxyAdmin?: string,
//   signerOrProvider: Signer | Provider,
// ) => {
//   // proxyAdmin = proxyAdmin || (await getProxyAdminDeployment(proxy))?.address;
//   // if (!proxyAdmin) {
//   //   throw new Error(`ERROR: ${proxy} NOT found in this network`);
//   // }
//   // // instanciate the ProxyAdmin
//   // const proxyAdminContract = await getContractInstance<ProxyAdmin>(
//   //   "ProxyAdmin",
//   //   signerOrProvider,
//   //   proxyAdmin,
//   // );
//   // // check if proxy admin is a ProxyAdmin Contract
//   // try {
//   //   const proxyAdminCode = await proxyAdminContract.getDeployedCode();
//   //   if (keccak256(proxyAdminCode!) != PROXY_ADMIN_CODEHASH) {
//   //     throw new Error(
//   //       `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
//   //     );
//   //   }
//   // } catch (error) {
//   //   throw new Error(
//   //     `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
//   //   );
//   // }
//   //* TUP
//   const tup = new CustomContract(
//     proxy,
//     TUP__factory.abi,
//     signerOrProvider,
//   ) as unknown as TUP;
//   //* Get provider
//   const provider = ((signerOrProvider as Signer).provider ||
//     (signerOrProvider as Provider))!;
//   //* Get data from blockchain
//   const callResults = await Promise.all([
//     // get actual logic address directly from the proxy's storage
//     provider.getStorage(
//       proxy,
//       "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
//     ),
//     // get actual admin address directly from the proxy's storage'
//     provider.getStorage(
//       proxy,
//       "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
//     ),
//     // get actual logic address from ProxyAdmin
//     tup.getImplementation(),
//     // get actual admin address from ProxyAdmin
//     tup.getProxyAdmin(),
//   ]);

//   // return as an object
//   return {
//     logicFromProxy: callResults[0],
//     adminFromProxy: callResults[1],
//     logicFromAdmin: callResults[2],
//     adminFromAdmin: callResults[3],
//   };
// };

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
