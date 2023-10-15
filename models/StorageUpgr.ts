import {
  Provider,
  Signer,
  ContractRunner,
  BigNumberish,
  Overrides,
  isAddress,
} from "ethers";
import {
  OwnableUpgradeable,
  StorageUpgr as StorageType,
  StorageUpgr__factory,
} from "typechain-types";
import CustomUpgrContract, {
  ICCUpgrDeployResult,
} from "models/CustomUpgrContract";
import { GAS_OPT } from "configuration";

export default class StorageUpgr extends CustomUpgrContract<
  StorageType & OwnableUpgradeable
> {
  // factory: Storage__factory;
  number: number | BigInt | undefined;

  constructor(proxy: string, signer: Signer, logic: string, proxyAdmin: string);
  constructor(
    proxy: string,
    provider: Provider,
    logic: string,
    proxyAdmin: string,
  );
  constructor(
    proxy: string,
    runner: ContractRunner,
    logic: string,
    proxyAdmin: string,
  );
  constructor(
    proxy: string,
    runner: ContractRunner,
    logic: string,
    proxyAdmin: string,
  ) {
    super(proxy, StorageUpgr__factory.abi, runner, logic, proxyAdmin);
    this.number = undefined;
  }

  static async deployStorage(
    signer: Signer,
    proxyAdmin: string,
    initialValue?: number,
    overrides: Overrides = GAS_OPT.max,
    initialize = false,
  ): Promise<IStorageUpgrDeployResult> {
    const deployResult = await super.deployUpgradeable<
      StorageUpgr__factory,
      StorageType & OwnableUpgradeable
    >(
      new StorageUpgr__factory(signer),
      proxyAdmin,
      signer,
      initialValue ? [initialValue] : undefined,
      overrides,
      initialize,
    );
    return {
      contract: new StorageUpgr(
        deployResult.contract.proxyAddress,
        signer,
        deployResult.contract.logicAddress,
        proxyAdmin,
      ),
      receipt: deployResult.receipt,
    };
  }

  async upgradeStorage(
    initialValue?: number,
    overrides?: Overrides,
    initialize = false,
  ): Promise<ICCUpgrDeployResult<StorageType>> {
    return super.upgrade(
      StorageUpgr__factory.bytecode,
      initialValue ? [initialValue] : undefined,
      overrides,
      initialize,
    );
  }

  //* Custom contract functions
  // Ownable
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

export interface IStorageUpgrDeployResult
  extends Omit<ICCUpgrDeployResult<StorageType>, "contract"> {
  contract: StorageUpgr;
}
