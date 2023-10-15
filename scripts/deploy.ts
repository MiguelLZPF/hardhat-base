import { BLOCKCHAIN, CONTRACTS, DEPLOY, GAS_OPT } from "configuration";
import {
  chainIdToNetwork,
  getArtifact,
  getContractInstance,
  getContractTimestamp,
  gNetwork,
  gProvider,
  PROXY_ADMIN_CODEHASH,
} from "scripts/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
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
import {
  IDeployReturn,
  INetworkDeployment,
  IRegularDeployment,
  IUpgradeDeployment,
  IUpgrDeployReturn,
} from "models/Deploy";
import yesno from "yesno";
import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { ContractName, PromiseOrValue } from "models/Configuration";
import { ProxyAdmin, ProxyAdmin__factory } from "typechain-types";
import CustomContract from "models/CustomContract";
import CustomUpgrContract from "models/CustomUpgrContract";

/**
 * Performs a regular deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be deployed
 * @param deployer signer used to sign deploy transacciation
 * @param _args arguments to use in the constructor
 * @param txValue contract creation transaccion value
 */
export async function deploy<C extends Contract = Contract>(
  contractName: ContractName,
  deployer: Signer,
  args: ContractMethodArgs<any[]>,
  tag?: string,
  overrides?: Overrides,
  save: boolean = false,
): Promise<IDeployReturn<C>> {
  // check if deployer is connected to the provider
  deployer = deployer.provider ? deployer : deployer.connect(gProvider);
  // get the artifact of the contract name
  const artifact = getArtifact(contractName);
  const { contract, receipt } = await CustomContract.deploy<ContractFactory, C>(
    artifact.abi,
    artifact.bytecode,
    deployer,
    args,
    overrides,
  );
  //* Store contract deployment information
  const deployment: IRegularDeployment = {
    address: contract.address,
    contractName: contractName,
    deployTimestamp: await getContractTimestamp(
      contract.contract,
      receipt.hash,
    ),
    deployTxHash: receipt.hash,
    byteCodeHash: keccak256((await contract.contract.getDeployedCode())!), // await gProvider.getCode(contract.getAddress())),
    tag: tag,
  };
  save ? await saveDeployment(deployment) : undefined;
  return {
    deployment: deployment,
    contract: contract,
  };
}

/**
 * Performs an upgradeable deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be deployed
 * @param deployer signer used to sign deploy transacciation
 * @param args arguments to use in the initializer
 * @param txValue contract creation transaccion value
 * @param proxyAdmin (optional ? PROXY_ADMIN_ADDRESS) custom proxy admin address
 */
