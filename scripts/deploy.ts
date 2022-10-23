import { DEPLOY, GAS_OPT } from "../configuration";
import { ghre } from "./utils";
import * as fs from "async-file";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Contract, ContractReceipt, Signer } from "ethers";
import { isAddress, keccak256 } from "ethers/lib/utils";
import {
  INetworkDeployment,
  IRegularDeployment,
  IUpgradeDeployment,
  networks,
} from "../models/Deploy";
import {
  ProxyAdmin,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory as TUP__factory,
} from "../typechain-types";

/**
 * Performs a regular deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be deployed
 * @param deployer signer used to sign deploy transacciation
 * @param args arguments to use in the constructor
 * @param txValue contract creation transaccion value
 */
export const deploy = async (
  contractName: string,
  deployer: Signer,
  args: unknown[],
  txValue = 0
) => {
  const ethers = ghre.ethers;
  const factory = await ethers.getContractFactory(contractName, deployer);
  const contract = await (
    await factory.deploy(...args, { ...GAS_OPT.max, value: txValue })
  ).deployed();
  console.log(`
    Regular contract deployed:
      - Address: ${contract.address}
      - Arguments: ${args}
  `);
  await saveDeployment({
    address: contract.address,
    contractName: contractName,
    deployTimestamp: await getContractTimestamp(contract),
    deployTxHash: contract.deployTransaction.hash,
    byteCodeHash: keccak256(factory.bytecode),
  } as IRegularDeployment);
};

/**
 * Performs an upgradeable deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be deployed
 * @param deployer signer used to sign deploy transacciation
 * @param args arguments to use in the initializer
 * @param txValue contract creation transaccion value
 * @param proxyAdmin (optional ? PROXY_ADMIN_ADDRESS) custom proxy admin address
 */
export const deployUpgradeable = async (
  contractName: string,
  deployer: Signer,
  args: unknown[],
  txValue = 0,
  proxyAdmin?: string | ProxyAdmin
) => {
  const ethers = ghre.ethers;
  //* Proxy Admin
  // save or update Proxy Admin in deployments
  let adminDeployment: Promise<IRegularDeployment | undefined> | IRegularDeployment | undefined;
  if (proxyAdmin && typeof proxyAdmin == "string" && isAddress(proxyAdmin)) {
    proxyAdmin = (await ethers.getContractAt(
      DEPLOY.proxyAdmin.name,
      proxyAdmin,
      deployer
    )) as ProxyAdmin;
  } else if (proxyAdmin && typeof proxyAdmin == "string") {
    throw new Error("String provided as Proxy Admin's address is not an address");
  } else if (!proxyAdmin && DEPLOY.proxyAdmin.address) {
    proxyAdmin = (await ethers.getContractAt(
      DEPLOY.proxyAdmin.name,
      DEPLOY.proxyAdmin.address,
      deployer
    )) as ProxyAdmin;
  } else if (!proxyAdmin) {
    // deploy new Proxy Admin
    console.warn("WARN: no proxy admin provided, deploying new Proxy Admin");
    proxyAdmin = await (await new ProxyAdmin__factory(deployer).deploy(GAS_OPT.max)).deployed();
    adminDeployment = {
      address: proxyAdmin.address,
      contractName: DEPLOY.proxyAdmin.name,
      deployTimestamp: await getContractTimestamp(proxyAdmin),
      deployTxHash: proxyAdmin.deployTransaction.hash,
      byteCodeHash: keccak256(ProxyAdmin__factory.bytecode),
    };
  } else {
    // proxy admin given as Contract
    proxyAdmin = proxyAdmin as ProxyAdmin;
  }
  adminDeployment = (await adminDeployment)
    ? adminDeployment
    : getProxyAdminDeployment(proxyAdmin.address);
  //* Actual contracts
  const factory = await ethers.getContractFactory(contractName, deployer);
  const logic = await (await factory.deploy(GAS_OPT.max)).deployed();
  const timestamp = getContractTimestamp(logic);
  // -- encode function params for TUP
  let initData: string;
  if (args.length > 0) {
    initData = factory.interface.encodeFunctionData("initialize", [...args]);
  } else {
    initData = factory.interface._encodeParams([], []);
  }
  //* TUP - Transparent Upgradeable Proxy
  const tuProxy = await (
    await new TUP__factory(deployer).deploy(logic.address, proxyAdmin.address, initData, {
      ...GAS_OPT.max,
      value: txValue,
    })
  ).deployed();

  console.log(`
    Upgradeable contract deployed:
      - Proxy Admin: ${proxyAdmin.address},
      - Proxy: ${tuProxy.address},
      - Logic: ${logic.address}
      - Arguments: ${args}
  `);
  // store deployment information
  await saveDeployment(
    {
      admin: proxyAdmin.address,
      proxy: tuProxy.address,
      logic: logic.address,
      contractName: contractName,
      deployTimestamp: await timestamp,
      proxyTxHash: tuProxy.deployTransaction.hash,
      logicTxHash: logic.deployTransaction.hash,
      byteCodeHash: keccak256(factory.bytecode),
    } as IUpgradeDeployment,
    (await adminDeployment)
      ? await adminDeployment
      : {
          address: proxyAdmin.address,
          contractName: DEPLOY.proxyAdmin.name,
          byteCodeHash: keccak256(ProxyAdmin__factory.bytecode),
        }
  );
};

