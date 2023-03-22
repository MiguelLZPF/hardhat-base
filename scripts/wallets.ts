import { KEYSTORE } from "configuration";
import { Wallet } from "ethers";
import { Mnemonic } from "ethers/lib/utils";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { checkDirectoriesInPath, ghre } from "scripts/utils";

/**
 * Generate multiple wallets and optionally store them encryped if a path is provided using password
 * @param relativePath path relative to the KEYSTORE.root constant
 * @param encryptPassword password to encrypt json wallet file. If not provided, uses DEF_WALLET_PASS constant
 * @param entropy optional entropy for new generated wallet files
 * @param batchSize optional param to specify the number of wallets to generate
 * @param mnemonic if provided uses this mnemonic to generate wallet files
 * @param	connect weather to connect to the provider or not
 * @returns returns the decryped wallet object
 */
export const generateWallets = async (
  relativePath?: string,
  encryptPassword: string = KEYSTORE.default.password,
  batchSize: number = KEYSTORE.default.batchSize,
  entropy?: Buffer,
  mnemonic?: Mnemonic,
  connect?: boolean
) => {
  if (relativePath) {
    // remove "/" and ".json"
    relativePath =
      relativePath[0] == "/"
        ? relativePath.substring(1).replace(".json", "")
        : relativePath.replace(".json", "");
  }
  // generate if not exists
  let wallets: Promise<Wallet>[] = [];
  for (let w = 0; w < batchSize; w++) {
    let finalRelPath: string | undefined;
    if (relativePath) {
      // insert "0" if less than 10
      finalRelPath = w < 10 ? `${relativePath}0${w}.json` : `${relativePath}${w}.json`;
    }
    let finalMnemonic: Mnemonic | undefined;
    if (mnemonic && mnemonic.phrase) {
      finalMnemonic = {
        phrase: mnemonic.phrase,
        path: `${mnemonic.path}/${w}`,
        locale: mnemonic.locale,
      };
    }
    wallets.push(
      generateWallet(finalRelPath, encryptPassword, entropy, undefined, finalMnemonic, connect)
    );
  }
  return await Promise.all(wallets);
};

/**
 * Generate a new wallet and optionally store it encryped if a path is provided using password
 * @param relativePath path relative to the KEYSTORE.root constant
 * @param encryptPassword password to encrypt json wallet file
 * @param entropy entropy for new generated wallet files
 * @param privateKey if provided uses this private key to generate wallet file
 * @param mnemonic if provided uses this mnemonic to generate wallet file
 * @param	connect weather to connect to the provider or not
 * @returns returns the decryped wallet object
 */
export const generateWallet = async (
  relativePath?: string,
  encryptPassword: string = KEYSTORE.default.password,
  entropy?: Buffer,
  privateKey?: string,
  mnemonic?: Mnemonic,
  connect?: boolean
) => {
  let checking: Promise<void> | undefined;
  let path: string | undefined;
  if (relativePath) {
    // remove "/"
    relativePath = relativePath[0] == "/" ? relativePath.substring(1) : relativePath;
    // add .json extension
    relativePath = relativePath.endsWith(".json") ? relativePath : `${relativePath}.json`;
    // full path relative to project root. example: keystore/relativePath"
    path = `${KEYSTORE.root}/${relativePath}`;
    checking = checkDirectoriesInPath(path);
  }
  // get passwordfrom param or default
  if (!encryptPassword) {
    encryptPassword = KEYSTORE.default.password;
    console.warn("WARN: No password specified, using default password");
  }

  let wallet: Wallet;
  if (privateKey) {
    wallet = new Wallet(privateKey);
  } else if (mnemonic && mnemonic.phrase) {
    wallet = Wallet.fromMnemonic(mnemonic.phrase, mnemonic.path);
  } else {
    wallet = Wallet.createRandom({ extraEntropy: entropy });
  }
  if (path) {
    const encWallet = wallet.encrypt(encryptPassword);
    await checking;
    if (existsSync(path)) {
      throw new Error(`Wallet already exists at ${path}`);
    }
    writeFileSync(path, await encWallet);
    console.log(
      `New Wallet created, encrypted and stored with address: ${wallet.address} as ${path}`
    );
  }
  console.log(`New Wallet instance created with address: ${wallet.address}`);
  return connect ? wallet.connect(ghre.ethers.provider) : wallet;
};

/**
 * Decrypt a wallet from the given path using password
 * @param relativePath path relative to the KEYSTORE.root constant
 * @param password password to decrypt json wallet file
 * @param	connect weather to connect to the provider or not
 * @returns
 */
export const decryptWallet = async (
  relativePath: string,
  password: string = KEYSTORE.default.password,
  connect?: boolean
) => {
  // remove "/"
  relativePath = relativePath[0] == "/" ? relativePath.substring(1) : relativePath;
  const wallet = Wallet.fromEncryptedJsonSync(
    readFileSync(`${KEYSTORE.root}/${relativePath}`, "utf-8"),
    password
  );
  return connect ? wallet.connect(ghre.ethers.provider) : wallet;
};
