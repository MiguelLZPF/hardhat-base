import { ContractName, NetworkName } from "models/Configuration";

export interface IRegularDeployment {
  address: string;
  contractName?: ContractName;
  deployTxHash?: string;
  deployTimestamp?: Date | number | string;
  byteCodeHash?: string;
  tag?: string;
}

export interface IUpgradeDeployment {
  admin: string;
  proxy: string; // or storage
  logic: string; // or implementation
  contractName?: ContractName;
  proxyTxHash?: string;
  logicTxHash?: string;
  deployTimestamp?: Date | number | string;
  upgradeTimestamp?: Date | number | string;
  byteCodeHash?: string;
  tag?: string;
}

export interface INetworkDeployment {
  network: {
    name: NetworkName;
    chainId: number;
  };
  smartContracts: {
    proxyAdmins?: IRegularDeployment[];
    contracts: (IUpgradeDeployment | IRegularDeployment)[];
  };
}
