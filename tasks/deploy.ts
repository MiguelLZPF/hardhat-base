import { task, types } from "hardhat/config";
import { GAS_OPT } from "configuration";
import Environment from "models/Configuration";
import * as TaskParams from "models/Tasks";
import * as Scripts from "scripts/deploy";
import CustomWallet from "models/Wallet";
import JSON5 from "json5";
import { HDNodeWallet } from "ethers";

export const deploy = task("deploy", "Deploy smart contracts on '--network'")
  .addPositionalParam(
    "contractName",
    "Name of the contract to deploy (main use: get factory)",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "contractArgs",
    "(Optional) [undefined] Contract initialize function's arguments if any",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "tag",
    "(Optional) [undefined] string to include metadata or anything related with a deployment",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "txValue",
    "Contract creation transaction value if any",
    undefined,
    types.int,
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
  .setAction(async (args: TaskParams.Deploy, hre) => {
    console.log(
      "\x1b[33m ❗️ WARNING: Remember to compile contracts if needed\x1b[0m",
    );
    const env = new Environment(hre);
    const deployer = (await hre.run("create-signer", {
      relativePath: args.relativePath,
      password: args.password,
      privateKey: args.privateKey,
      mnemonicPhrase: args.mnemonicPhrase,
      mnemonicPath: args.mnemonicPath,
    } as TaskParams.SignerInformation)) as CustomWallet | HDNodeWallet;
    const result = await Scripts.deploy(
      args.contractName,
      deployer,
      args.contractArgs ? JSON5.parse(args.contractArgs as string) : [],
      {
        ...GAS_OPT.max,
        value: args.txValue,
      },
      true,
      args.tag,
    );
    //* Print Result on screen
    console.info(
      "\n✅ 🎉 \x1b[32mContract deployed successfully!\x1b[0m Contract Information:",
      `\n  - Contract Name (id within this project): ${result.name}`,
      `\n  - Contract Address (proxy address if upgradeable deployment): ${result.address}`,
      result.upgradeable
        ? `\n  - Logic | Implementation Address (only if upgradeable deployment): ${result.logic}`
        : "",
      `\n  - Admin or Deployer: ${deployer.address}`,
      `\n  - Deploy Timestamp: ${result.timestamp}`,
      `\n  - Bytecode Hash: ${await result.codeHash()}`,
      `\n  - Tag: ${result.tag}`,
    );
  });

export const upgrade = task(
  "upgrade",
  "Upgrade a deployed smart contracts on '--network'",
)
  .addPositionalParam(
    "contractName",
    "Name of the contract to upgrade (main use: get factory)",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "address",
    "(Optional) [undefined] Contract address or proxy address",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "logic",
    "(Optional) [undefined] Contract logic address or implementation address",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "contractArgs",
    "(Optional) [undefined] Contract initialize function's arguments if any",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "tag",
    "(Optional) [undefined] string to include metadata or anything related with a deployment",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "txValue",
    "Contract creation transaction value if any",
    undefined,
    types.int,
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
  .setAction(async (args: TaskParams.Upgrade, hre) => {
    console.log(
      "\x1b[33m ❗️ WARNING: Remember to compile contracts if needed\x1b[0m",
    );
    const env = new Environment(hre);
    const upgrader = (await hre.run("create-signer", {
      relativePath: args.relativePath,
      password: args.password,
      privateKey: args.privateKey,
      mnemonicPhrase: args.mnemonicPhrase,
      mnemonicPath: args.mnemonicPath,
    } as TaskParams.SignerInformation)) as CustomWallet | HDNodeWallet;
    const result = await Scripts.upgrade(
      args.contractName,
      upgrader,
      args.contractArgs ? JSON5.parse(args.contractArgs as string) : [],
      {
        ...GAS_OPT.max,
        value: args.txValue,
      },
      args.address,
      args.logic,
      args.tag,
    );
    //* Print Result on screen
    console.info(
      "\n✅ 🎉 \x1b[32mContract upgraded successfully!\x1b[0m Contract Information:",
      `\n  - Contract Name (id within this project): ${result.name}`,
      `\n  - Contract Address (proxy address if upgradeable deployment): ${result.address}`,
      result.upgradeable
        ? `\n  - Logic | Implementation Address (only if upgradeable deployment): ${result.logic}`
        : "",
      `\n  - Admin or Deployer: ${upgrader.address}`,
      `\n  - Deploy Timestamp: ${result.timestamp}`,
      `\n  - Bytecode Hash: ${await result.codeHash()}`,
      `\n  - Tag: ${result.tag}`,
    );
  });
