export type Hardfork = "london" | "berlin" | "byzantium";
export type NetworkProtocol = "http" | "https" | "ws";
export type NetworkName = "hardhat" | "ganache" | "mainTest"; // you can add whatever Network name here
// IA generated
const CONTRACT_OZ_NAMES = ["ProxyAdmin", "TUP"] as const; // [0, 1]
const CONTRACT_PROJECT_NAMES = ["Storage", "StorageUpgr"] as const; // [2, 3]
export const CONTRACT_NAMES = [
  ...CONTRACT_OZ_NAMES,
  ...CONTRACT_PROJECT_NAMES,
];
type UnionFromTuple<T extends readonly any[]> = T[number];
export type ContractName = UnionFromTuple<
  | typeof CONTRACT_OZ_NAMES
  | typeof CONTRACT_NAMES
>;

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
  address: Map<NetworkName, string | undefined>;
}
