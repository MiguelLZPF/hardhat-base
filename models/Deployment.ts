import Environment, {
  CONTRACT_NAMES,
  ContractName,
  ENV,
} from "models/Configuration";
import {
  TransactionReceipt,
  ContractTransactionReceipt,
  Provider,
  keccak256,
} from "ethers";
import { BLOCKCHAIN, DEPLOY } from "configuration";
import { readFileSync, writeFileSync } from "fs";

//                       NetworkName --> ContractName --> Tag --> Deployment
type Deployments = Record<string, Record<string, Record<string, Deployment>>>;
type DeploymentsStored = Record<
  string,
  Record<string, Record<string, DeploymentStored>>
>;
interface DeploymentStored {
  name: ContractName;
  tag: string;
  address: string;
  logic?: string;
  logicHistory?: LogicHistory[];
  timestamp: Date;
  transactionHash: string;
  blockHash: string;
  codeHash: string;
  chainId: number;
  upgradeable: boolean;
}
export interface LogicHistory {
  timestamp: Date;
  logic: string;
}

export default class Deployment {
  name: ContractName;
  address: string;
  timestamp: Date;
  txHash: string;
  blockHash: string;
  chainId: BigInt;
  private _codeHash?: string;
  tag: string;
  provider?: Provider;

  // Ugradeable deployment
  upgradeable: boolean;
  private _logic: LogicHistory[] = [];

