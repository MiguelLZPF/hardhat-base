import {
  Provider,
  Signer,
  Interface,
  InterfaceAbi,
  ContractFactory,
  BaseContract,
  ContractRunner,
  ContractTransactionResponse,
  ContractTransactionReceipt,
  ContractMethodArgs,
  TransactionResponse,
  BytesLike,
  isAddress,
  Overrides,
  Addressable,
  EventLog,
  Log,
} from "ethers";

export default class CustomContract<C extends CBaseContract> {
  //* Properties
  contract: C;
  address: string | Addressable;
  //* Contructor
  constructor(contract: C);
  constructor(
    address: string | Addressable,
    abi: Interface | InterfaceAbi,
    runner: ContractRunner,
  );
  constructor(
    contractOrAddress: string | C,
    abi?: Interface | InterfaceAbi,
    runner?: ContractRunner,
  ) {
    //* Check parameters
    let address: string | undefined;
    let contract: C | undefined;
    // First parameter
    if (typeof contractOrAddress === "string") {
      address = contractOrAddress as string;
    } else {
      contract = contractOrAddress as C;
    }
    //* Implementation
    if (address) {
      this._checkAddress(address);
      this.contract = new BaseContract(address, abi!, runner!) as C;
    } else if (contract) {
      this.contract = contract;
    } else {
      throw new Error(`❌  Constructor unknown error`);
    }
    this.address = this.target;
  }

  //* Static methods

  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends CBaseContract = CBaseContract,
  >(
    factory: F,
    signer?: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
  ): Promise<ICCDeployResult<C>>;
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends CBaseContract = CBaseContract,
  >(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    signer: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
  ): Promise<ICCDeployResult<C>>;
  static async deploy<
    F extends ContractFactory = ContractFactory,
    C extends CBaseContract = CBaseContract,
  >(
    factoryOrAbi: F | Interface | InterfaceAbi,
    bytecodeOrSigner?: BytesLike | { object: string } | Signer,
    signerOrArgs?: Signer | ContractMethodArgs<any[]>,
    argsOrOverrides?: ContractMethodArgs<any[]> | Overrides,
    overrides?: Overrides,
  ): Promise<ICCDeployResult<C>> {
    let contract: CBaseContract;
    if (factoryOrAbi instanceof ContractFactory) {
      const args = signerOrArgs as ContractMethodArgs<any[]>;
      overrides = argsOrOverrides as Overrides;
      contract = bytecodeOrSigner
        ? await factoryOrAbi
            .connect(bytecodeOrSigner as Signer)
            .deploy(...args, overrides)
        : await factoryOrAbi.deploy(...args, overrides);
    } else {
      const args = argsOrOverrides as ContractMethodArgs<any[]>;
      contract = await (
        new ContractFactory(
          factoryOrAbi as Interface | InterfaceAbi,
          bytecodeOrSigner as BytesLike | { object: string },
          signerOrArgs as Signer,
        ) as F
      ).deploy(...args, overrides);
    }
    const receipt = await contract.deploymentTransaction()?.wait();
    if (!receipt) {
      throw new Error(
        `❌  ⛓️  Bad deployment receipt. Receipt undefined after deployment`,
      );
    }
    return {
      contract: new CustomContract<C>(
        (await contract.waitForDeployment()) as C,
      ),
      receipt: receipt,
    };
  }

  //* Contract base functions
  // Getters
  get runner() {
    return this.contract.runner;
  }
  get signer() {
    this._checkSigner();
    return this.runner as Signer;
  }
  get interface() {
    return this.contract.interface;
  }
  get target() {
    return this.contract.target;
  }
  get provider() {
    if ((this.contract.runner as Signer).signMessage) {
      return (this.contract.runner as Signer).provider;
    } else if (this.contract.runner as Provider) {
      return this.contract.runner as Provider;
    } else {
      return null;
    }
  }
  // Functions
  attach(newAddress: string) {
    this._checkAddress(newAddress);
    this.contract = this.contract.attach(newAddress) as C;
    this.address = newAddress;
  }
  connect(runner: ContractRunner) {
    this.contract = this.contract.connect(runner) as C;
    return this;
  }
  async getDeployedCode() {
    return this.contract.getDeployedCode();
  }
  async waitForDeployment() {
    return this.contract.waitForDeployment();
  }
  async getAddress() {
    this.address = await this.contract.getAddress();
    return this.address;
  }

  //* Protected generic functions
  protected _checkSigner() {
    if (!this.contract.runner || !(this.contract.runner as Signer)) {
      throw new Error(
        `❌  🖊️  Cannot write transactions without a valid signer. Use connect() method.`,
      );
    }
  }
  protected _checkAddress(...addresses: (string | Addressable | undefined)[]) {
    // remove undefined addresses
    addresses.filter((address) => address !== undefined);
    if (addresses.length > 1) {
      for (const address of addresses) {
        this._checkAddress(address);
      }
    } else if ((addresses.length = 1)) {
      if (!isAddress(addresses[0])) {
        throw new Error(
          `❌  ⬇️  Bad input address is not a valid address: ${addresses[0]}`,
        );
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
          event.transactionHash,
        ))!;
        if (
          tempTransaction.from ===
          (await (this.contract.runner as Signer).getAddress())
        ) {
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

export type CBaseContract =
  | (BaseContract & {
      deploymentTransaction(): ContractTransactionResponse;
    } & Omit<BaseContract, keyof BaseContract>)
  | BaseContract;

export interface ICCDeployResult<C extends CBaseContract = CBaseContract> {
  contract: CustomContract<C>;
  receipt: ContractTransactionReceipt;
}
