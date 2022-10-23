import * as fs from "async-file";
import util from "util";
import { constants } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BlockTag, JsonRpcProvider } from "@ethersproject/providers";
import { INetwork, networks } from "../models/Deploy";

// Global HRE, Ethers Provider and network parameters
export let ghre: HardhatRuntimeEnvironment;
export let gEthers: HardhatRuntimeEnvironment["ethers"];
export let gProvider: JsonRpcProvider;
export let gCurrentNetwork: INetwork;

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
  gCurrentNetwork = networks.get(
    gProvider.network ? gProvider.network.chainId : (await gProvider.getNetwork()).chainId
  )!;
  return { gProvider, gCurrentNetwork };
};

/**
 * Check if directories are present, if they aren't, create them
 * @param reqDirectories Required directories tree in hierarchical order
 */
export const checkDirectories = async (reqDirectories: string[]) => {
  for (const directory of reqDirectories) {
    if (!(await fs.exists(directory))) {
      await fs.mkdir(directory);
    }
  }
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

export const getTimeStamp = async (block?: BlockTag, provider?: JsonRpcProvider) => {
  provider = provider ? provider : gProvider;
  if (block) {
    return (await provider.getBlock(block)).timestamp;
  } else {
    return (await provider.getBlock("latest")).timestamp;
  }
};

export const stringToStringHexFixed = async (inputString: string, length: number) => {
  const nameBuffer = Buffer.from(inputString, "utf-8");
  const nameInBytes = nameBuffer.toString("hex");
  return `0x${nameInBytes}${Buffer.from(new Uint8Array(length - nameBuffer.byteLength)).toString(
    "hex"
  )}`;
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
