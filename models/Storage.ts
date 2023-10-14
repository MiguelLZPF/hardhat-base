import {
  Provider,
  Signer,
  ContractRunner,
  BigNumberish,
  Overrides,
  isAddress,
} from "ethers";
import {
  Ownable,
  Storage as StorageType,
  Storage__factory,
} from "typechain-types";
import CustomContract, { ICCDeployResult } from "models/CustomContract";
import { GAS_OPT } from "configuration";

export default class Storage extends CustomContract<StorageType & Ownable> {
  // factory: Storage__factory;
  number: number | BigInt | undefined;

  constructor(address: string, signer: Signer);
  constructor(address: string, provider: Provider);
  constructor(address: string, runner: ContractRunner);
  constructor(address: string, runner: ContractRunner) {
    super(address, Storage__factory.abi, runner);
    this.number = undefined;
  }

  static async deployStorage(
    signer: Signer,
    initialValue?: number,
    overrides: Overrides = GAS_OPT.max,
  ): Promise<IStorageDeployResult> {
    const deployResult = await super.deploy<
      Storage__factory,
      StorageType & Ownable
    >(
      new Storage__factory(signer),
      undefined,
      initialValue ? [initialValue] : undefined,
      overrides,
    );
    return {
      contract: new Storage(
        deployResult.contract.address,
        deployResult.contract.contract.runner as Signer,
      ),
      receipt: deployResult.receipt,
    };
  }

  //* Custom contract functions
  async transferOwnership(
    newOwner: string,
    overrides: Overrides = GAS_OPT.max,
  ) {
    // Check if valid address
    this._mustBeAddress(newOwner);
    // Check if valid signer
    this._checkSigner();
    // Get signer's address
    const oldOwner = (this.contract.runner as Signer).getAddress();
    // Actual transaction
    const receipt = await (
      await this.contract.transferOwnership(newOwner, { ...overrides })
    ).wait();
    if (!receipt) {
      throw new Error(
        `❌  ⛓️  Cannot transfer ownership to ${newOwner} in ${this.contract.getAddress()}. Receipt is undefined`,
      );
    }
    // Search for events to secure execution
    let events = await this.contract.queryFilter(
      this.contract.filters.OwnershipTransferred(await oldOwner, newOwner),
      receipt?.blockNumber,
      receipt?.blockNumber,
    );
    if ((await this._checkExecutionEvent(events)) !== true) {
      throw new Error(
        `❌  ⛓️  Cannot transfer ownership to ${newOwner} in ${this.contract.getAddress()}. Execution event not found`,
      );
    }
    // All OK Transacction executed
    return {
      oldOwner: await oldOwner,
      newOwner: newOwner,
      receipt: receipt,
      event: events[0],
    };
  }
  // Ownable
  async owner(): Promise<string | undefined> {
    const owner = await this.contract.owner();
    if (isAddress(owner)) {
      return owner;
    } else {
      return undefined;
    }
  }

  // Storage
  async store(num: BigNumberish, overrides: Overrides = GAS_OPT.max) {
    // Check if valid signer
    this._checkSigner();
    // Actual transaction
    const receipt = await (
      await this.contract.store(num, { ...overrides })
    ).wait();
    if (!receipt) {
      throw new Error(
        `❌  ⛓️  Cannot store ${num} in ${this.contract.getAddress()}. Receipt is undefined`,
      );
    }
    // Search for events to secure execution
    let events = await this.contract.queryFilter(
      this.contract.filters.Stored(num),
      receipt?.blockNumber,
      receipt?.blockNumber,
    );
    if ((await this._checkExecutionEvent(events)) !== true) {
      throw new Error(
        `❌  ⛓️  Cannot store ${num} in ${this.contract.getAddress()}. Execution event not found`,
      );
    }
    // All OK Transacction executed
    return { num: num, receipt: receipt, event: events[0] };
  }

  async payMe(overrides: Overrides = GAS_OPT.max) {
    // Check if valid signer
    this._checkSigner();
    // Actual transaction
    const receipt = await (await this.contract.payMe({ ...overrides })).wait();
    if (!receipt) {
      throw new Error(
        `❌  ⛓️  Cannot pay in ${this.address}. Receipt is undefined`,
      );
    }
    // Search for events to secure execution
    let events = await this.contract.queryFilter(
      this.contract.filters.ThankYou(
        await this.owner(),
        await (this.contract.runner as Signer).getAddress(),
        undefined,
      ),
      receipt?.blockNumber,
      receipt?.blockNumber,
    );
    if ((await this._checkExecutionEvent(events)) !== true) {
      throw new Error(
        `❌  ⛓️  Cannot pay in ${this.address}. Execution event not found`,
      );
    }
    // All OK Transacction executed
    return { receipt: receipt, event: events[0] };
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

export interface IStorageDeployResult
  extends Omit<ICCDeployResult<StorageType>, "contract"> {
  contract: Storage;
}
