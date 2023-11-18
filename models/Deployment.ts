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
import { timeStamp } from "console";

// hash(chainId, ContractName, tag) --> Deployment
type Deployments = Map<string, Deployment>;
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
      tag,
      ENV.provider,
      logic,
    );
  }
  static async fromJson(
    path: string = DEPLOY.deploymentsPath,
    chainId?: BigInt,
    name?: ContractName,
    tag?: string,
  ) {
    const keyHash = Deployment.calculateKeyHash(chainId, name, tag);
    const deployments = await Deployment.readDeployments(path);
    // Get specific deployment
    const deployment = deployments.get(keyHash);
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
    let deployments: Deployments = new Map();
    try {
      deployments = JSON.parse(
        readFileSync(path, { encoding: "utf8" }),
      ) as Deployments;
    } catch (e) {}
    return deployments;
  }
  static async writeDeployments(
    path: string = DEPLOY.deploymentsPath,
    deployments: Map<string, Deployment>,
  ) {
    Deployment.validatePath(path);
    try {
      writeFileSync(path, JSON.stringify(deployments), { encoding: "utf8" });
      return true;
    } catch (e) {
      return false;
    }
  }
  static calculateKeyHash(
    chainId?: BigInt,
    name?: ContractName, // CONTRACT_NAMES[0]
    tag: string = "untagged",
  ) {
    return keccak256(
      JSON.stringify([
        chainId || BLOCKCHAIN.networks.get(undefined)!.chainId,
        (name || CONTRACT_NAMES[0]) as ContractName,
        tag,
      ]),
    );
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
    if (extension !== "json" || "jsonc") {
      throw new Error(
        `❌ 🗂️ Deployment file must be a JSON file. File extension: ${extension}`,
      );
    }
    // Path is valid, has an extension and is valid extension
  }
  //* Setters
  async toJson(path?: string) {
    const thisKeyHash = this._calculateKeyHash();
    const deployments = await Deployment.readDeployments(path);
    // Set this new deployment
    deployments.set(thisKeyHash, this);
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
  //* Private
  private _checkProvider(provider: Provider | undefined = this.provider) {
    if (!provider) {
      throw new Error(`❌ Provider must be set to perform this operation`);
    }
    return provider;
  }
  private _calculateKeyHash(
    chainId: BigInt = this.chainId,
    name: ContractName = this.name,
    tag: string = this.tag,
  ) {
    return Deployment.calculateKeyHash(chainId, name, tag);
  }
  private _checkUpgradeable() {
    if (!this.upgradeable) {
      throw new Error(`❌ This deployment is not upgradeable`);
    }
  }
}
