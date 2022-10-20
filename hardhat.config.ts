import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
// import { ethers } from "hardhat"; //! Cannot be imported here or any file that is imported here because it is generated here
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment, HardhatUserConfig } from "hardhat/types";
import { BigNumber, Contract, Wallet } from "ethers";
import { Mnemonic } from "ethers/lib/utils";
import { ENV } from "./configuration";
import * as fs from "async-file";
import { decryptWallet, generateWallet, generateWalletBatch } from "./scripts/wallets";
import { deploy, deployUpgradeable, upgrade } from "./scripts/deploy";
import { logObject, setGlobalHRE } from "./scripts/utils";
import { IGenerateWallets } from "./models/Tasks";

//* TASKS
task("generate-wallets", "Generates Encryped JSON persistent wallets")
  .addPositionalParam("type", "Type of generation [single, batch]", "single", types.string)
  .addParam(
    "relativePath",
    "Path relative to PATH_KEYSTORE_ROOT to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam("password", "Wallet password", undefined, types.string)
  .addOptionalParam("entropy", "Wallet entropy", undefined, types.string)
  .addOptionalParam(
    "privateKey",
    "Private key to generate wallet from. Hexadecimal String format expected",
    undefined,
    types.string
  )
  .addOptionalParam(
    "mnemonicPhrase",
    "Mnemonic phrase to generate wallet from",
    undefined,
    types.string
  )
  .addOptionalParam(
    "mnemonicPath",
    "Mnemonic path to generate wallet from",
    undefined,
    types.string
  )
  .addOptionalParam(
    "batchSize",
    "Number of user wallets to be generated in batch",
    undefined,
    types.int
  )
  .setAction(async (taskArgs: IGenerateWallets) => {
    console.log(`Args: ${logObject(taskArgs)}`);
    if (taskArgs.type.toLowerCase() == "batch") {
      await generateWalletBatch(
        taskArgs.relativePath!,
        taskArgs.password,
        taskArgs.batchSize,
        taskArgs.entropy ? Buffer.from(taskArgs.entropy) : undefined
      );
    } else {
      await generateWallet(
        taskArgs.relativePath!,
        taskArgs.password,
        taskArgs.entropy ? Buffer.from(taskArgs.entropy) : undefined,
        taskArgs.privateKey,
        { phrase: taskArgs.mnemonicPhrase, path: taskArgs.mnemonicPath } as Mnemonic
      );
    }
  });

task("get-wallet-info", "Recover all information from an encrypted wallet")
  .addPositionalParam("path", "Full path where the encrypted wallet is located")
  .addOptionalPositionalParam("password", "Password to decrypt the wallet")
  .addFlag("showPrivate", "set to true if you want to show the private key and mnemonic phrase")
  .setAction(async ({ path, password, showPrivate }, hre) => {
    password = password ? password : ENV.KEYSTORE.default.password;
    const wallet = Wallet.fromEncryptedJsonSync(await fs.readFile(path), password);
    let privateKey = wallet.privateKey;
    let mnemonic = wallet.mnemonic;
    let mnemonicPhrase = mnemonic.phrase;
    if (showPrivate != true) {
      privateKey = "***********";
      mnemonicPhrase = "***********";
    }
    console.log(`
    Wallet information:
      - Address: ${wallet.address},
      - Public Key: ${wallet.publicKey},
      - Private Key: ${privateKey},
      - Mnemonic: 
        - Phrase: ${mnemonicPhrase},
        - Path: ${mnemonic.path}
      - ETH Balance (Wei): ${await hre.ethers.provider.getBalance(wallet.address)},
    `);
  });

task("get-mnemonic", "Recover mnemonic phrase from an encrypted wallet")
  .addPositionalParam("path", "Full path where the encrypted wallet is located")
  .addOptionalPositionalParam(
    "password",
    "Password to decrypt the wallet",
    ENV.KEYSTORE.default.password,
    types.string
  )
  .setAction(async ({ path, password }) => {
    const wallet = Wallet.fromEncryptedJsonSync(await fs.readFile(path), password);
    console.log(wallet.mnemonic);
  });

task("deploy", "Deploy smart contracts on '--network'")
  .addFlag("upgradeable", "Deploy as upgradeable")
  .addPositionalParam(
    "contractName",
    "Name of the contract to deploy",
    "Example_Contract",
    types.string
  )
  .addParam(
    "relativePath",
    "Path relative to KEYSTORE_ROOT to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam("password", "Password to decrypt the wallet")
  .addOptionalParam(
    "proxyAdmin",
    "Address of a deloyed Proxy Admin. Only if --upgradeable deployment",
    undefined,
    types.string
  )
  .addOptionalParam(
    "args",
    "Contract initialize function's arguments if any",
    undefined,
    types.json
  )
  .addOptionalParam("txValue", "Contract creation transaction value if any", undefined, types.int)
  .setAction(
    async (
      { upgradeable, contractName, relativePath, password, proxyAdmin, args, txValue },
      hre: HardhatRuntimeEnvironment
    ) => {
      args = args ? args : [];
      await setGlobalHRE(hre);
      await hre.run("compile");
      const signer = await decryptWallet(
        relativePath,
        password || ENV.KEYSTORE.default.password,
        true
      );
      if (upgradeable) {
        await deployUpgradeable(contractName, signer, args, txValue, proxyAdmin);
      } else {
        await deploy(contractName, signer, args, txValue);
      }
    }
  );

task("upgrade", "Upgrade smart contracts on '--network'")
  .addPositionalParam(
    "contractName",
    "Name of the contract to deploy",
    "Example_Storage",
    types.string
  )
  .addParam(
    "relativePath",
    "Path relative to KEYSTORE_ROOT to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam("password", "Password to decrypt the wallet")
  .addOptionalParam("proxy", "Address of the TUP proxy", undefined, types.string)
  .addOptionalParam("proxyAdmin", "Address of a deloyed Proxy Admin", undefined, types.string)
  .addOptionalParam(
    "args",
    "Contract initialize function's arguments if any",
    undefined,
    types.json
  )
  .setAction(
    async (
      { contractName, relativePath, password, proxy, proxyAdmin, args },
      hre: HardhatRuntimeEnvironment
    ) => {
      args = args ? args : [];
      setGlobalHRE(hre);
      const signer = await decryptWallet(
        relativePath,
        password || ENV.KEYSTORE.default.password,
        true
      );
      await upgrade(contractName, signer, args, proxy, proxyAdmin);
    }
  );

task("call-contract", "Call a contract function (this does not change contract storage or state)")
  .addPositionalParam(
    "contractName",
    "the name of the contract to get the ABI",
    undefined,
    types.string
  )
  .addPositionalParam(
    "contractAddress",
    "the address where de contract is located",
    undefined,
    types.string
  )
  .addPositionalParam("functionName", "the name of the function to call", undefined, types.string)
  .addOptionalPositionalParam("args", "the arguments to pass to the function", [], types.json)
  .addOptionalParam("artifactPath", "the path to the artifact file", undefined, types.string)
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE_ROOT to retreive the wallet",
    undefined,
    types.string
  )
  .addOptionalParam("password", "Password to decrypt the wallet")
  .setAction(
    async (
      { contractName, contractAddress, functionName, args, artifactPath, relativePath, password },
      hre: HardhatRuntimeEnvironment
    ) => {
      setGlobalHRE(hre);
      const artifact = JSON.parse(
        await fs.readFile(
          artifactPath || `artifacts/contracts/${contractName}.sol/${contractName}.json`
        )
      );
      let signer: Wallet | undefined;
      if (relativePath) {
        signer = await decryptWallet(relativePath, password || ENV.KEYSTORE.default.password, true);
      }
      console.log(
        `Calling Smart Contract ${contractName}.${functionName}(${args}) at ${contractAddress}...`
      );
      console.log(
        "Result: ",
        await new Contract(contractAddress, artifact.abi, signer || hre.ethers.provider).callStatic[
          functionName
        ](...args)
      );
    }
  );

task("get-timestamp", "get the current timestamp in seconds")
  .addOptionalParam("timeToAdd", "time to add to the timestamp in seconds", undefined, types.int)
  .setAction(async ({ timeToAdd }, hre: HardhatRuntimeEnvironment) => {
    setGlobalHRE(hre);
    console.log(Math.floor(Date.now() / 1000) + (timeToAdd || 0));
  });

task("quick-test", "Random quick testing function")
  .addOptionalParam(
    "args",
    "Contract initialize function's arguments if any",
    undefined,
    types.json
  )
  .setAction(async ({ args }, hre: HardhatRuntimeEnvironment) => {
    setGlobalHRE(hre);
    // example: npx hardhat quick-test --args '[12, "hello"]'
    console.log("RAW Args: ", args, typeof args[0], args[0], typeof args[1], args[1]);
    console.log("Latest block: ", await hre.ethers.provider.getBlockNumber());
  });

//* Config
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    version: ENV.BLOCKCHAIN.default.solVersion,
    settings: {
      // optimizer: {
      //   enabled: true,
      // },
      evmVersion: ENV.BLOCKCHAIN.default.evm,
    },
  },
  networks: {
    hardhat: {
      chainId: ENV.BLOCKCHAIN.hardhat.chainId,
      blockGasLimit: ENV.BLOCKCHAIN.default.gasLimit,
      gasPrice: ENV.BLOCKCHAIN.default.gasPrice,
      hardfork: ENV.BLOCKCHAIN.default.evm,
      initialBaseFeePerGas: ENV.BLOCKCHAIN.default.initialBaseFeePerGas,
      accounts: {
        mnemonic: ENV.KEYSTORE.default.mnemonic.phrase,
        path: ENV.KEYSTORE.default.mnemonic.path,
        count: ENV.KEYSTORE.default.accountNumber,
        // passphrase: ENV.KEYSTORE.default.password,
        accountsBalance: BigNumber.from(ENV.KEYSTORE.default.balance)
          .mul(BigNumber.from("0x0de0b6b3a7640000"))
          .toString(),
      },
      loggingEnabled: false,
      mining: {
        auto: true,
        interval: [3000, 6000], // if auto is false then randomly generate blocks between 3 and 6 seconds
        mempool: { order: "fifo" }, // [priority] change how transactions/blocks are procesed
      },
    },
    ganache: {
      url: `http://${ENV.BLOCKCHAIN.ganache.hostname}:${ENV.BLOCKCHAIN.ganache.port}`,
      chainId: ENV.BLOCKCHAIN.ganache.chainId,
      blockGasLimit: ENV.BLOCKCHAIN.default.gasLimit,
      gasPrice: ENV.BLOCKCHAIN.default.gasPrice,
      hardfork: ENV.BLOCKCHAIN.default.evm,
      initialBaseFeePerGas: ENV.BLOCKCHAIN.default.initialBaseFeePerGas,
    },
  },
  contractSizer: {
    runOnCompile: true,
  },
  gasReporter: {
    enabled: true,
    currency: "EUR",
  },
  // typechain: {
  //   externalArtifacts: [ //! NOT WORKING: export extrange error
  //     "node_modules/@openzeppelin/contracts/build/contracts/ProxyAdmin.json",
  //     "node_modules/@openzeppelin/contracts/build/contracts/TransparentUpgradeableProxy.json",
  //   ],
  // },
};

export default config;
