import {
  Provider,
  Signer,
  Interface,
  InterfaceAbi,
  ContractFactory,
  BaseContract,
  Contract,
  ContractRunner,
  ContractMethodArgs,
  ContractTransactionReceipt,
  BytesLike,
  Overrides,
  keccak256,
} from "ethers";
import { PROXY_ADMIN_CODEHASH } from "scripts/utils";
import CustomContract, { ICCDeployResult } from "./CustomContract";
import {
  ProxyAdmin,
  ProxyAdmin__factory,
  TUP,
  TUP__factory,
  TransparentUpgradeableProxy__factory,
} from "typechain-types";

export default class CustomUpgrContract<
  C extends BaseContract,
> extends CustomContract<C> {
  //* Properties
  proxy: TUP;
  logic: C;
  proxyAdmin?: ProxyAdmin;
  proxyAddress: string = this.address;
  logicAddress: string;
  proxyAdminAddress?: string;
  //* Contructor
  constructor(
    proxy: string,
    abi: Interface | InterfaceAbi,
    signer: Signer,
    logic: string,
    proxyAdmin?: string,
  );
  constructor(
    proxy: string,
    abi: Interface | InterfaceAbi,
    provider: Provider,
    logic: string,
    proxyAdmin?: string,
  );
  constructor(
    proxy: string,
    abi: Interface | InterfaceAbi,
    runner: ContractRunner,
    logic: string,
    proxyAdmin?: string,
  );
  constructor(
    proxy: string,
    abi: Interface | InterfaceAbi,
    runner: ContractRunner,
    logic: string,
    proxyAdmin?: string,
  ) {
    super(proxy, abi, runner);
    this._mustBeAddress(logic);
    this.proxy = new Contract(
      proxy,
      TUP__factory.abi,
      runner,
    ) as unknown as TUP;
    this.logic = new Contract(logic, abi, runner) as unknown as C;
    this.proxyAdmin = proxyAdmin
      ? (new Contract(
          proxyAdmin,
          ProxyAdmin__factory.abi,
          runner,
        ) as unknown as ProxyAdmin)
      : undefined;
    this.logicAddress = logic;
    proxyAdmin ? this._checkProxyAdmin() : undefined;
  }
  //* Static methods
  static async deployUpgradeable<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    abi: Interface | InterfaceAbi,
    bytecode: BytesLike | { object: string },
    proxyAdmin: string,
    signer: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
    initialize?: boolean,
  ): Promise<ICCUpgrDeployResult<C>>;
  static async deployUpgradeable<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    factory: F,
    proxyAdmin: string,
    signer?: Signer,
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
    initialize?: boolean,
  ): Promise<ICCUpgrDeployResult<C>>;
  static async deployUpgradeable<
    F extends ContractFactory = ContractFactory,
    C extends BaseContract = BaseContract,
  >(
    factoryOrAbi: F | Interface | InterfaceAbi,
    bytecodeOrProxyAdmin: BytesLike | { object: string } | string,
    proxyAdminOrSigner?: string | Signer,
    signerOrArgs?: Signer | ContractMethodArgs<any[]>,
    argsOrOverrides?: ContractMethodArgs<any[]> | Overrides,
    overridesOrInitialize?: Overrides | boolean,
    initialize = false,
  ): Promise<ICCUpgrDeployResult<C>> {
    let factory: F | undefined;
    let abi: Interface | InterfaceAbi | undefined;
    let bytecode: BytesLike | { object: string } | undefined;
    let proxyAdminAddress: string = "";
    let signer: Signer | undefined;
    let args: ContractMethodArgs<any[]> | undefined;
    let overrides: Overrides | undefined;
    //* Parse parameters
    // First parameter
    if (!(factoryOrAbi as F).deploy) {
      abi = factoryOrAbi as Interface | InterfaceAbi;
    } else {
      factory = factoryOrAbi as F;
    }
    // Second parameter
    if (typeof bytecodeOrProxyAdmin === "string") {
      proxyAdminAddress = bytecodeOrProxyAdmin as string;
    } else {
      bytecode = bytecodeOrProxyAdmin as BytesLike | { object: string };
    }
    // Third parameter
    if (proxyAdminOrSigner && typeof proxyAdminOrSigner === "string") {
      proxyAdminAddress = proxyAdminOrSigner as string;
    } else if (proxyAdminOrSigner) {
      signer = proxyAdminOrSigner as Signer;
    }
    // Fourth parameter
    if (signerOrArgs && (signerOrArgs as Signer).signMessage) {
      signer = signerOrArgs as Signer;
    } else if (signerOrArgs) {
      args = signerOrArgs as ContractMethodArgs<any[]>;
    }
    // Fifth parameter
    if (
      argsOrOverrides &&
      Array.isArray(argsOrOverrides as ContractMethodArgs<any[]>)
    ) {
      args = argsOrOverrides as ContractMethodArgs<any[]>;
    } else if (argsOrOverrides) {
      overrides = argsOrOverrides as Overrides;
    }
    // Sixth parameter
    if (overridesOrInitialize && typeof overridesOrInitialize === "boolean") {
      initialize = overridesOrInitialize as boolean;
    } else if (overridesOrInitialize) {
      overrides = overridesOrInitialize as Overrides;
    }
    // -- Check Signer before do anything else
    if (!signer && (!factory || !factory.runner)) {
      throw new Error(
        `❌  No valid Signer provided direcly or through the Factory.`,
      );
    }
    signer = signer ? signer : (factory?.runner as Signer);
    //* Implementation
    //* Actual contracts
    // Deploy main | logic contract
    let deployResult: Promise<ICCDeployResult<C>>;
    if (factory) {
      deployResult = super.deploy<F, C>(factory, signer, [], overrides);
    } else if (abi && bytecode && signer) {
      deployResult = super.deploy<F, C>(abi, bytecode, signer, [], overrides);
    } else {
      throw new Error(`❌  ⬇️  Invalid paramaters for upgradeable deployment`);
    }
    // Check deployment result
    const logic = (await deployResult).contract;
    if (!logic || !logic.address) {
      throw new Error("❌  ⛓️  Logic | Implementation not deployed properly");
    }
    const logicReceipt = (await deployResult).receipt;
    if (!logicReceipt) {
      throw new Error(
        `❌  ⛓️  Bad logic deployment receipt. Receipt undefined after deployment`,
      );
    }
    // Encode function params for TUP
    let initData: string;
    if (initialize && args && args.length > 0) {
      initData = logic.contract.interface.encodeFunctionData("initialize", [
        ...args,
      ]);
    } else {
      initData = logic.contract.interface._encodeParams([], []);
    }
    // Deploy TUP - Transparent Upgradeable Proxy
    const tupDeployResult = await super.deploy<TUP__factory, TUP>(
      new TUP__factory(signer),
      signer,
      [logic.address, proxyAdminAddress, initData],
      overrides,
    );
    // Check deployment result
    const tuProxy = tupDeployResult.contract;
    if (!tuProxy || !tuProxy.address) {
      throw new Error("❌  ⛓️  Proxy | Storage not deployed properly");
    }
    const tupReceipt = tupDeployResult.receipt;
    if (!tupReceipt) {
      throw new Error(
        `❌  ⛓️  Bad TUP deployment receipt. Receipt undefined after deployment`,
      );
    }
    //* Result
    // Create Custom Upgradeable Contract Instance
    return {
      contract: new CustomUpgrContract<C>(
        tuProxy.address,
        logic.contract.interface,
        signer,
        logic.address,
        proxyAdminAddress,
      ),
      receipt: tupReceipt,
    };
  }
  //* Contract base functions
  async upgrade(
    newBytecode: BytesLike | { object: string },
    args?: ContractMethodArgs<any[]>,
    overrides?: Overrides,
    initialize = false,
  ): Promise<ICCUpgrDeployResult<C>> {
    this._checkSigner();
    this._requiredProxyAdmin();
    const previousLogicFromAdmin = this.proxy.getImplementation();
    // Deploy NEW main | logic contract
    const deployResult = await CustomContract.deploy(
      this.logic.interface,
      newBytecode,
      this.proxy.runner as Signer,
      args,
      overrides,
    );
    // Check deployment result
    const newLogic = deployResult.contract;
    if (!newLogic || !newLogic.address) {
      throw new Error("❌  ⛓️  Logic | Implementation not deployed properly");
    }
    const logicReceipt = await newLogic.contract
      .deploymentTransaction()
      ?.wait();
    if (!logicReceipt) {
      throw new Error(
        `❌  ⛓️  Bad logic deployment receipt. Receipt undefined after deployment`,
      );
    }
    // Encode function params for TUP
    let upgrReceipt: ContractTransactionReceipt | null;
    let initData: string;
    if (initialize && args && args.length > 0) {
      initData = newLogic.contract.interface.encodeFunctionData("initialize", [
        ...args,
      ]);
    } else {
      initData = newLogic.contract.interface._encodeParams([], []);
    }
    // Upgrade contract to use new logic
    upgrReceipt = await (
      await this.proxyAdmin!.upgradeAndCall(
        this.proxyAddress,
        newLogic.address,
        initData,
      )
    ).wait();
    // Check if upgrade done correctly
    if (!upgrReceipt) {
      throw new Error(
        "❌  ⛓️  Transaction execution failed. Undefined Receipt",
      );
    }
    const newLogicFromAdmin = await this.proxy.getImplementation();
    if (newLogicFromAdmin == (await previousLogicFromAdmin)) {
      throw new Error(
        "❌  ⛓️  Upgrade failed. Previous address and new one are the same",
      );
    }
    if (newLogicFromAdmin != newLogic.address) {
      throw new Error("❌  ⛓️  Upgrade failed. Logic addresess does not match");
    }
    //* Result
    // Create Custom Upgradeable Contract Instance
    return {
      contract: new CustomUpgrContract<C>(
        this.proxyAddress,
        newLogic.contract.interface,
        this.proxy.runner as Signer,
        newLogic.address,
        this.proxyAdminAddress,
      ),
      receipt: logicReceipt,
    };
  }
  //* Protected generic functions
  protected async _checkProxyAdmin() {
    // -- Check if Proxy Admin is a ProxyAdmin Contract
    try {
      const proxyAdminCode = (await this.proxyAdmin!.getDeployedCode())!;
      if (keccak256(proxyAdminCode) != PROXY_ADMIN_CODEHASH) {
        throw new Error(
          `❌  ProxyAdmin(at address: ${this.proxyAdminAddress}) is not a ProxyAdmin Contract`,
        );
      }
    } catch (error) {
      throw new Error(
        `❌  ProxyAdmin(at address: ${this.proxyAdminAddress}) is not a ProxyAdmin Contract`,
      );
    }
  }
  protected _requiredProxyAdmin() {
    if (!this.proxyAdmin) {
      throw new Error(`❌  ProxyAdmin needded to be defined before`);
    }
  }
}

export interface ICCUpgrDeployResult<C extends BaseContract = BaseContract>
  extends Omit<ICCDeployResult<C>, "contract"> {
  contract: CustomUpgrContract<C>;
}
