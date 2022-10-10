import { ENV } from "../configuration";

export interface INetwork {
  chainId: number;
  name: string;
  url: string;
}

export const networks = new Map<number | undefined, INetwork>([
  [
    undefined,
    { chainId: ENV.BLOCKCHAIN.hardhat.chainId, name: "hardhat", url: ENV.BLOCKCHAIN.hardhat.url },
  ], // Default hardhat
  [0, { chainId: ENV.BLOCKCHAIN.hardhat.chainId, name: "hardhat", url: ENV.BLOCKCHAIN.hardhat.url }], // Default hardhat
  [
    ENV.BLOCKCHAIN.hardhat.chainId,
    { chainId: ENV.BLOCKCHAIN.hardhat.chainId, name: "hardhat", url: ENV.BLOCKCHAIN.hardhat.url },
  ],
  [
    ENV.BLOCKCHAIN.ganache.chainId,
    { chainId: ENV.BLOCKCHAIN.hardhat.chainId, name: "ganache", url: ENV.BLOCKCHAIN.ganache.url },
  ],
]);

export interface IRegularDeployment {
  address: string;
  contractName?: string;
  deployTxHash?: string;
  deployTimestamp?: Date | number | string;
  byteCodeHash?: string;
}

export interface IUpgradeDeployment {
  admin: string;
  proxy: string; // or storage
  logic: string; // or implementation
  contractName?: string;
  proxyTxHash?: string;
  logicTxHash?: string;
  deployTimestamp?: Date | number | string;
  upgradeTimestamp?: Date | number | string;
  byteCodeHash?: string;
}

export interface INetworkDeployment {
  network: {
    name: string;
    chainId: number | string;
  };
  smartContracts: {
    proxyAdmins?: IRegularDeployment[];
    contracts: (IUpgradeDeployment | IRegularDeployment)[];
  };
}
