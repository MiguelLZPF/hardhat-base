import { BLOCKCHAIN, CONTRACTS } from "configuration";
import { ContractName, INetwork, NetworkName } from "models/Configuration";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Contract, constants, Signer, ContractFactory } from "ethers";
import { BlockTag, JsonRpcProvider } from "@ethersproject/providers";
import { existsSync, mkdirSync, readFileSync } from "fs";
import util from "util";

// Global HRE, Ethers Provider and network parameters
export let ghre: HardhatRuntimeEnvironment;
export let gEthers: HardhatRuntimeEnvironment["ethers"];
export let gProvider: JsonRpcProvider;
export let gNetwork: INetwork;

export const ADDR_ZERO = constants.AddressZero;

/**
 * Set Global HRE
 * @param hre HardhatRuntimeEnvironment to be set as global
 */
export const setGlobalHRE = async (hre: HardhatRuntimeEnvironment) => {
  ghre = hre;
  gEthers = hre.ethers;
  gProvider = hre.ethers.provider;
  // get the current network parameters based on chainId
  gNetwork = BLOCKCHAIN.networks.get(
    chainIdToNetwork.get(
      gProvider.network ? gProvider.network.chainId : (await gProvider.getNetwork()).chainId
    )
  )!;
  return { gProvider, gNetwork };
};

export const chainIdToNetwork = new Map<number | undefined, NetworkName>([
  [undefined, "hardhat"],
  [BLOCKCHAIN.networks.get("hardhat")!.chainId, "hardhat"],
  [BLOCKCHAIN.networks.get("ganache")!.chainId, "ganache"],
  [BLOCKCHAIN.networks.get("mainTest")!.chainId, "mainTest"],
]);

/**
 * Create a new instance of a deployed contract
 * @param contractName name that identifies a contract in the context of this project
 * @param signer (optional) [undefined] signer to be used to sign TXs by default
 * @param contractAddr (optional) [Contracts.<contractName>.<network>.address] address of the deployed contract
 * @returns instance of the contract attached to contractAddr and connected to signer or provider
 */
export const getContractInstance = async (
  contractName: ContractName,
  signer?: Signer,
  contractAddr?: string
): Promise<Contract> => {
  const artifact = JSON.parse(readFileSync(CONTRACTS.get(contractName)!.artifact, "utf-8"));
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = factory.attach(
    contractAddr || CONTRACTS.get(contractName)!.address.get(gNetwork.name)!
  );
  return signer ? contract : contract.connect(gProvider);
};

/**
 * Check if directories are present, if they aren't, create them
 * @param reqPath path to extract directories and check them
 */
export const checkDirectoriesInPath = async (reqPath: string) => {
  // get all directories to be checked, including keystore root
  const splitPath = reqPath.split("/");
  let directories: string[] = [splitPath[0]];
  for (let i = 1; i < splitPath.length - 1; i++) {
    directories.push(directories[i - 1] + "/" + splitPath[i]);
  }
  //console.log(directories);
  await checkDirectories(directories);
};

/**
 * Check if directories are present, if they aren't, create them
 * @param reqDirectories Required directories tree in hierarchical order
 */
export const checkDirectories = async (reqDirectories: string[]) => {
  for (const directory of reqDirectories) {
    if (!existsSync(directory)) {
      mkdirSync(directory);
    }
  }
};

/**
 *
 * @param block (optional) [latest] block number or hash that reference the block to get the timestamp
 * @param provider (optional) [gProvider] the provider to use
 * @returns the timestamp in seconds
 */
export const getTimeStamp = async (block?: BlockTag, provider: JsonRpcProvider = gProvider) => {
  return (await provider.getBlock(block || "latest")).timestamp;
};

/**
 * Logs a Typescript object
 * @param object typescript object to be logged
 */
export const logObject = (object: any) => {
  return util.inspect(object, { showHidden: false, depth: null });
};

/**
 * Wait a number of miliseconds and then continues
 * @param ms number os miliseconds to wait for
 * @returns a promise that resolves when the wait is complete
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
