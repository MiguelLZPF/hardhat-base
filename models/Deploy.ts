import { ContractName, NetworkName } from "models/Configuration";
import { BaseContract, BytesLike } from "ethers";
import CustomContract, { CBaseContract } from "models/CustomContract";
import CustomUpgrContract from "models/CustomUpgrContract";

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
    chainId: BigInt;
  };
  smartContracts: {
    proxyAdmins?: IRegularDeployment[];
    contracts: (IUpgradeDeployment | IRegularDeployment)[];
  };
}

export interface IDeployReturn<T extends CBaseContract> {
  deployment: IRegularDeployment;
  contract: CustomContract<T>;
}

export interface IUpgrDeployReturn<T extends CBaseContract> {
  deployment: IUpgradeDeployment;
  adminDeployment?: IRegularDeployment;
  contract: CustomUpgrContract<T>;
}
