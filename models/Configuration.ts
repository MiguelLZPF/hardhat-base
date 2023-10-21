export type PromiseOrValue<T> = Promise<T> | T;
export type Hardfork = "london" | "berlin" | "byzantium";
export type NetworkProtocol = "http" | "https" | "ws";
export type NetworkName = "hardhat" | "ganache" | "mainTest"; // you can add whatever Network name here

// Project contract names allowed
const CONTRACT_NAMES = ["Storage", "StorageUpgr"] as const;
export type ContractName = typeof CONTRACT_NAMES;

export interface INetwork {
  chainId: BigInt;
  name: NetworkName;
  protocol: NetworkProtocol;
  hostname: string;
  port: number;
  dbPath?: string;
}
