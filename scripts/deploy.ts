import {
  Contract,
  BaseContract,
  ContractFactory,
  Signer,
  Provider,
  ContractMethodArgs,
  keccak256,
  Overrides,
  isAddress,
} from "ethers";
import { ContractName } from "models/Configuration";
import {
  IDeployReturn,
  INetworkDeployment,
  IRegularDeployment,
  IUpgradeDeployment,
  IUpgrDeployReturn,
} from "models/Deploy";
import Deployment from "models/Deployment";
import Storage, { IStorageDeployResult } from "models/Storage";
import StorageUpgr, { IStorageUpgrDeployResult } from "models/StorageUpgr";

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
  let deployResult: IStorageDeployResult | IStorageUpgrDeployResult;
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
    undefined,
    tag,
  );
  if (save) {
    await deployment.toJson();
  }
  return deployment;
}

// /**
//  * Performs an upgradeable deployment and updates the deployment information in deployments JSON file
//  * @param contractName name of the contract to be deployed
//  * @param deployer signer used to sign deploy transacciation
//  * @param args arguments to use in the initializer
//  * @param txValue contract creation transaccion value
//  * @param proxyAdmin (optional ? PROXY_ADMIN_ADDRESS) custom proxy admin address
//  */
// export async function deployUpgradeable<C extends Contract = Contract>(
//   contractName: ContractName,
//   deployer: Signer,
//   args: ContractMethodArgs<any[]>,
//   tag?: string,
//   overrides?: Overrides,
//   proxyAdmin?: string | CustomContract<ProxyAdmin>,
//   initialize: boolean = false,
//   save: boolean = false,
// ): Promise<IUpgrDeployReturn<C>> {
//   // check if deployer is connected to the provider
//   deployer = deployer.provider ? deployer : deployer.connect(gProvider);
//   //* Proxy Admin
//   // Save or update Proxy Admin in deployments
//   let adminDeployment:
//     | Promise<IRegularDeployment | undefined>
//     | IRegularDeployment
//     | undefined;
//   let proxyAdminArtifact = getArtifact("ProxyAdmin");
//   if (proxyAdmin && typeof proxyAdmin == "string" && isAddress(proxyAdmin)) {
//     // First option: is string and valid address
//     proxyAdmin = new CustomContract<ProxyAdmin>(
//       proxyAdmin as string,
//       proxyAdminArtifact.abi,
//       deployer,
//     );
//     adminDeployment = getProxyAdminDeployment(undefined, proxyAdmin.address);
//   } else if (proxyAdmin && typeof proxyAdmin == "string") {
//     // Second option: is string but not an address
//     throw new Error(
//       "❌  ⬇️  Invalid Address. String provided as Proxy Admin's address is not an address",
//     );
//   } else if (!proxyAdmin) {
//     // Third option: no Proxy Admin at all
//     // -- Search for the first stored Proxy Admin of this network
//     const firstDeployedAdmin = await getProxyAdminDeployment();
//     if (firstDeployedAdmin && firstDeployedAdmin.address) {
//       // -- Use the first existant Proxy Admin deployment
//       proxyAdmin = new CustomContract<ProxyAdmin>(
//         proxyAdmin as string,
//         proxyAdminArtifact.abi,
//         deployer,
//       );
//     } else {
//       // deploy new Proxy Admin
//       const ok = await yesno({
//         question:
//           "🟡  No ProxyAdmin provided. Do you want to deploy a new Proxy Admin?",
//       });
//       if (!ok) {
//         throw new Error("🔴  Deployment aborted");
//       }
//       const deployResult = await deploy(
//         "ProxyAdmin",
//         deployer,
//         args,
//         tag,
//         overrides,
//         save,
//       );
//       proxyAdmin =
//         deployResult.contract as unknown as CustomContract<ProxyAdmin>;
//       adminDeployment = deployResult.deployment;
//     }
//   } else {
//     // Proxy Admin given as CustomContract
//     proxyAdmin = proxyAdmin as CustomContract<ProxyAdmin>;
//   }
//   // Deploy using Custom Upgradeable Contract
//   const artifact = getArtifact(contractName);
//   const deployResult = await CustomUpgrContract.deployUpgradeable<
//     ContractFactory,
//     C
//   >(
//     artifact.abi,
//     artifact.bytecode,
//     proxyAdmin.address,
//     deployer,
//     args,
//     overrides,
//     initialize,
//   );