export async function deployUpgradeable<C extends Contract = Contract>(
  contractName: ContractName,
  deployer: Signer,
  args: ContractMethodArgs<any[]>,
  tag?: string,
  overrides?: Overrides,
  proxyAdmin?: string | CustomContract<ProxyAdmin>,
  initialize: boolean = false,
  save: boolean = false,
): Promise<IUpgrDeployReturn<C>> {
  // check if deployer is connected to the provider
  deployer = deployer.provider ? deployer : deployer.connect(gProvider);
  //* Proxy Admin
  // Save or update Proxy Admin in deployments
  let adminDeployment:
    | Promise<IRegularDeployment | undefined>
    | IRegularDeployment
    | undefined;
  let proxyAdminArtifact = getArtifact("ProxyAdmin");
  if (proxyAdmin && typeof proxyAdmin == "string" && isAddress(proxyAdmin)) {
    // First option: is string and valid address
    proxyAdmin = new CustomContract<ProxyAdmin>(
      proxyAdmin as string,
      proxyAdminArtifact.abi,
      deployer,
    );
    adminDeployment = getProxyAdminDeployment(undefined, proxyAdmin.address);
  } else if (proxyAdmin && typeof proxyAdmin == "string") {
    // Second option: is string but not an address
    throw new Error(
      "❌  ⬇️  Invalid Address. String provided as Proxy Admin's address is not an address",
    );
  } else if (!proxyAdmin) {
    // Third option: no Proxy Admin at all
    // -- Search for the first stored Proxy Admin of this network
    const firstDeployedAdmin = await getProxyAdminDeployment();
    if (firstDeployedAdmin && firstDeployedAdmin.address) {
      // -- Use the first existant Proxy Admin deployment
      proxyAdmin = new CustomContract<ProxyAdmin>(
        proxyAdmin as string,
        proxyAdminArtifact.abi,
        deployer,
      );
    } else {
      // deploy new Proxy Admin
      const ok = await yesno({
        question:
          "🟡  No ProxyAdmin provided. Do you want to deploy a new Proxy Admin?",
      });
      if (!ok) {
        throw new Error("🔴  Deployment aborted");
      }
      const deployResult = await deploy(
        "ProxyAdmin",
        deployer,
        args,
        tag,
        overrides,
        save,
      );
      proxyAdmin =
        deployResult.contract as unknown as CustomContract<ProxyAdmin>;
      adminDeployment = deployResult.deployment;
    }
  } else {
    // Proxy Admin given as CustomContract
    proxyAdmin = proxyAdmin as CustomContract<ProxyAdmin>;
  }
  // Deploy using Custom Upgradeable Contract
  const artifact = getArtifact(contractName);
  const deployResult = await CustomUpgrContract.deployUpgradeable<
    ContractFactory,
    C
  >(
    artifact.abi,
    artifact.bytecode,
    proxyAdmin.address,
    deployer,
    args,
    overrides,
    initialize,
  );

  //* Verify if Proxy Admin deployment is already definer or get one from deployments.json file
  adminDeployment = (await adminDeployment)
    ? adminDeployment
    : getProxyAdminDeployment(undefined, proxyAdmin.address);

  //* Store contract deployment information
  const deployment: IUpgradeDeployment = {
    admin: deployResult.contract.proxyAdminAddress!,
    proxy: deployResult.contract.proxyAddress,
    logic: deployResult.contract.logicAddress!,
    contractName: contractName,
    deployTimestamp: await getContractTimestamp(deployResult.contract.proxy),
    proxyDeployTxHash: deployResult.receipt.hash,
    logicDeployTxHash:
      deployResult.contract.logic!.deploymentTransaction()?.hash,
    byteCodeHash: keccak256(
      (await deployResult.contract.logic!.getDeployedCode())!,
    ),
    tag: tag,
  };
  adminDeployment = (await adminDeployment)
    ? await adminDeployment
    : {
        address: proxyAdmin.address,
        contractName: CONTRACTS.get("ProxyAdmin")!.name,
        byteCodeHash: PROXY_ADMIN_CODEHASH,
      };
  save ? await saveDeployment(deployment, adminDeployment) : undefined;
  return {
    deployment: deployment,
    adminDeployment: adminDeployment,
    contract: deployResult.contract,
  };
}

/**
 * Upgrades the logic Contract of an upgradeable deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be upgraded (main use: get factory)
 * @param deployer signer used to sign transacciations
 * @param args arguments to use in the initializer
 * @param proxy (optional) [undefined] address to identifie multiple contracts with the same name and network
 * @param proxyAdmin (optional) [ROXY_ADMIN_ADDRESS] custom proxy admin address
 */
