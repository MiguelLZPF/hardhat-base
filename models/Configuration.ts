import { BLOCKCHAIN } from "configuration";

export type Hardfork = "london" | "berlin" | "byzantium";
export type NetworkProtocol = "http" | "https" | "ws";
export type NetworkName = "hardhat" | "ganache" | "mainTest"; // you can add whatever Network name here
export type ContractName = "ProxyAdmin" | "TUP" | "Storage" | "StorageUpgr";

export const chainIdToNetwork = new Map<number | undefined, NetworkName>([
  [undefined, "hardhat"],
  [BLOCKCHAIN.networks.get("hardhat")!.chainId, "hardhat"],
  [BLOCKCHAIN.networks.get("ganache")!.chainId, "ganache"],
  [BLOCKCHAIN.networks.get("mainTest")!.chainId, "mainTest"],
]);

export interface INetwork {
  chainId: number;
  name: NetworkName;
  protocol: NetworkProtocol;
  hostname: string;
  port: number;
  dbPath?: string;
}

export interface IContract {
  name: ContractName;
  artifact: string;
  address: Map<NetworkName, string>;
}
