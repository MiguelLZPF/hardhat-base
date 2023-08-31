import {
  Provider,
  Signer,
  ContractRunner,
  BigNumberish,
  TransactionResponse,
  isAddress,
} from "ethers";
import { Storage as StorageType, Storage__factory } from "typechain-types";

export default class Storage {
  // factory: Storage__factory;
  contract: StorageType;
  address: string;
  number: number | BigInt | undefined;

  constructor(address: string, signer: Signer);
  constructor(address: string, provider: Provider);
  constructor(address: string, runner: ContractRunner);
  constructor(address: string, runner: ContractRunner) {
    this._mustBeAddress(address);
    this.contract = Storage__factory.connect(address, runner) as StorageType;
    this.address = address;
    this.number = undefined;
  }

  static async deploy(signer: Signer): Promise<StorageType>;
  static async deploy(signer: Signer, initialValue?: number): Promise<StorageType>;
  static async deploy(signer: Signer, initialValue?: number): Promise<StorageType> {
    return new Storage__factory(signer).deploy(initialValue || 0);
  }
  //* Contract base functions
  attach(newAddress: string) {
    this._mustBeAddress(newAddress);
    this.contract = this.contract.attach(newAddress) as StorageType;
    this.address = newAddress;
  }
  connect(runner: ContractRunner) {
    this.contract = this.contract.connect(runner) as StorageType;
  }
  //* Custom contract functions
  async store(num: BigNumberish) {
    // Check if valid signer
    this._checkSigner();
    // Actual transaction
    const receipt = await (await this.contract.store(num)).wait();
    if (!receipt) {
      throw new Error(
        `❌  ⛓️  Cannot store ${num} in ${this.contract.getAddress()}. Receipt is undefined`
      );
    }
    // Search for events to secure execution
    let events = await this.contract.queryFilter(
      this.contract.filters.Stored(num),
      receipt?.blockNumber,
      receipt?.blockNumber
    );
    if (!events || events.length < 1) {
      throw new Error(
        `❌  ⛓️  Cannot store ${num} in ${this.contract.getAddress()}. Execution event not found`
      );
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
        throw new Error(
          `❌  ⛓️  Cannot store ${num} in ${this.contract.getAddress()}. Execution event not found`
        );
      }
    }
    // All OK Transacction executed
    return { num: num, receipt: receipt, event: events[0] };
  }

  async retrieve(): Promise<BigNumberish> {
    let result: BigNumberish = await this.contract.retrieve();
    try {
      result = Number(result);
    } catch (error) {
      console.warn(`🟠  Cannot convert to number: ${error}`);
    }
    this.number = result;
    return result;
  }

  //* Private generic functions
  private _checkSigner() {
    if (!this.contract.runner || !(this.contract.runner as Signer)) {
      throw new Error(
        `❌  🖊️  Cannot write transactions without a valid signer. Use connect() method.`
      );
    }
  }
  private _mustBeAddress(address: string) {
    if (!isAddress(address)) {
      throw new Error(`❌  ⬇️  Bad input address is not a valid address: ${address}`);
    }
  }
}