export async function upgrade<C extends BaseContract = BaseContract>(
  contractName: ContractName,
  deployer: Signer,
  args: ContractMethodArgs<any[]>,
  proxy?: string,
  overrides?: Overrides,
  proxyAdmin = CONTRACTS.get("ProxyAdmin")?.address.get(gNetwork.name),
  initialize: boolean = false,
  save: boolean = false,
): Promise<IUpgrDeployReturn<C>> {
  // check if deployer is connected to the provider
  deployer = deployer.provider ? deployer : deployer.connect(gProvider);
  // get contract deployment if proxy
  let contractDeployment: PromiseOrValue<IUpgradeDeployment>;
  contractDeployment = (
    getContractDeployment(proxy || contractName) as Promise<IUpgradeDeployment>
  ).catch((error) => {
    throw new Error(
      `❌  🔎  Contract deployment ${
        proxy || contractName
      } not found. ${error}`,
    );
  });
  //* Proxy Admin
  if (proxyAdmin && typeof proxyAdmin == "string" && isAddress(proxyAdmin)) {
    // use given address as ProxyAdmin
    proxyAdmin = proxyAdmin as string;
  } else if (
    proxyAdmin &&
    typeof proxyAdmin == "string" /*  && !isAddress(proxyAdmin) */
  ) {
    // given a proxy admin but is not an address nor a ProxyAdmin
    throw new Error(
      "String provided as Proxy Admin's address is not an address",
    );
  } else {
    // no proxy admin provided
    contractDeployment = await contractDeployment;
    if (!contractDeployment || !contractDeployment.admin) {
      throw new Error(
        `ERROR: No proxy deployment found for proxy address: ${proxy}`,
      );
    }
    proxyAdmin = contractDeployment.admin;
  }
  contractDeployment = await contractDeployment;
  if (!contractDeployment.proxy) {
    throw new Error("ERROR: contract retrieved is not upgradeable");
  }
  const artifact = getArtifact(contractName);
  const customContract = new CustomUpgrContract<C>(
    contractDeployment.proxy,
    artifact.abi,
    deployer,
    contractDeployment.logic,
    proxyAdmin,
  );
  const upgradeResult = await customContract.upgrade(
    artifact.bytecode,
    args,
    overrides,
    initialize,
  );

  //* Store contract deployment information
  contractDeployment.logic = upgradeResult.contract.logicAddress;
  contractDeployment.contractName = contractName;
  contractDeployment.logicDeployTxHash = upgradeResult.receipt.hash;
  contractDeployment.byteCodeHash = keccak256(
    await deployer.provider!.getCode(contractDeployment.logic),
  );
  contractDeployment.upgradeTimestamp = await getContractTimestamp(
    upgradeResult.contract.proxy,
  );
  if (save) {
    // store deployment information
    await saveDeployment(contractDeployment);
  }
  return {
    deployment: contractDeployment,
    adminDeployment: await getProxyAdminDeployment(
      upgradeResult.contract.proxyAddress,
    ),
    contract: upgradeResult.contract,
  };
}

