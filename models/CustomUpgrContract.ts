import {
  Provider,
  Signer,
  Interface,
  InterfaceAbi,
  ContractFactory,
  BaseContract,
  Contract,
  ContractRunner,
  ContractTransactionResponse,
  ContractTransactionReceipt,
  ContractMethodArgs,
  TransactionResponse,
  BytesLike,
  isAddress,
  Overrides,
  EventLog,
  Log,
} from "ethers";
import CustomContract, { ICCDeployResult } from "./CustomContract";
import {
  ProxyAdmin,
  TransparentUpgradeableProxy as TUP,
  TransparentUpgradeableProxy__factory as TUP__factory,
} from "typechain-types";

export default class CustomUpgrContract<C extends BaseContract> extends CustomContract<C> {
  //* Properties
  proxy: TUP;
  logic?: C;
  proxyAdmin?: ProxyAdmin;
  proxyAddress: string = this.address;
  logicAddress?: string;
  proxyAdminAddress?: string;
  //* Contructor
  constructor(
    address: string,
    abi: Interface | InterfaceAbi,
    signer: Signer,
    logic?: string,
    proxyAdmin?: string
  );
  constructor(
    address: string,
    abi: Interface | InterfaceAbi,
    provider: Provider,
    logic?: string,
    proxyAdmin?: string
  );
  constructor(
    address: string,
    abi: Interface | InterfaceAbi,
    runner: ContractRunner,
    logic?: string,
    proxyAdmin?: string
  );
  constructor(
    address: string,
    abi: Interface | InterfaceAbi,
    runner: ContractRunner,
    logic?: string,
    proxyAdmin?: string
  ) {
    super(address, abi, runner);
    this._mustBeAddress(logic, proxyAdmin);
    this.proxy = new Contract(address, TUP__factory.abi, runner) as unknown as TUP;
    this.logic = logic ? (new Contract(logic, abi, runner) as unknown as C) : undefined;
    this.proxyAdmin = proxyAdmin
      ? (new Contract(proxyAdmin, TUP__factory.abi, runner) as unknown as ProxyAdmin)
      : undefined;
    this.logicAddress = logic;
  }
  //* Static methods
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    proxyAdmin: string,
    signer: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides
  ): Promise<ICCUpgrDeployResult<C>>;
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    factory: F,
    proxyAdmin: string,
    signer?: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides
  ): Promise<ICCUpgrDeployResult<C>>;
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    factoryOrAbi: F | Interface | InterfaceAbi,
    bytecodeOrProxyAdmin: BytesLike | { object: string } | string,
    proxyAdminOrSigner?: string | Signer,
    signerOrArgs?: Signer | ContractMethodArgs<any[]>,
    argsOrOverrides?: ContractMethodArgs<any[]> | Overrides,
    overrides?: Overrides
  ): Promise<ICCUpgrDeployResult<C>> {
    super.deploy(factoryOrAbi, )
  }
  //* Contract base functions
  //* Protected generic functions
}

export interface ICCUpgrDeployResult<C extends BaseContract = BaseContract>
  extends ICCDeployResult<C> {
  logicContract: CustomContract<C>;
  proxyContract: TUP;
  proxyAdmin?: ProxyAdmin;
}
