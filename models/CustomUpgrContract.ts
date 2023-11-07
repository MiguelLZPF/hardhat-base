import {
  Signer,
  Interface,
  InterfaceAbi,
  ContractFactory,
  BaseContract,
  ContractRunner,
  ContractTransactionResponse,
  ContractMethodArgs,
  BytesLike,
  Overrides,
  Addressable,
  isAddress,
  isBytesLike,
  EventLog,
} from "ethers";
import { upgrades } from "hardhat";
import CustomContract, { ICCDeployResult } from "models/CustomContract";
import {
  ERC1967Proxy,
  ERC1967Proxy__factory,
  UUPSUpgradeable,
} from "typechain-types";

export default class CustomUpgrContract<
  C extends CBaseContract,
> extends CustomContract<C> {
  //* Properties
  proxy: ERC1967Proxy;
  logic: C;
  // proxyAddress: string | Addressable;
  logicAddress: string | Addressable;
  //* Contructor
  constructor(proxy: ERC1967Proxy, logic: C);
  constructor(
    proxyAddr: string,
    logicAddr: string,
    abi: Interface | InterfaceAbi,
    runner: ContractRunner,
  );
  constructor(
    proxyOrAddress: string | ERC1967Proxy,
    logicOrAddress: string | C,
    abi?: Interface | InterfaceAbi,
    runner?: ContractRunner,
  ) {
    //* Check parameters
    let proxy: ERC1967Proxy | undefined;
    let proxyAddress: string | Addressable | undefined;
    let logic: C | undefined;
    let logicAddress: string | Addressable | undefined;
    // First Parameter
    if (typeof proxyOrAddress === "string") {
      proxyAddress = proxyOrAddress as string;
    } else {
      proxy = proxyOrAddress as ERC1967Proxy;
    }
    // Second Parameter
    if (typeof logicOrAddress === "string") {
      logicAddress = logicOrAddress as string;
    } else {
      logic = logicOrAddress as C;
    }
    //* Implementation
    if (proxy && logic) {
      // Use proxy address with logic's Interface
      super(logic.attach(proxy.target) as C);
      this.proxy = proxy;
      this.logic = logic;
      this.logicAddress = logic.target;
    } else if (proxyAddress && logicAddress && abi && runner) {
      // Use proxy address with logic's Interface
      super(proxyAddress, abi, runner);
      this._checkAddress(logicAddress);
      this.proxy = ERC1967Proxy__factory.connect(
        proxyAddress as string,
        runner,
      );
      this.logic = new BaseContract(logicAddress as string, abi, runner) as C;
      this.logicAddress = logicAddress;
    } else {
      throw new Error(`❌  Constructor unknown error`);
    }
  }
  //* Static methods
  static async deployUpgradeable<
    F extends ContractFactory = ContractFactory,
    C extends CBaseContract = CBaseContract,
  >(
    factory: F,
    signer?: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
  ): Promise<ICCUpgrDeployResult<C>>;
  static async deployUpgradeable<
    F extends ContractFactory = ContractFactory,
    C extends CBaseContract = CBaseContract,
  >(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    signer: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
  ): Promise<ICCUpgrDeployResult<C>>;
  static async deployUpgradeable<
    F extends ContractFactory = ContractFactory,
    C extends CBaseContract = CBaseContract,
  >(
    factoryOrAbi: F | Interface | InterfaceAbi,
    signerOrBytecode?: BytesLike | { object: string } | Signer,
    signerOrArgs?: Signer | ContractMethodArgs<any[]>,
    argsOrOverrides?: ContractMethodArgs<any[]> | Overrides,
    overrides?: Overrides,
  ): Promise<ICCUpgrDeployResult<C>> {
    let factory: F | undefined;
    let abi: Interface | InterfaceAbi | undefined;
    let bytecode: BytesLike | { object: string } | undefined;
    let signer: Signer | undefined;
    let args: ContractMethodArgs<any[]> | undefined;
    //* Parse parameters
    // First parameter
    if (!(factoryOrAbi as F).deploy) {
      abi = factoryOrAbi as Interface | InterfaceAbi;
    } else {
      factory = factoryOrAbi as F;
    }
    // Second parameter
    if (
      (signerOrBytecode &&
        typeof (signerOrBytecode as { object: string }).object === "string") ||
      isBytesLike(signerOrBytecode)
    ) {
      bytecode = signerOrBytecode as BytesLike | { object: string };
    } else if (signerOrBytecode) {
      signer = signerOrBytecode as Signer;
    }
    // Third parameter
    if (signerOrArgs && (signerOrArgs as Signer).signMessage) {
      signer = signerOrArgs as Signer;
    } else if (signerOrArgs) {
      args = signerOrArgs as ContractMethodArgs<any[]>;
    }
    // Fourth parameter
    if (
      argsOrOverrides &&
      Array.isArray(argsOrOverrides as ContractMethodArgs<any[]>)
    ) {
      args = argsOrOverrides as ContractMethodArgs<any[]>;
    } else if (argsOrOverrides) {
      overrides = argsOrOverrides as Overrides;
    }
    // -- Check Factory and Signer before do anything else
    if (abi && bytecode && signer) {
      factory = new ContractFactory(abi, bytecode, signer) as F;
    }
    if (!factory) {
      throw new Error(
        `❌  No valid Factory could be created. This should not happen 🤔 ...`,
      );
    }
    if (!signer && !factory.runner) {
      throw new Error(
        `❌  No valid Signer provided direcly or through the Factory. This should not happen 🤔 ...`,
      );
    }
    signer = signer ? signer : (factory?.runner as Signer);
    //* Implementation
    let contract = (await upgrades.deployProxy(factory, args, {
      kind: "uups",
      txOverrides: overrides,
    })) as unknown as C;
    // Wait for deployment
    contract = (await contract.waitForDeployment()) as C;
    // Get the Receipt
    const receipt = await contract.deploymentTransaction()?.wait();
    if (!receipt) {
      throw new Error(`❌  ⛓️  Bad deployment receipt`);
    }
    // Get the Implementation address
    const events = (await contract.queryFilter(
      contract.filters.Upgraded(),
      receipt?.blockNumber,
      receipt?.blockNumber,
    )) as EventLog[];
    const implementation = events[0].args.implementation as string;
    if (!isAddress(implementation)) {
      throw new Error(`❌  ⛓️  Could not get implementation address`);
    }
    //* Result
    // Create Custom Upgradeable Contract Instance
    return {
      contract: new CustomUpgrContract<C>(
        await contract.getAddress(),
        implementation,
        factory.interface,
        signer,
      ),
      receipt: receipt,
    };
  }

  //* Contract base functions
  async upgrade<F extends ContractFactory = ContractFactory>(
    factory: F,
    overrides?: Overrides,
  ): Promise<ICCUpgrDeployResult<C>>;
  async upgrade<F extends ContractFactory = ContractFactory>(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    overrides?: Overrides,
  ): Promise<ICCUpgrDeployResult<C>>;
  async upgrade<F extends ContractFactory = ContractFactory>(
    factoryOrAbi: F | Interface | InterfaceAbi,
    overridesOrBytecode?: BytesLike | { object: string } | Overrides,
    overrides?: Overrides,
  ): Promise<ICCUpgrDeployResult<C>> {
    let factory: F | undefined;
    let abi: Interface | InterfaceAbi | undefined;
    let bytecode: BytesLike | { object: string } | undefined;
    //* Parse parameters
    // First parameter
    if (!(factoryOrAbi as F).deploy) {
      abi = factoryOrAbi as Interface | InterfaceAbi;
    } else {
      factory = factoryOrAbi as F;
    }
    // Second parameter
    if (
      (overridesOrBytecode &&
        typeof (overridesOrBytecode as { object: string }).object ===
          "string") ||
      isBytesLike(overridesOrBytecode)
    ) {
      bytecode = overridesOrBytecode as BytesLike | { object: string };
    } else if (overridesOrBytecode) {
      overrides = overridesOrBytecode as Overrides;
    }
    // Check Factory and Signer before do anything else
    if (abi && bytecode) {
      factory = new ContractFactory(abi, bytecode, this.signer) as F;
    }
    if (!factory) {
      throw new Error(
        `❌  No valid Factory could be created. This should not happen 🤔 ...`,
      );
    }
    factory =
      factory.runner && (factory.runner as Signer).signTransaction
        ? factory
        : (factory.connect(this.signer) as F);
    //* Function Implementation
    // Sotre previous receipt
    const blockBeforeUpgrade = this.provider.getBlockNumber();
    // Upgrade
    let newContract = (await upgrades.upgradeProxy(this.proxyAddress, factory, {
      kind: "uups",
      txOverrides: overrides,
    })) as unknown as C;
    // Get the Implementation address
    const events = (await newContract.queryFilter(
      newContract.filters.Upgraded(),
      await blockBeforeUpgrade,
      await this.provider.getBlockNumber(),
    )) as EventLog[];
    const implementation = events[0].args.implementation as string;
    if (!isAddress(implementation)) {
      throw new Error(`❌  ⛓️  Could not get implementation address`);
    }
    // Get transaction receipt from event
    const receipt = await events[0].getTransactionReceipt();
    if (!receipt) {
      throw new Error(`❌  ⛓️  Bad deployment receipt`);
    }
    //* Result
    // Update THIS object
    this.logicAddress = implementation;
    this.logic = new BaseContract(
      implementation,
      factory.interface,
      this.signer,
    ) as C;
    // Create and Return OPTIONAL Custom Upgradeable Contract Instance
    return {
      contract: new CustomUpgrContract<C>(this.proxy, this.logic),
      receipt: receipt,
    };
  }
  //* Contract base functions
  // Getters
  get proxyAddress() {
    return this.address;
  }
  get implementation() {
    return this.logic;
  }
  get implementationAddress() {
    return this.logicAddress;
  }
  get implementationInterface() {
    return this.logic.interface;
  }
  // Functions
  override attach(newProxy: string) {
    super.attach(newProxy);
    this.proxy = this.proxy.attach(newProxy) as ERC1967Proxy;
    return this;
  }
  override async getDeployedCode() {
    return this.logic.getDeployedCode();
  }
  //* Protected generic functions
}

export type CBaseContract =
  | ((BaseContract & {
      deploymentTransaction(): ContractTransactionResponse;
    } & Omit<BaseContract, keyof BaseContract>) &
      UUPSUpgradeable)
  | (BaseContract & UUPSUpgradeable);

export interface ICCUpgrDeployResult<C extends CBaseContract = CBaseContract>
  extends Omit<ICCDeployResult<C>, "contract"> {
  contract: CustomUpgrContract<C>;
}