export const getLogic = async (
  proxy: string,
  proxyAdmin?: string,
  signerOrProvider?: Signer | Provider,
) => {
  proxyAdmin = proxyAdmin || (await getProxyAdminDeployment(proxy))?.address;
  if (!proxyAdmin) {
    throw new Error(`ERROR: ${proxy} NOT found in this network`);
  }
  // instanciate the ProxyAdmin
  const proxyAdminContract = await getContractInstance<ProxyAdmin>(
    "ProxyAdmin",
    signerOrProvider,
    proxyAdmin,
  );
  // check if proxy admin is a ProxyAdmin Contract
  try {
    const proxyAdminCode = await proxyAdminContract.getDeployedCode();
    if (keccak256(proxyAdminCode!) != PROXY_ADMIN_CODEHASH) {
      throw new Error(
        `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
      );
    }
  } catch (error) {
    throw new Error(
      `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
    );
  }
  // Get Provider
  const provider = proxyAdminContract.runner!.provider!;
  const callResults = await Promise.all([
    // get actual logic address directly from the proxy's storage
    provider.getStorage(
      proxy,
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    ),
    // get actual admin address directly from the proxy's storage'
    provider.getStorage(
      proxy,
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
    ),
    // get actual logic address from ProxyAdmin
    proxyAdminContract.getProxyImplementation(proxy),
    // get actual admin address from ProxyAdmin
    proxyAdminContract.getProxyAdmin(proxy),
  ]);

  // return as an object
  return {
    logicFromProxy: callResults[0],
    adminFromProxy: callResults[1],
    logicFromAdmin: callResults[2],
    adminFromAdmin: callResults[3],
  };
};

export const changeLogic = async (
  proxy: string,
  newLogic: string,
  signer: Signer,
  proxyAdmin?: string,
) => {
  proxyAdmin = proxyAdmin || (await getProxyAdminDeployment(proxy))?.address;
  if (!proxyAdmin) {
    throw new Error(`ERROR: ${proxy} NOT found in this network`);
  }
  // instanciate the ProxyAdmin
  const proxyAdminContract = await getContractInstance<ProxyAdmin>(
    "ProxyAdmin",
    signer,
    proxyAdmin,
  );

  try {
    const proxyAdminCode = await signer.provider!.getCode(proxyAdmin);
    if (keccak256(proxyAdminCode) != PROXY_ADMIN_CODEHASH) {
      throw new Error(
        `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
      );
    }
  } catch (error) {
    throw new Error(
      `ERROR: ProxyAdmin(${proxyAdmin}) is not a ProxyAdmin Contract`,
    );
  }
  // Get logic|implementation address
  const previousLogic = proxyAdminContract.getProxyImplementation(proxy);
  // Change logic contract
  const receipt = await (
    await proxyAdminContract.upgrade(proxy, newLogic, GAS_OPT.max)
  ).wait();
  // Get logic|implementation address
  const actualLogic = proxyAdminContract.getProxyImplementation(proxy);

  return { previousLogic, actualLogic, receipt };
};

// Todo: change to CustomProxyAdmin
export async function getProxyAdmin(
  proxyAdmin:
    | string
    | ProxyAdmin
    | CustomContract<ProxyAdmin>
    | undefined = CONTRACTS.get("ProxyAdmin")?.address.get(gNetwork.name),
) {
  if (proxyAdmin && typeof proxyAdmin === "string") {
    return new CustomContract<ProxyAdmin>(
      proxyAdmin,
      ProxyAdmin__factory.abi,
      gProvider,
    );
  } else if (proxyAdmin && proxyAdmin instanceof CustomContract) {
    return new CustomContract<ProxyAdmin>(
      proxyAdmin.address,
      proxyAdmin.contract.interface,
      proxyAdmin.contract.runner || gProvider,
    );
  } else if (proxyAdmin) {
    proxyAdmin = proxyAdmin as ProxyAdmin;
    return new CustomContract<ProxyAdmin>(
      await proxyAdmin.getAddress(),
      proxyAdmin.interface,
      proxyAdmin.runner || gProvider,
    );
  } else {
    const firstDeployedAdmin = await getProxyAdminDeployment();
    if (firstDeployedAdmin) {
      return new CustomContract<ProxyAdmin>(
        firstDeployedAdmin.address,
        ProxyAdmin__factory.abi,
        gProvider,
      );
    } else {
      return undefined;
    }
  }
}

/**
 * Saves a deployments JSON file with the updated deployments information
 * @param deployment deployment object to added to deplyments file
 * @param proxyAdmin (optional ? PROXY_ADMIN_ADDRESS) custom proxy admin address
 */
export const saveDeployment = async (
  deployment: IRegularDeployment | IUpgradeDeployment,
  proxyAdmin?: IRegularDeployment,
) => {
  let { networkIndex, netDeployment, deployments } =
    await getActualNetDeployment();
  // if no deployed yet in this network
  if (networkIndex == undefined) {
    const network = BLOCKCHAIN.networks.get(
      chainIdToNetwork.get((await gProvider.getNetwork()).chainId),
    )!;
    netDeployment = {
      network: {
        name: network.name,
        chainId: network.chainId,
      },
      smartContracts: {
        proxyAdmins: proxyAdmin ? [proxyAdmin] : [],
        contracts: [deployment],
      },
    };
    // add to network deployments array
    deployments.push(netDeployment);
  } else if (netDeployment) {
    // if deployed before in this network
    //* proxy admin
    if (proxyAdmin && netDeployment.smartContracts.proxyAdmins) {
      // if new proxyAdmin and some proxy admin already registered
      const oldIndex = netDeployment.smartContracts.proxyAdmins.findIndex(
        (proxy) => proxy.address == proxyAdmin.address,
      );
      if (oldIndex != -1) {
        // found, update proxyAdmin
        netDeployment.smartContracts.proxyAdmins[oldIndex] = proxyAdmin;
      } else {
        // not found, push new proxyAdmin
        netDeployment.smartContracts.proxyAdmins.push(proxyAdmin);
      }
    } else if (proxyAdmin) {
      // network deployment but no Proxy admins
      netDeployment.smartContracts.proxyAdmins = [proxyAdmin];
    }
    //* smart contract
    const upgradeThis = netDeployment.smartContracts.contracts.findIndex(
      (contract) =>
        (contract as IUpgradeDeployment).proxy &&
        (contract as IUpgradeDeployment).proxy ==
          (deployment as IUpgradeDeployment).proxy,
    );
    if (upgradeThis != -1) {
      // found, update upgradeable deployment
      netDeployment.smartContracts.contracts[upgradeThis] = deployment;
    } else {
      // not found or not upgradeable
      netDeployment.smartContracts.contracts.push(deployment);
    }
    // replace (update) network deployment
    deployments[networkIndex] = netDeployment;
  }

  // store/write deployments JSON file
  writeFileSync(DEPLOY.deploymentsPath, JSON.stringify(deployments));
};

/**
 * Gets a Proxy Admin Deployment from a Network Deployment from deployments JSON file
 * @param adminAddress address that identifies a Proxy Admin in a network deployment
 * @returns Proxy Admin Deployment object
 */
const getProxyAdminDeployment = async (
  proxy?: string,
  adminAddress?: string,
) => {
  const { networkIndex, netDeployment, deployments } =
    await getActualNetDeployment();

  if (networkIndex == undefined || !netDeployment) {
    console.log("WARN: there is no deployment for this network");
    return;
  } else if (netDeployment.smartContracts.proxyAdmins) {
    if (proxy && isAddress(proxy)) {
      // if the proxy address is given, get the proxy deployment to get the associated proxyAdmin
      const proxyDep = netDeployment.smartContracts.contracts.find(
        (deployment) => (deployment as IUpgradeDeployment).proxy === proxy,
      );
      if (!proxyDep) {
        throw new Error(
          `ERROR: there is no deployment that match ${proxy} proxy for this network`,
        );
      }
      return netDeployment.smartContracts.proxyAdmins?.find(
        (proxyAdmin) =>
          proxyAdmin.address === (proxyDep as IUpgradeDeployment).admin,
      );
    } else if (adminAddress && isAddress(adminAddress)) {
      // if the proxyAdmin address is given, get this proxyAdmin
      return netDeployment.smartContracts.proxyAdmins?.find(
        (proxyAdmin) => proxyAdmin.address === adminAddress,
      );
    } else if (proxy || adminAddress) {
      throw new Error("String provided as an address is not an address");
    } else {
      // no address, get first Proxy Admin
      return netDeployment.smartContracts.proxyAdmins[0];
    }
  } else {
    console.log("WARN: there is no Proxy Admin deployed in this network");
    return;
  }
};

/**
 * Gets a Contract Deployment from a Network Deployment from deployments JSON file
 * @param addressOrName address or name that identifies a contract in a network deployment
 * @returns Contract Deployment object
 */
export const getContractDeployment = async (addressOrName: string) => {
  const { networkIndex, netDeployment, deployments } =
    await getActualNetDeployment();

  if (networkIndex == undefined || !netDeployment) {
    throw new Error("ERROR: there is no deployment for this network");
  } else if (!netDeployment.smartContracts.contracts) {
    throw new Error("ERROR: there is no contracts deployed in this network");
  } else if (isAddress(addressOrName)) {
    return netDeployment.smartContracts.contracts.find(
      (contract) =>
        (contract as IUpgradeDeployment).proxy == addressOrName ||
        (contract as IRegularDeployment).address == addressOrName,
    );
  } else {
    // if contract came provided get last deployment with this name
    const contractsFound = netDeployment.smartContracts.contracts.filter(
      (contract) => contract.contractName == addressOrName,
    );
    return contractsFound.pop();
  }
};

/**
 * Gets the actual Network Deployment from deployments JSON file
 * @param hre (optional | ghre) use custom HRE
 * @returns Network Deployment object
 */
const getActualNetDeployment = async (hre?: HardhatRuntimeEnvironment) => {
  const network = BLOCKCHAIN.networks.get(
    chainIdToNetwork.get((await gProvider.getNetwork()).chainId),
  )!;
  let deployments: INetworkDeployment[] = [];
  // if the file exists, get previous data
  if (
    existsSync(DEPLOY.deploymentsPath) &&
    statSync(DEPLOY.deploymentsPath).size > 5
  ) {
    deployments = JSON.parse(readFileSync(DEPLOY.deploymentsPath, "utf-8"));
  } else {
    console.warn("WARN: no deplyments file, createing a new one...");
  }
  // check if network is available in the deployments file
  const networkIndex = deployments.findIndex(
    (netDepl) =>
      netDepl.network.name == network.name &&
      netDepl.network.chainId == network.chainId,
  );
  let netDeployment: INetworkDeployment | undefined;
  if (networkIndex !== -1) {
    netDeployment = deployments[networkIndex];
    return {
      networkIndex: networkIndex,
      netDeployment: netDeployment,
      deployments: deployments,
    };
  } else {
    return {
      deployments: deployments,
    };
  }
};
