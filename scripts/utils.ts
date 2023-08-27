import { BLOCKCHAIN, CONTRACTS } from "configuration";
import { ContractName, INetwork, NetworkName } from "models/Configuration";
import { Artifact, HardhatRuntimeEnvironment } from "hardhat/types";
import { Contract, Signer, Provider, BlockTag } from "ethers";
import { existsSync, mkdirSync, readFileSync } from "fs";
import util from "util";
import { getContractDeployment } from "./deploy";
import { IRegularDeployment, IUpgradeDeployment } from "models/Deploy";

// Global HRE, Ethers Provider and network parameters
export let ghre: HardhatRuntimeEnvironment;
export let gEthers: HardhatRuntimeEnvironment["ethers"];
export let gProvider: Provider;
export let gNetwork: INetwork;

/**
 * Set Global HRE
 * @param hre HardhatRuntimeEnvironment to be set as global
 */
export const setGlobalHRE = async (hre: HardhatRuntimeEnvironment) => {
  ghre = hre;
  gEthers = hre.ethers;
  gProvider = hre.ethers.getDefaultProvider(hre.network);
  // get the current network parameters based on chainId
  gNetwork = BLOCKCHAIN.networks.get(chainIdToNetwork.get((await gProvider.getNetwork()).chainId))!;
  return { gProvider, gNetwork };
};

export const chainIdToNetwork = new Map<BigInt | undefined, NetworkName>([
  [undefined, "hardhat"],
  [BLOCKCHAIN.networks.get("hardhat")!.chainId, "hardhat"],
  [BLOCKCHAIN.networks.get("ganache")!.chainId, "ganache"],
  [BLOCKCHAIN.networks.get("mainTest")!.chainId, "mainTest"],
]);

export function getArtifact(contractName?: ContractName, path?: string): Artifact {
  path = path ? path : CONTRACTS.get(contractName!)!.artifact;
  return JSON.parse(readFileSync(path, "utf-8")) as Artifact;
}

/**
 * Create a new instance of a deployed contract
 * @param contractName name that identifies a contract in the context of this project
 * @param signer (optional) [undefined] signer to be used to sign TXs by default
 * @param contractAddr (optional) [Contracts.<contractName>.<network>.address] address of the deployed contract
 * @returns instance of the contract attached to contractAddr and connected to signer or provider
 */
export const getContractInstance = async <T = Contract>(
  contractName: ContractName,
  signerOrProvider: Signer | Provider = gProvider,
  contractOrAddress?: string | Contract
): Promise<T> => {
  // get contract information from deployments file (async)
  const deployment = getContractDeployment(contractName);
  // get artifact from config file
  const artifact = getArtifact(contractName);
  // get the contract's addres from 1. parameter, 2. config file or 3. deployments.json
  const finalAddress =
    typeof contractOrAddress == "string"
      ? contractOrAddress
      : (await contractOrAddress?.getAddress()) ||
        CONTRACTS.get(contractName)?.address.get(gNetwork.name) ||
        ((await deployment) as IRegularDeployment)?.address ||
        ((await deployment) as IUpgradeDeployment).logic;
  // Check if valid address was found
  if (!finalAddress) {
    throw new Error(
      `Cannot find contract ${contractName} address in parameter | config file | deployments file`
    );
  }
  // create and return contract instance
  const contract = new Contract(finalAddress, artifact.abi, signerOrProvider);
  return contract as T;
};

/**
 * Check if directories are present, if they aren't, create them
 * @param reqPath path to extract directories and check them
 */
export const checkDirectoriesInPath = (reqPath: string) => {
  // get all directories to be checked, including keystore root
  const splitPath = reqPath.split("/");
  let directories: string[] = [splitPath[0]];
  for (let i = 1; i < splitPath.length - 1; i++) {
    directories.push(directories[i - 1] + "/" + splitPath[i]);
  }
  checkDirectories(directories);
};

/**
 * Check if directories are present, if they aren't, create them
 * @param reqDirectories Required directories tree in hierarchical order
 */
export const checkDirectories = (reqDirectories: string[]) => {
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
export const getTimeStamp = async (block?: BlockTag, provider: Provider = gProvider) => {
  return (await provider.getBlock(block || "latest"))?.timestamp;
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

/**
 * Checks if an object is empty.
 * An object is considered empty if it has no enumerable properties.
 *
 * @param obj - The object to be checked for emptiness.
 * @returns `true` if the object is empty, `false` otherwise.
 *
 * @example
 * const emptyObject = {};
 * const nonEmptyObject = { key: 'value' };
 *
 * console.log(isObjectEmpty(emptyObject)); // Output: true
 * console.log(isObjectEmpty(nonEmptyObject)); // Output: false
 */
export function isObjectEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}
