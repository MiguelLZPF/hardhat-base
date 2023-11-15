import { BLOCKCHAIN } from "configuration";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export type PromiseOrValue<T> = Promise<T> | T;
export type Hardfork = "london" | "berlin" | "byzantium";
export type NetworkProtocol = "http" | "https" | "ws";

// Project contract names allowed
export const CONTRACT_NAMES = ["Storage", "StorageUpgr"] as const;
export type ContractName = typeof CONTRACT_NAMES;

export type NetworkName = "hardhat" | "ganache" | "mainTest"; // you can add whatever Network name here
export interface Network {
  chainId: BigInt;
  name: NetworkName;
  protocol: NetworkProtocol;
  hostname: string;
  port: number;
  dbPath?: string;
}

export const networkNameToId: Record<NetworkName, BigInt> = {
  hardhat: BigInt(31337),
  ganache: BigInt(1337),
  mainTest: BigInt(1666),
};

export default class Environment {
  hre: HardhatRuntimeEnvironment;
  ethers: HardhatRuntimeEnvironment["ethers"];
  provider: HardhatRuntimeEnvironment["ethers"]["provider"];
  network: Network;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.hre = hre;
    this.ethers = hre.ethers;
    this.provider = hre.ethers.provider;
    this.network = Environment.getNetwork(hre.network.config.chainId);
  }

  static getNetwork(chainId: BigInt | number = 0) {
    if (typeof chainId === "number") {
      chainId = BigInt(chainId);
    }
    const network = BLOCKCHAIN.networks.get(chainId);
    if (!network) {
      throw new Error(
        `Network ${chainId} not found. Please define it in the configuration.ts file`,
      );
    }
    return network;
  }
}
