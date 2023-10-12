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
  //* Static methods
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    signer: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides
  ): Promise<ICCDeployResult<C>>;
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    factory: F,
    signer?: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides
  ): Promise<ICCDeployResult<C>>;
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    factoryOrAbi: F | Interface | InterfaceAbi,
    bytecodeOrSigner?: BytesLike | { object: string } | Signer,
    signerOrArgs?: Signer | ContractMethodArgs<any[]>,
    argsOrOverrides?: ContractMethodArgs<any[]> | Overrides,
    overrides?: Overrides
  ): Promise<ICCDeployResult<C>> {
    let contract: BaseContract & { deploymentTransaction(): ContractTransactionResponse } & Omit<
        BaseContract,
        keyof BaseContract
      >;
    if (factoryOrAbi instanceof ContractFactory) {
      const args = signerOrArgs as ContractMethodArgs<any[]>;
      contract = bytecodeOrSigner
        ? await factoryOrAbi.connect(bytecodeOrSigner as Signer).deploy(...args, overrides)
        : await factoryOrAbi.deploy(...args, overrides);
    } else {
      const args = argsOrOverrides as ContractMethodArgs<any[]>;
      contract = await (
        new ContractFactory(
          factoryOrAbi as Interface | InterfaceAbi,
          bytecodeOrSigner as BytesLike | { object: string },
          signerOrArgs as Signer
        ) as F
      ).deploy(...args, overrides);
    }
    const receipt = await contract.deploymentTransaction()?.wait();
    if (!receipt) {
      throw new Error(`❌  ⛓️  Bad deployment receipt. Receipt undefined after deployment`);
    }
    return {
      contract: new CustomContract<C>(
        await contract.getAddress(),
        contract.interface,
        contract.runner as Signer
      ),
      receipt: receipt,
    };
  }

  //* Contract base functions
  attach(newAddress: string) {
    this._mustBeAddress(newAddress);
    this.contract = this.contract.attach(newAddress) as typeof this.contract;
    this.address = newAddress;
  }
  connect(runner: ContractRunner) {
    this.contract = this.contract.connect(runner) as typeof this.contract;
    return this;
  }

  //* Protected generic functions
  protected _checkSigner() {
    if (!this.contract.runner || !(this.contract.runner as Signer)) {
      throw new Error(
        `❌  🖊️  Cannot write transactions without a valid signer. Use connect() method.`
      );
    }
  }
  protected _mustBeAddress(...addresses: (string | undefined)[]) {
    // remove undefined addresses
    addresses.filter((address) => address !== undefined);
    if (addresses.length > 1) {
      for (const address of addresses) {
        this._mustBeAddress(address);
      }
    } else if ((addresses.length = 1)) {
      if (!isAddress(addresses[0])) {
        throw new Error(`❌  ⬇️  Bad input address is not a valid address: ${addresses[0]}`);
      }
    } // else do nothing
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

export interface ICCDeployResult<C extends BaseContract = BaseContract> {
  contract: CustomContract<C>;
  receipt: ContractTransactionReceipt;
}