  constructor(deployment: Deployment);
  constructor(
    name: ContractName,
    address: string,
    timestamp: Date | number,
    txHash: string,
    blockHash: string,
    chainId: BigInt,
    codeHash?: string,
    tag?: string,
    provider?: Provider,
    logic?: string,
  );
  constructor(
    deploymentOrName: ContractName | Deployment,
    address?: string,
    timestamp?: Date | number,
    txHash?: string,
    blockHash?: string,
    chainId?: BigInt,
    codeHash?: string,
    tag?: string,
    provider?: Provider,
    logic?: string,
  ) {
    this.name =
      (deploymentOrName as ContractName) ||
      (deploymentOrName as Deployment).name;
    this.address = address || (deploymentOrName as Deployment).address;
    this.timestamp =
      typeof timestamp === "number"
        ? new Date(timestamp * 1000)
        : timestamp || (deploymentOrName as Deployment).timestamp;
    this._logic = logic
      ? new Array<LogicHistory>({
          timestamp: this.timestamp,
          logic: logic,
        })
      : (deploymentOrName as Deployment)._logic;
    this.txHash = txHash || (deploymentOrName as Deployment).txHash;
    this.blockHash = blockHash || (deploymentOrName as Deployment).blockHash;
    this.chainId = chainId || (deploymentOrName as Deployment).chainId;
    this._codeHash = codeHash || (deploymentOrName as Deployment)._codeHash;
    this.tag = tag || (deploymentOrName as Deployment).tag || "untagged";
    this.provider = provider || (deploymentOrName as Deployment).provider;
    // Set upgradeable flag based on logic
    this._logic ? (this.upgradeable = true) : (this.upgradeable = false);
  }
  //* Static
  static async fromReceipt(
    name: ContractName,
    receipt: ContractTransactionReceipt | TransactionReceipt,
    address?: string,
    logic?: string,
    tag?: string,
  ) {
    const [transaction, block] = await Promise.all([
      ENV.provider.getTransaction(receipt.hash),
      ENV.provider.getBlock(receipt.blockHash),
    ]);
    if (!transaction) {
      throw new Error(`❌ 🔎 could not find transaction ${receipt.hash}`);
    }
    if (!block) {
      throw new Error(`❌ 🔎 could not find transaction ${receipt.blockHash}`);
    }
    return new Deployment(
      name,
      (address || receipt.contractAddress)!,
      block.timestamp,
      transaction.hash,
      block.hash || receipt.blockHash,
      ENV.network.chainId,
      await Deployment.calculateCodeHash(
        (logic || address || receipt.contractAddress)!,
      ),
      tag,
      ENV.provider,
      logic,
    );
  }
  static async fromJson(
    path: string = DEPLOY.deploymentsPath,
    chainId: BigInt = ENV.network.chainId,
    name?: ContractName,
    tag: string = "untagged",
  ) {
    name = (name || CONTRACT_NAMES[0]) as ContractName;
    const deployments = await Deployment.readDeployments(path);
    // Get specific deployment
    const deployment =
      deployments[BLOCKCHAIN.networks.get(chainId)!.name][String(name)][tag];
    if (!deployment) {
      throw new Error(
        `❌ 🔎 Could not find Deployment for network: ${chainId}, ContractName: ${name} and Tag: ${tag}`,
      );
    }
    return new Deployment(deployment);
  }
  static async readDeployments(path: string = DEPLOY.deploymentsPath) {
    Deployment.validatePath(path);
    //* Get deployment
    let deploymentsFromStorage: DeploymentsStored = {};
    let deployments: Deployments = {};
    try {
      deploymentsFromStorage = JSON.parse(
        readFileSync(path, { encoding: "utf8" }),
      );
    } catch (e) {}
    // From stored deployments to object deployments
    await Deployment.forEachDeployment(
      deploymentsFromStorage,
      (deployment, networkName, contractName) => {
        deployment = deployment as DeploymentStored;
        if (!deployments[networkName]) {
          deployments[networkName] = {};
        }
        if (!deployments[networkName][contractName]) {
          deployments[networkName][contractName] = {};
        }
        deployments[networkName][contractName][deployment.tag] = new Deployment(
          deployment.name,
          deployment.address,
          deployment.timestamp,
          deployment.transactionHash,
          deployment.blockHash,
          BigInt(deployment.chainId),
          deployment.codeHash,
          deployment.tag,
        );
      },
    );
    return deployments;
  }
  static async writeDeployments(
    path: string = DEPLOY.deploymentsPath,
    deployments: Deployments,
  ) {
    Deployment.validatePath(path);
    let deploymentsToStore: DeploymentsStored = {};
    // For each network name
    await Deployment.forEachDeployment(
      deployments,
      async (deployment, networkName, contractName) => {
        deployment = deployment as Deployment;
        // Get the deployment
        if (!deploymentsToStore[networkName]) {
          deploymentsToStore[networkName] = {};
        }
        if (!deploymentsToStore[networkName][contractName]) {
          deploymentsToStore[networkName][contractName] = {};
        }
        // Translate to simple JSON Object
        deploymentsToStore[networkName][contractName][deployment.tag] = {
          name: deployment.name,
          tag: deployment.tag,
          address: deployment.address,
          logic: deployment._logic
            ? deployment._logic[deployment._logic.length - 1].logic
            : undefined,
          logicHistory: deployment._logic,
          timestamp: deployment.timestamp,
          transactionHash: deployment.txHash,
          blockHash: deployment.blockHash,
          codeHash: await deployment.codeHash(),
          chainId: Number(deployment.chainId),
          upgradeable: deployment.upgradeable,
        };
      },
    );

    try {
      writeFileSync(path, JSON.stringify(deploymentsToStore), {
        encoding: "utf8",
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  static async forEachDeployment(
    deployments: Deployments | DeploymentsStored,
    callback: (
      deployment: Deployment | DeploymentStored,
      networkName: string,
      contractName: string,
    ) => void,
  ) {
    for (const networkName in deployments) {
      if (Object.prototype.hasOwnProperty.call(deployments, networkName)) {
        const deploymentsInNetwork = deployments[networkName];
        // For each contract name in network
        for (const contractName in deploymentsInNetwork) {
          if (
            Object.prototype.hasOwnProperty.call(
              deploymentsInNetwork,
              contractName,
            )
          ) {
            const deploymentsInName = deploymentsInNetwork[contractName];
            // For each tag in contract name in network
            for (const tag in deploymentsInName) {
              if (
                Object.prototype.hasOwnProperty.call(deploymentsInName, tag)
              ) {
                // Get the deployment
                const deployment = deploymentsInName[tag];
                callback(deployment, networkName, contractName);
              }
            }
          }
        }
      }
    }
  }
  static async calculateCodeHash(
    address: string,
    provider: Provider = ENV.provider,
  ) {
    const code = await provider.getCode(address);
    if (!code) {
      throw new Error(`❌ 🔎 code cannot be found for ${address}`);
    }
    return keccak256(code);
  }
  static validatePath(path: string) {
    //* Add json extension if needed
    const [mainPath, extension, ...other] = path.split(".");
    if (other && other.length > 0) {
      throw new Error(
        `❌ 🗂️ Invalid deployments path. Use of invalid character "." ${path}`,
      );
    }
    // Path is valid
    if (!extension) {
      path = `${path}.json`;
    }
    // Path is valid and has an extension
    if (extension !== "json" && extension !== "jsonc") {
      throw new Error(
        `❌ 🗂️ Deployment file must be a JSON file. File extension: ${extension}`,
      );
    }
    // Path is valid, has an extension and is valid extension
  }
  //* Setters
  async toJson(path?: string) {
    const deployments = await Deployment.readDeployments(path);
    // Initialize when needed
    const thisNetworkName = BLOCKCHAIN.networks.get(this.chainId)!.name;
    if (!deployments[thisNetworkName]) {
      deployments[thisNetworkName] = {};
    }
    if (!deployments[thisNetworkName][String(this.name)]) {
      deployments[thisNetworkName][String(this.name)] = {};
    }
    // Set this new deployment
    deployments[thisNetworkName][String(this.name)][this.tag] = this;
    const writed = await Deployment.writeDeployments(path, deployments);
    if (!writed) {
      throw new Error(`❌ 📝 Couldn't write deployment to ${path}`);
    }
  }
  updateLogic(logic: string, timestamp: Date | number) {
    this._logic.push({
      logic: logic,
      timestamp:
        typeof timestamp === "number" ? new Date(timestamp * 1000) : timestamp,
    });
  }
  //* Getters
  get transactionHash() {
    return this.txHash;
  }
  get networkId() {
    return this.chainId;
  }
  get network() {
    return Environment.getNetwork(this.chainId);
  }
  get proxy() {
    this._checkUpgradeable();
    return this.address;
  }
  get logic() {
    this._checkUpgradeable();
    return this._logic[this._logic.length - 1].logic;
  }
  get implementation() {
    return this.logic;
  }
  get logicHistory() {
    this._checkUpgradeable();
    return this._logic;
  }
  get implementationHistory() {
    return this.logicHistory;
  }
  async getTransaction(provider: Provider | undefined = this.provider) {
    provider = this._checkProvider(provider);
    return provider.getTransaction(this.txHash);
  }
  async getBlock(provider: Provider | undefined = this.provider) {
    provider = this._checkProvider(provider);
    return provider.getBlock(this.blockHash);
  }
  async getReceipt(provider: Provider | undefined = this.provider) {
    provider = this._checkProvider(provider);
    return provider.getTransactionReceipt(this.txHash);
  }
  async codeHash() {
    return this._codeHash || (await this._calculateCodeHash());
  }
  //* Private
  private _checkProvider(provider: Provider | undefined = this.provider) {
    if (!provider) {
      throw new Error(`❌ Provider must be set to perform this operation`);
    }
    return provider;
  }
  private async _calculateCodeHash() {
    this._codeHash = await Deployment.calculateCodeHash(
      this.logic || this.address,
      this.provider,
    );
    return this._codeHash;
  }
  private _checkUpgradeable() {
    if (!this.upgradeable) {
      throw new Error(`❌ This deployment is not upgradeable`);
    }
  }
}
