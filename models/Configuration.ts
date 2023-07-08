export type Hardfork = "london" | "berlin" | "byzantium";
export type NetworkProtocol = "http" | "https" | "ws";
export type NetworkName = "hardhat" | "ganache" | "mainTest"; // you can add whatever Network name here
// IA generated
export const CONTRACT_OZ_NAMES = ["ProxyAdmin", "TUP"] as const;
export const CONTRACT_NAMES = ["Storage", "StorageUpgr"] as const;
type UnionFromTuple<T extends readonly any[]> = T[number];
export type ContractName = UnionFromTuple<typeof CONTRACT_OZ_NAMES | typeof CONTRACT_NAMES>;

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