/**
 * Upgrades the logic Contract of an upgradeable deployment and updates the deployment information in deployments JSON file
 * @param contractName name of the contract to be upgraded
 * @param deployer signer used to sign transacciations
 * @param args arguments to use in the initializer
 * @param proxy (optional ? undefined) address to identifie multiple contracts with the same name and network
 * @param proxyAdmin (optional ? PROXY_ADMIN_ADDRESS) custom proxy admin address
 */
export const upgrade = async (
  contractName: string,
  deployer: Signer,
  args: unknown[],
  proxy?: string,
  proxyAdmin?: string | ProxyAdmin
) => {
  const ethers = ghre.ethers;
  const contractDeploymentP = proxy
    ? (getContractDeployment(proxy) as Promise<IUpgradeDeployment>)
    : (getContractDeployment(contractName) as Promise<IUpgradeDeployment>);
  //* Proxy Admin
  if (proxyAdmin && typeof proxyAdmin == "string" && isAddress(proxyAdmin)) {
    // use given address as ProxyAdmin
    proxyAdmin = (await ethers.getContractAt(
      DEPLOY.proxyAdmin.name,
      proxyAdmin,
      deployer
    )) as ProxyAdmin;
  } else if (proxyAdmin && typeof proxyAdmin == "string" /*  && !isAddress(proxyAdmin) */) {
    // given a proxy admin but is not an address nor a ProxyAdmin
    throw new Error("String provided as Proxy Admin's address is not an address");
  } else if (proxyAdmin && typeof proxyAdmin != "string") {
    // use given ProxyAdmin
    proxyAdmin = proxyAdmin as ProxyAdmin;
  } else {
    // no proxy admin provided
    const contractDeployment = (await contractDeploymentP) as IUpgradeDeployment;
    proxyAdmin = (await ethers.getContractAt(
      DEPLOY.proxyAdmin.name,
      contractDeployment.admin ? contractDeployment.admin : DEPLOY.proxyAdmin.address!,
      deployer
    )) as ProxyAdmin;
  }
  //* Actual contracts
  const factory = await ethers.getContractFactory(contractName, deployer);
  const newLogic = await (await factory.deploy(GAS_OPT.max)).deployed();
  const timestamp = getContractTimestamp(newLogic);
  // -- encode function params for TUP
  let initData: string;
  if (args.length > 0) {
    initData = factory.interface.encodeFunctionData("initialize", [...args]);
  } else {
    initData = factory.interface._encodeParams([], []);
  }
  //* TUP - Transparent Upgradeable Proxy
  const contractDeployment = (await contractDeploymentP) as IUpgradeDeployment;
  let receipt: ContractReceipt;
  if (!contractDeployment.proxy) {
    throw new Error("ERROR: contract retrieved is not upgradeable");
  } else if (args.length > 0) {
    receipt = await (
      await proxyAdmin.upgradeAndCall(
        contractDeployment.proxy,
        newLogic.address,
        initData,
        GAS_OPT.max
      )
    ).wait();
  } else {
    receipt = await (
      await proxyAdmin.upgrade(contractDeployment.proxy, newLogic.address, GAS_OPT.max)
    ).wait();
  }
  if (!receipt) {
    throw new Error("ERROR: Failed to upgrade, No Receipt");
  }

  console.log(`
    Contract upgraded:
      - Proxy Admin: ${proxyAdmin.address},
      - Proxy: ${contractDeployment.proxy},
      - Previous Logic: ${contractDeployment.logic}
      - New Logic: ${newLogic.address}
      - Arguments: ${args}
  `);
  // store deployment information
  contractDeployment.logic = newLogic.address;
  contractDeployment.contractName = contractName;
  contractDeployment.logicTxHash = newLogic.deployTransaction.hash;
  contractDeployment.byteCodeHash = keccak256(factory.bytecode);
  contractDeployment.upgradeTimestamp = await timestamp;
  await saveDeployment(contractDeployment);
};

/**
 * Saves a deployments JSON file with the updated deployments information
 * @param deployment deployment object to added to deplyments file
 * @param proxyAdmin (optional ? PROXY_ADMIN_ADDRESS) custom proxy admin address
 */
