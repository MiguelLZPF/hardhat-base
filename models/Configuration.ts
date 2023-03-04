export type Hardfork = "london" | "berlin" | "byzantium";
export type NetworkProtocol = "http" | "https" | "ws";
export type NetworkName = "hardhat" | "ganache" | "mainTest"; // you can add whatever Network name here
export type ContractName = "ProxyAdmin" | "TUP" | "Storage" | "StorageUpgr";

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
