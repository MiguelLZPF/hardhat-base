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
  ContractMethodArgs,
  TransactionResponse,
  BytesLike,
  isAddress,
  EventLog,
  Log,
} from "ethers";

export default class CustomContract<C extends BaseContract> {
  //* Properties
  contract: C;
  address: string;
  //* Contructor
  constructor(address: string, abi: Interface | InterfaceAbi, signer: Signer);
  constructor(address: string, abi: Interface | InterfaceAbi, provider: Provider);
  constructor(address: string, abi: Interface | InterfaceAbi, runner: ContractRunner);
  constructor(address: string, abi: Interface | InterfaceAbi, runner: ContractRunner) {
    this._mustBeAddress(address);
    this.contract = new Contract(address, abi, runner) as unknown as C;
    this.address = address;
  }
  //* Staric methods
  static async deploy<F extends ContractFactory = ContractFactory>(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    signer: Signer,
    args?: ContractMethodArgs<any[]>
  ): Promise<
    BaseContract & { deploymentTransaction(): ContractTransactionResponse } & Omit<
        BaseContract,
        keyof BaseContract
      >
  >;
  static async deploy<F extends ContractFactory = ContractFactory>(
    factory: F,
    signer?: Signer,
    args?: ContractMethodArgs<any[]>
  ): Promise<
    BaseContract & { deploymentTransaction(): ContractTransactionResponse } & Omit<
        BaseContract,
        keyof BaseContract
      >
  >;
  static async deploy<F extends ContractFactory = ContractFactory>(
    factoryOrAbi?: F | Interface | InterfaceAbi,
    bytecodeOrSigner?: BytesLike | { object: string } | Signer,
    signerOrArgs?: Signer | ContractMethodArgs<any[]>,
    args?: ContractMethodArgs<any[]>
  ): Promise<
    BaseContract & { deploymentTransaction(): ContractTransactionResponse } & Omit<
        BaseContract,
        keyof BaseContract
      >
  > {
    if (factoryOrAbi instanceof ContractFactory) {
      return bytecodeOrSigner
        ? factoryOrAbi.connect(bytecodeOrSigner as Signer).deploy(signerOrArgs)
        : factoryOrAbi.deploy(signerOrArgs);
    } else {
      return (
        new ContractFactory(
          factoryOrAbi as Interface | InterfaceAbi,
          bytecodeOrSigner as BytesLike | { object: string },
          signerOrArgs as Signer
        ) as F
      ).deploy(args);
    }
  }

  //* Contract base functions
  attach(newAddress: string) {
    this._mustBeAddress(newAddress);
    this.contract = this.contract.attach(newAddress) as typeof this.contract;
    this.address = newAddress;
  }
  connect(runner: ContractRunner) {
    this.contract = this.contract.connect(runner) as typeof this.contract;
  }

  //* Protected generic functions
  protected _checkSigner() {
    if (!this.contract.runner || !(this.contract.runner as Signer)) {
      throw new Error(
        `❌  🖊️  Cannot write transactions without a valid signer. Use connect() method.`
      );
    }
  }
  protected _mustBeAddress(address: string) {
    if (!isAddress(address)) {
      throw new Error(`❌  ⬇️  Bad input address is not a valid address: ${address}`);
    }
  }
  protected async _checkExecutionEvent(events: (EventLog | Log)[]) {
    if (!events || events.length < 1) {
      return false;
    }
    if (events.length > 1) {
      // Search for any transaction in block events that match this contract's Signer
      let found = false;
      let tempTransaction: TransactionResponse | null | undefined;
      for await (const event of events) {
        tempTransaction = (await this.contract.runner?.provider?.getTransaction(
          event.transactionHash
        ))!;
        if (tempTransaction.from === (await (this.contract.runner as Signer).getAddress())) {
          found = true;
          events = [event];
          break;
        }
      }
      if (!found) {
        return false;
      }
    }
    return true;
  }
}