//   //* Verify if Proxy Admin deployment is already definer or get one from deployments.json file
//   adminDeployment = (await adminDeployment)
//     ? adminDeployment
//     : getProxyAdminDeployment(undefined, proxyAdmin.address);

//   //* Store contract deployment information
//   const deployment: IUpgradeDeployment = {
//     admin: deployResult.contract.proxyAdminAddress!,
//     proxy: deployResult.contract.proxyAddress,
//     logic: deployResult.contract.logicAddress!,
//     contractName: contractName,
//     deployTimestamp: await getContractTimestamp(deployResult.contract.proxy),
//     proxyDeployTxHash: deployResult.receipt.hash,
//     logicDeployTxHash:
//       deployResult.contract.logic!.deploymentTransaction()?.hash,
//     byteCodeHash: keccak256(
//       (await deployResult.contract.logic!.getDeployedCode())!,
//     ),
//     tag: tag,
//   };
//   adminDeployment = (await adminDeployment)
//     ? await adminDeployment
//     : {
//         address: proxyAdmin.address,
//         contractName: CONTRACTS.get("ProxyAdmin")!.name,
//         byteCodeHash: PROXY_ADMIN_CODEHASH,
//       };
//   save ? await saveDeployment(deployment, adminDeployment) : undefined;
//   return {
//     deployment: deployment,
//     adminDeployment: adminDeployment,
//     contract: deployResult.contract,
//   };
// }

// /**
//  * Upgrades the logic Contract of an upgradeable deployment and updates the deployment information in deployments JSON file
//  * @param contractName name of the contract to be upgraded (main use: get factory)
//  * @param deployer signer used to sign transacciations
//  * @param args arguments to use in the initializer
//  * @param proxy (optional) [undefined] address to identifie multiple contracts with the same name and network
//  * @param proxyAdmin (optional) [ROXY_ADMIN_ADDRESS] custom proxy admin address
//  */
// export async function upgrade<C extends BaseContract = BaseContract>(
//   contractName: ContractName,
//   deployer: Signer,
//   args: ContractMethodArgs<any[]>,
//   proxy?: string,
//   overrides?: Overrides,
//   proxyAdmin = CONTRACTS.get("ProxyAdmin")?.address.get(gNetwork.name),
//   initialize: boolean = false,
//   save: boolean = false,
// ): Promise<IUpgrDeployReturn<C>> {
//   // check if deployer is connected to the provider
//   deployer = deployer.provider ? deployer : deployer.connect(gProvider);
//   // get contract deployment if proxy
//   let contractDeployment: PromiseOrValue<IUpgradeDeployment>;
//   contractDeployment = (
//     getContractDeployment(proxy || contractName) as Promise<IUpgradeDeployment>
//   ).catch((error) => {
//     throw new Error(
//       `❌  🔎  Contract deployment ${
//         proxy || contractName
//       } not found. ${error}`,
//     );
//   });
//   //* Proxy Admin
//   if (proxyAdmin && typeof proxyAdmin == "string" && isAddress(proxyAdmin)) {
//     // use given address as ProxyAdmin
//     proxyAdmin = proxyAdmin as string;
//   } else if (
//     proxyAdmin &&
//     typeof proxyAdmin == "string" /*  && !isAddress(proxyAdmin) */
//   ) {
//     // given a proxy admin but is not an address nor a ProxyAdmin
//     throw new Error(
//       "String provided as Proxy Admin's address is not an address",
//     );
//   } else {
//     // no proxy admin provided
//     contractDeployment = await contractDeployment;
//     if (!contractDeployment || !contractDeployment.admin) {
//       throw new Error(
//         `ERROR: No proxy deployment found for proxy address: ${proxy}`,
//       );
//     }
//     proxyAdmin = contractDeployment.admin;
//   }
//   contractDeployment = await contractDeployment;
//   if (!contractDeployment.proxy) {
//     throw new Error("ERROR: contract retrieved is not upgradeable");
//   }
//   const artifact = getArtifact(contractName);
//   const customContract = new CustomUpgrContract<C>(
//     contractDeployment.proxy,
//     artifact.abi,
//     deployer,
//     contractDeployment.logic,
//     proxyAdmin,
//   );
//   const upgradeResult = await customContract.upgrade(
//     artifact.bytecode,
//     args,
//     overrides,
//     initialize,
//   );

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
