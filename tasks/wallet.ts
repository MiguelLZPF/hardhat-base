import { subtask, task, types } from "hardhat/config";
import Environment from "models/Configuration";
import { SignerInformation } from "models/Tasks";
import CustomWallet from "models/Wallet";
import { HDNodeWallet } from "ethers";

export const createSigner = subtask(
  "create-signer",
  "Creates new signer from given params",
)
  // Signer params
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root to store the wallets",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "password",
    "Password to decrypt the wallet",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "privateKey",
    "A private key in hexadecimal can be used to sign",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "mnemonicPhrase",
    "Mnemonic phrase to generate wallet from",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "mnemonicPath",
    "Mnemonic path to generate wallet from",
    undefined,
    types.string,
  )
  .setAction(async (args: SignerInformation, hre) => {
    const { provider } = new Environment(hre);
    let wallet: CustomWallet | HDNodeWallet | undefined;
    if (args.privateKey) {
      wallet = new CustomWallet(args.privateKey, provider);
    } else if (args.mnemonicPhrase) {
      wallet = CustomWallet.fromPhrase(
        args.mnemonicPhrase.toLowerCase() === "default"
          ? undefined
          : args.mnemonicPhrase,
        provider,
        args.mnemonicPhrase.toLowerCase() === "default"
          ? undefined
          : args.mnemonicPath,
      );
    } else if (args.relativePath) {
      wallet = CustomWallet.fromEncryptedJsonSync(
        args.relativePath,
        args.password,
      );
    } else {
      throw new Error(
        "❌  Cannot get a wallet from parameters, needed private key or mnemonic or path",
      );
    }
    return wallet;
  });
