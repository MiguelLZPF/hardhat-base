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
    //* Implementation
    // Upgrade
    let newContract = (await upgrades.upgradeProxy(this.proxy, factory, {
      kind: "uups",
      txOverrides: overrides,
    })) as unknown as C;
    // Wait for deployment
    newContract = (await newContract.waitForDeployment()) as C;
    // Get the Receipt
    const receipt = await newContract.deploymentTransaction()?.wait();
    if (!receipt) {
      throw new Error(`❌  ⛓️  Bad deployment receipt`);
    }
    // Get the Implementation address
    const events = (await newContract.queryFilter(
      newContract.filters.Upgraded(),
      receipt?.blockNumber,
      receipt?.blockNumber,
    )) as EventLog[];
    const implementation = events[0].args.implementation as string;
    if (!isAddress(implementation)) {
      throw new Error(`❌  ⛓️  Could not get implementation address`);
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