export const saveDeployment = async (
  deployment: IRegularDeployment | IUpgradeDeployment,
  proxyAdmin?: IRegularDeployment
) => {
  let { networkIndex, netDeployment, deployments } = await getActualNetDeployment();
  // if no deployed yet in this network
  if (networkIndex == undefined) {
    const provider = ghre.ethers.provider;
    const network = networks.get(
      provider.network ? provider.network.chainId : (await provider.getNetwork()).chainId
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
        (proxy) => proxy.address == proxyAdmin.address
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
        (contract as IUpgradeDeployment).proxy == (deployment as IUpgradeDeployment).proxy
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
  await fs.writeFile(DEPLOY.deploymentsPath, JSON.stringify(deployments));
};

/**
 * Gets a Proxy Admin Deployment from a Network Deployment from deployments JSON file
 * @param address address that identifies a Proxy Admin in a network deployment
 * @returns Proxy Admin Deployment object
 */
const getProxyAdminDeployment = async (address?: string) => {
  const { networkIndex, netDeployment, deployments } = await getActualNetDeployment();

  if (networkIndex == undefined || !netDeployment) {
    throw new Error("ERROR: there is no deployment for this network");
  } else if (netDeployment.smartContracts.proxyAdmins) {
    if (address && isAddress(address)) {
      return netDeployment.smartContracts.proxyAdmins?.find(
        (proxyAdmin) => proxyAdmin.address === address
      );
    } else if (address) {
      throw new Error("String provided as Proxy Admin's address is not an address");
    } else {
      // no address, get first Proxy Admin
      return netDeployment.smartContracts.proxyAdmins[0];
    }
  } else {
    throw new Error("ERROR: there is no Proxy Admin deployed in this network");
  }
};

/**
 * Gets a Contract Deployment from a Network Deployment from deployments JSON file
 * @param addressOrName address or name that identifies a contract in a network deployment
 * @returns Contract Deployment object
 */
const getContractDeployment = async (addressOrName: string) => {
  const { networkIndex, netDeployment, deployments } = await getActualNetDeployment();

  if (networkIndex == undefined || !netDeployment) {
    throw new Error("ERROR: there is no deployment for this network");
  } else if (!netDeployment.smartContracts.contracts) {
    throw new Error("ERROR: there is no contracts deployed in this network");
  } else if (isAddress(addressOrName)) {
    return netDeployment.smartContracts.contracts.find(
      (contract) =>
        (contract as IUpgradeDeployment).proxy == addressOrName ||
        (contract as IRegularDeployment).address == addressOrName
    );
  } else {
    // if contract came provided get last deployment with this name
    const contractsFound = netDeployment.smartContracts.contracts.filter(
      (contract) => contract.contractName == addressOrName
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
  const provider = hre ? hre.ethers.provider : ghre.ethers.provider;
  const network = networks.get(
    provider.network ? provider.network.chainId : (await provider.getNetwork()).chainId
  )!;
  let deployments: INetworkDeployment[] = [];
  // if the file exists, get previous data
  if (await fs.exists(DEPLOY.deploymentsPath)) {
    deployments = JSON.parse(await fs.readFile(DEPLOY.deploymentsPath));
  } else {
    console.warn("WARN: no deplyments file, createing a new one...");
  }
  // check if network is available in the deployments file
  const networkIndex = deployments.findIndex(
    (netDepl) => netDepl.network.name == network.name && netDepl.network.chainId == network.chainId
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
/**
 * Gets the deployed contract timestamp
 * @param contract contract instance to use
 * @param deployTxHash (optional | undefined) it can be used to retrive timestamp
 * @param hre (optional | ghre) use custom HRE
 * @returns ISO string date time representation of the contract timestamp
 */
const getContractTimestamp = async (
  contract: Contract,
  deployTxHash?: string,
  hre?: HardhatRuntimeEnvironment
) => {
  const provider = hre ? hre.ethers.provider : ghre.ethers.provider;

  let receipt: ContractReceipt;
  if (contract.deployTransaction && contract.deployTransaction.hash) {
    receipt = await provider.getTransactionReceipt(contract.deployTransaction.hash);
  } else if (deployTxHash && isAddress(deployTxHash)) {
    receipt = await provider.getTransactionReceipt(deployTxHash);
  } else {
    console.error("ERROR: cannot get Tx from contract or parameter");
    return undefined;
  }
  if (receipt && receipt.blockHash) {
    const timestampSeconds = (await provider.getBlock(receipt.blockHash)).timestamp;
    return new Date(timestampSeconds * 1000).toISOString();
  } else {
    console.error("ERROR: cannot get Tx Block Hash");
    return undefined;
  }
};
