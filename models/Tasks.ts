import { ContractName } from "models/Configuration";

//* Tasks Interfaces
export interface ISignerInformation {
  relativePath?: string;
  password: string;
  privateKey?: string;
  mnemonicPhrase?: string;
  mnemonicPath: string;
  mnemonicLocale: string;
}

export interface IGenerateWallets extends ISignerInformation {
  batchSize?: number;
  entropy?: string;
  type: string;
  connect: boolean;
}

export interface IGetWalletInfo {
  relativePath?: string;
  password: string;
  mnemonicPhrase?: string;
  mnemonicPath: string;
  mnemonicLocale: string;
  showPrivate: boolean;
}

export interface IGetMnemonic {
  relativePath: string;
  password: string;
}

export interface IDeploy extends ISignerInformation {
  upgradeable: boolean;
  contractName: ContractName;
  proxyAdmin?: string;
  contractArgs: any;
  initialize?: boolean;
  noCompile: boolean;
  txValue: number;
  tag?: string;
}

export interface IUpgrade extends ISignerInformation {
  contractName: ContractName;
  proxy: string;
  proxyAdmin?: string;
  contractArgs: any;
  initialize?: boolean;
  tag?: string;
  noCompile: boolean;
}

export interface ICallContract extends ISignerInformation {
  contractName: ContractName;
  contractAddress: string;
  functionName: string;
  functionArgs: any;
  artifactPath: string;
}

export interface IGetLogic {
  proxy: string;
  proxyAdmin?: string;
}

export interface IChangeLogic extends ISignerInformation {
  proxy: string;
  proxyAdmin?: string;
  newLogic: string;
}
