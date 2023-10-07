import { Provider, Signer, ContractRunner, BigNumberish, Overrides } from "ethers";
import { StorageUpgr as StorageType, StorageUpgr__factory } from "typechain-types";
import CustomUpgrContract, { ICCUpgrDeployResult } from "models/CustomUpgrContract";

export default class StorageUpgr extends CustomUpgrContract<StorageType> {
  // factory: Storage__factory;
  number: number | BigInt | undefined;

  constructor(proxy: string, signer: Signer, logic: string, proxyAdmin: string);
  constructor(proxy: string, provider: Provider, logic: string, proxyAdmin: string);
  constructor(proxy: string, runner: ContractRunner, logic: string, proxyAdmin: string);
  constructor(proxy: string, runner: ContractRunner, logic: string, proxyAdmin: string) {
    super(proxy, StorageUpgr__factory.abi, runner, logic, proxyAdmin);
    this.number = undefined;
  }

  static async deployStorage(
    signer: Signer,
    proxyAdmin: string,
    initialValue?: number,
    overrides?: Overrides,
    initialize = false
  ): Promise<StorageType> {
    return super.deployUpgradeable<StorageUpgr__factory>(
      new StorageUpgr__factory(signer),
      proxyAdmin,
      signer,
      initialValue ? [initialValue] : undefined,
      overrides,
      initialize
    ) as unknown as StorageType;
  }

  async upgradeStorage(
    initialValue?: number,
    overrides?: Overrides,
    initialize = false
  ): Promise<ICCUpgrDeployResult<StorageType>> {
    return super.upgrade(
      StorageUpgr__factory.bytecode,
      initialValue ? [initialValue] : undefined,
      overrides,
      initialize
    );
  }

  //* Custom contract functions
  async store(num: BigNumberish, overrides?: Overrides) {
    // Check if valid signer
    this._checkSigner();
    // Actual transaction
    const receipt = await (await this.contract.store(num, { ...overrides })).wait();
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
