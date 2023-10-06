import { Provider, Signer, ContractRunner, BigNumberish } from "ethers";
import { Storage as StorageType, Storage__factory } from "typechain-types";
import CustomContract from "./CustomContract";

export default class Storage extends CustomContract<StorageType> {
  // factory: Storage__factory;
  number: number | BigInt | undefined;

  constructor(address: string, signer: Signer);
  constructor(address: string, provider: Provider);
  constructor(address: string, runner: ContractRunner);
  constructor(address: string, runner: ContractRunner) {
    super(address, Storage__factory.abi, runner);
    this.number = undefined;
  }

  static async deployStorage(signer: Signer, initialValue?: number): Promise<StorageType> {
    return super.deploy<Storage__factory>(new Storage__factory(signer), undefined, [
      initialValue,
    ]) as unknown as StorageType;
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
    if ((await this._checkExecutionEvent(events)) !== true) {
      throw new Error(
        `❌  ⛓️  Cannot store ${num} in ${this.contract.getAddress()}. Execution event not found`
      );
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
}
