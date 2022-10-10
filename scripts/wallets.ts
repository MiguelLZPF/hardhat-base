import { ENV } from "../configuration";
import * as fs from "async-file";
import { Wallet } from "ethers";
import { Mnemonic } from "ethers/lib/utils";
import { checkDirectoriesInPath, ghre } from "./utils";

/**
 * Generate a new wallet and store it encryped in the given path using password
 * @param relativePath path relative to the KEYSTORE_ROOT constant (ENV)
 * @param password optional password to encrypt json wallet file. If not provided, uses DEF_WALLET_PASS constant
 * @param entropy optional entropy for new generated wallet files
 * @param batchSize optional param to specify the number of wallets to generate
 * @returns returns the decryped wallet object
 */
export const generateWalletBatch = async (
  relativePath: string,
  password?: string,
  batchSize?: number,
  entropy?: Buffer
) => {
  // Parameter assignment
  batchSize = batchSize ? batchSize : ENV.KEYSTORE.default.batchSize;
  // remove "/"
  relativePath = relativePath[0] == "/" ? relativePath.substring(1) : relativePath;
  // full path relative to project root. example: keystore/relativePath"
  const path = `${ENV.KEYSTORE.root}/${relativePath}`;
  await checkDirectoriesInPath(path);
  // generate if not exists
  let wallets: Promise<Wallet>[] = [];
  for (let u = 0; u < batchSize; u++) {
    // insert "0" if less than 10
    const finalPath = u < 10 ? `${relativePath}0${u}.json` : `${relativePath}${u}.json`;
    if (!(await fs.exists(finalPath))) {
      wallets.push(generateWallet(finalPath, password, entropy));
    } else {
      console.log(`Wallet already exists at ${finalPath}`);
    }
  }
  return await Promise.all(wallets);
};

/**
 * Generate a new wallet and store it encryped in the given path using password
 * @param relativePath path relative to the KEYSTORE_ROOT constant (ENV)
 * @param password optional password to encrypt json wallet file. If not provided, uses DEF_WALLET_PASS constant
 * @param entropy optional entropy for new generated wallet files
 * @param privateKey if provided uses this private key to generate wallet file
 * @param mnemonic if provided uses this mnemonic phrase to generate wallet file
 * @returns returns the decryped wallet object
 */
export const generateWallet = async (
  relativePath: string,
  password?: string,
  entropy?: Buffer,
  privateKey?: string,
  mnemonic?: Mnemonic
) => {
  // remove "/"
  relativePath = relativePath[0] == "/" ? relativePath.substring(1) : relativePath;
  // full path relative to project root. example: keystore/relativePath"
  const path = `${ENV.KEYSTORE.root}/${relativePath}`;
  const checking = checkDirectoriesInPath(path);
  // get passwordfrom param or default
  if (!password) {
    password = ENV.KEYSTORE.default.password;
    console.warn("WARN: No password specified, using default password");
  }

  let wallet: Wallet;
  if (privateKey) {
    wallet = new Wallet(privateKey);
  } else if (mnemonic) {
    wallet = Wallet.fromMnemonic(mnemonic.phrase, mnemonic.path);
  } else {
    wallet = Wallet.createRandom({ extraEntropy: entropy });
  }
  const encWallet = await wallet.encrypt(password);
  await checking;
  await fs.writeFile(path, encWallet);
  console.log(`New Wallet created and stored with address: ${wallet.address} as ${path}`);
  return wallet;
};

export const decryptWallet = async (relativePath: string, password: string, connect?: boolean) => {
  const wallet = Wallet.fromEncryptedJsonSync(
    await fs.readFile(ENV.KEYSTORE.root.concat(relativePath)),
    password
  );
  return connect ? wallet.connect(ghre.ethers.provider) : wallet;
};
