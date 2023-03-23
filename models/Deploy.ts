import { ContractName, NetworkName } from "models/Configuration";
import { Contract, BytesLike } from "ethers";
import { ProxyAdmin, TransparentUpgradeableProxy } from "typechain-types";

interface IDeployment {
  contractName: ContractName;
  deployTimestamp?: Date | number | string;
  byteCodeHash?: BytesLike; // this is the "deployBytecode" not the bytecode
  tag?: string; // open field to add metadata or any info to a deployment
}

export interface IRegularDeployment extends IDeployment {
  address: string;
  deployTxHash?: string;
}

export interface IUpgradeDeployment extends IDeployment {
  admin: string;
  proxy: string; // or storage
  logic: string; // or implementation
  proxyDeployTxHash?: string;
  logicDeployTxHash?: string;
  upgradeTimestamp?: Date | number | string;
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

export interface IDeployReturn {
  deployment: IRegularDeployment;
  contractInstance: Contract;
}

export interface IUpgrDeployReturn extends Omit<IDeployReturn, "deployment"> {
  deployment: IUpgradeDeployment;
  adminDeployment?: IRegularDeployment;
  logicInstance: Contract;
  tupInstance: TransparentUpgradeableProxy | Contract;
  proxyAdminInstance?: ProxyAdmin;
}

export interface IUpgradeReturn extends Omit<IDeployReturn, "deployment"> {
  deployment: IUpgradeDeployment;
}
