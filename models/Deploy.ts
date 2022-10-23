import { BLOCKCHAIN } from "../configuration";

export interface INetwork {
  chainId: number;
  name: string;
  url: string;
}

export const networks = new Map<number | undefined, INetwork>([
  [
    undefined,
    {
      chainId: BLOCKCHAIN.hardhat.chainId,
      name: "hardhat",
      url: `http://${BLOCKCHAIN.hardhat.hostname}:${BLOCKCHAIN.hardhat.port}`,
    },
  ], // Default hardhat
  [
    0,
    {
      chainId: BLOCKCHAIN.hardhat.chainId,
      name: "hardhat",
      url: `http://${BLOCKCHAIN.hardhat.hostname}:${BLOCKCHAIN.hardhat.port}`,
    },
  ], // Default hardhat
  [
    BLOCKCHAIN.hardhat.chainId,
    {
      chainId: BLOCKCHAIN.hardhat.chainId,
      name: "hardhat",
      url: `http://${BLOCKCHAIN.hardhat.hostname}:${BLOCKCHAIN.hardhat.port}`,
    },
  ],
  [
    BLOCKCHAIN.ganache.chainId,
    {
      chainId: BLOCKCHAIN.hardhat.chainId,
      name: "ganache",
      url: `http://${BLOCKCHAIN.ganache.hostname}:${BLOCKCHAIN.ganache.port}`,
    },
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
