import { GAS_OPT } from "configuration";
import {
  Signer,
  Interface,
  InterfaceAbi,
  ContractFactory,
  BaseContract,
  ContractRunner,
  ContractTransactionResponse,
  ContractTransactionReceipt,
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
  logic?: C;
  proxyAddress: string | Addressable;
  logicAddress?: string | Addressable;
  //* Contructor
  constructor(proxy: ERC1967Proxy, logic?: C);
  constructor(
    proxyAddr: string,
    abi: Interface | InterfaceAbi,
    runner?: ContractRunner,
    logicAddr?: string,
  );
  constructor(
    proxyOrAddress: string | ERC1967Proxy,
    abiOrLogic?: Interface | InterfaceAbi | C,
    runner?: ContractRunner,
    logicAddr?: string,
  ) {
    //* Check parameters
    let proxy: ERC1967Proxy | undefined;
    let proxyAddress: string | Addressable | undefined;
    let abi: Interface | InterfaceAbi | undefined;
    let logic: C | undefined;
    // First Parameter
    if (typeof proxyOrAddress === "string") {
      proxyAddress = proxyOrAddress as string;
    } else {
      proxy = proxyOrAddress as ERC1967Proxy;
    }
    // Second Parameter
    if (abiOrLogic && proxy) {
      logic = abiOrLogic as C;
    } else if (abiOrLogic) {
      abi = abiOrLogic as Interface | InterfaceAbi;
    }
    //* Implementation
    if (proxy) {
      // Use proxy address with logic's Interface
      super(proxy as unknown as C);
      this.proxy = proxy;
      this.logic = logic;
      this.logicAddress = logic?.target;
    } else if (proxyAddress) {
      // Use proxy address with logic's Interface
      super(proxyAddress, abi!, runner!);
      this._checkAddress(proxyAddress);
      this.proxy = new BaseContract(
        proxyAddress as string,
        ERC1967Proxy__factory.abi,
        runner!,
      ) as ERC1967Proxy;
      this.logic = logicAddr
        ? (new BaseContract(logicAddr, abi!, runner!) as C)
        : undefined;
    } else {
      throw new Error(`❌  Constructor unknown error`);
    }
    this.proxyAddress = this.target;
    this.logicAddress = this.logic?.target;
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
        factory.interface,
        signer,
        implementation,
      ),
      receipt: receipt,
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
}

export type CBaseContract =
  | ((BaseContract & {
      deploymentTransaction(): ContractTransactionResponse;
    } & Omit<BaseContract, keyof BaseContract>) &
      UUPSUpgradeable)
  | (BaseContract & UUPSUpgradeable);

export interface ICCUpgrDeployResult<C extends BaseContract = BaseContract>
  extends Omit<ICCDeployResult<C>, "contract"> {
  contract: CustomUpgrContract<C>;
}
