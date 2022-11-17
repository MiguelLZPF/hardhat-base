import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
// import { ethers } from "hardhat"; //! Cannot be imported here or any file that is imported here because it is generated here
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment, HardhatUserConfig } from "hardhat/types";
import { BigNumber, Contract, Wallet } from "ethers";
import { Mnemonic } from "ethers/lib/utils";
import { BLOCKCHAIN, CONTRACT, DEPLOY, KEYSTORE } from "./configuration";
import * as fs from "async-file";
import { decryptWallet, generateWallet, generateWalletBatch } from "./scripts/wallets";
import { changeLogic, deploy, deployUpgradeable, getLogic, upgrade } from "./scripts/deploy";
import { logObject, setGlobalHRE } from "./scripts/utils";
import {
  ICallContract,
  IChangeLogic,
  IDeploy,
  IGenerateWallets,
  IGetLogic,
  IGetMnemonic,
  IGetWalletInfo,
  IUpgrade,
} from "./models/Tasks";

//* TASKS
task("generate-wallets", "Generates Encryped JSON persistent wallets")
  .addPositionalParam("type", "Type of generation [single, batch]", "single", types.string)
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam("password", "Wallet password", undefined, types.string)
  .addOptionalParam("entropy", "Wallet entropy for random generation", undefined, types.string)
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
    "mnemonicLocale",
    "Mnemonic locale to generate wallet from",
    KEYSTORE.default.mnemonic.locale,
    types.string
  )
  .addOptionalParam(
    "batchSize",
    "Number of user wallets to be generated in batch",
    undefined,
    types.int
  )
  .addFlag("connect", "If true, the wallet(s) will be automatically connected to the provider")
  .setAction(async (args: IGenerateWallets, hre) => {
    // if default keyword, use the default phrase
    args.mnemonicPhrase =
      args.mnemonicPhrase == "default" ? KEYSTORE.default.mnemonic.phrase : args.mnemonicPhrase;
    if (args.type.toLowerCase() == "batch") {
      await generateWalletBatch(
        args.relativePath,
        args.password,
        args.batchSize,
        args.entropy ? Buffer.from(args.entropy) : undefined,
        {
          phrase: args.mnemonicPhrase,
          path: args.mnemonicPath || KEYSTORE.default.mnemonic.basePath,
          locale: args.mnemonicLocale,
        } as Mnemonic,
        args.connect
      );
    } else {
      await generateWallet(
        args.relativePath,
        args.password,
        args.entropy ? Buffer.from(args.entropy) : undefined,
        args.privateKey,
        {
          phrase: args.mnemonicPhrase,
          path: args.mnemonicPath || KEYSTORE.default.mnemonic.path,
          locale: args.mnemonicLocale,
        } as Mnemonic,
        args.connect
      );
    }
  });

task("get-wallet-info", "Recover all information from an encrypted wallet or an HD Wallet")
  .addOptionalPositionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root where the encrypted wallet is located",
    undefined,
    types.string
  )
  .addOptionalPositionalParam(
    "password",
    "Password to decrypt the wallet",
    KEYSTORE.default.password,
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
    KEYSTORE.default.mnemonic.path,
    types.string
  )
  .addOptionalParam(
    "mnemonicLocale",
    "Mnemonic locale to generate wallet from",
    KEYSTORE.default.mnemonic.locale,
    types.string
  )
  .addFlag("showPrivate", "set to true if you want to show the private key and mnemonic phrase")
  .setAction(async (args: IGetWalletInfo, hre) => {
    // console.log(path, password, showPrivate);
    args.mnemonicPhrase =
      args.mnemonicPhrase == "default" ? KEYSTORE.default.mnemonic.phrase : args.mnemonicPhrase;
    let wallet: Wallet | undefined;
    if (args.mnemonicPhrase) {
      wallet = await generateWallet(undefined, undefined, undefined, undefined, {
        phrase: args.mnemonicPhrase,
        path: args.mnemonicPath,
        locale: args.mnemonicLocale,
      } as Mnemonic);
    } else if (args.relativePath) {
      wallet = await decryptWallet(args.relativePath, args.password);
    } else {
      throw new Error("Cannot get a wallet from parameters, needed path or Mnemonic");
    }
    let privateKey = wallet.privateKey;
    let mnemonic = wallet.mnemonic;
    // needed because is read-only
    args.mnemonicPhrase = mnemonic.phrase;
    if (!args.showPrivate) {
      privateKey = "***********";
      args.mnemonicPhrase = "***********";
    }
    console.log(`
    Wallet information:
      - Address: ${wallet.address}
      - Public Key: ${wallet.publicKey}
      - Private Key: ${privateKey}
      - Mnemonic:
        - Phrase: ${args.mnemonicPhrase}
        - Path: ${mnemonic.path}
        - Locale: ${mnemonic.locale}
      - ETH Balance (Wei): ${await hre.ethers.provider.getBalance(wallet.address)}
    `);
  });

task("get-mnemonic", "Recover mnemonic phrase from an encrypted wallet")
  .addPositionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root where the encrypted wallet is located",
    undefined,
    types.string
  )
  .addOptionalPositionalParam(
    "password",
    "Password to decrypt the wallet",
    KEYSTORE.default.password,
    types.string
  )
  .setAction(async (args: IGetMnemonic) => {
    const wallet = await decryptWallet(args.relativePath, args.password);
    console.log(`
      - Mnemonic:
        - Phrase: ${wallet.mnemonic.phrase}
        - Path: ${wallet.mnemonic.path}
        - Locale: ${wallet.mnemonic.locale}
    `);
  });

// DEPLOYMENTS
task("deploy", "Deploy smart contracts on '--network'")
  .addFlag("upgradeable", "Deploy as upgradeable")
  .addPositionalParam(
    "contractName",
    "Name of the contract to deploy",
    CONTRACT[0].name,
    types.string
  )
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam(
    "password",
    "Password to decrypt the wallet",
    KEYSTORE.default.password,
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
    KEYSTORE.default.mnemonic.path,
    types.string
  )
  .addOptionalParam(
    "mnemonicLocale",
    "Mnemonic locale to generate wallet from",
    KEYSTORE.default.mnemonic.locale,
    types.string
  )
  .addOptionalParam(
    "proxyAdmin",
    "Address of a deloyed Proxy Admin. Only if --upgradeable deployment",
    DEPLOY.proxyAdmin.address,
    types.string
  )
  .addOptionalParam(
    "contractArgs",
    "Contract initialize function's arguments if any",
    [],
    types.json
  )
  .addFlag("noCompile", "Do not compile contracts before deploy")
  .addOptionalParam("txValue", "Contract creation transaction value if any", undefined, types.int)
  .setAction(async (args: IDeploy, hre) => {
    await setGlobalHRE(hre);
    if (!args.noCompile) {
      await hre.run("compile");
    }
    args.mnemonicPhrase =
      args.mnemonicPhrase == "default" ? KEYSTORE.default.mnemonic.phrase : args.mnemonicPhrase;
    let wallet: Wallet | undefined;
    if (args.mnemonicPhrase) {
      wallet = await generateWallet(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          phrase: args.mnemonicPhrase,
          path: args.mnemonicPath,
          locale: args.mnemonicLocale,
        } as Mnemonic,
        true
      );
    } else if (args.relativePath) {
      wallet = await decryptWallet(args.relativePath, args.password, true);
    } else {
      throw new Error("Cannot get a wallet from parameters, needed path or Mnemonic");
    }
    if (args.upgradeable) {
      await deployUpgradeable(
        args.contractName,
        wallet,
        args.contractArgs,
        args.txValue,
        args.proxyAdmin
      );
    } else {
      await deploy(args.contractName, wallet, args.contractArgs, args.txValue);
    }
  });

task("upgrade", "Upgrade smart contracts on '--network'")
  .addPositionalParam("contractName", "Name of the contract to deploy", undefined, types.string)
  .addPositionalParam("proxy", "Address of the TUP proxy", undefined, types.string)
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam(
    "password",
    "Password to decrypt the wallet",
    KEYSTORE.default.password,
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
    KEYSTORE.default.mnemonic.path,
    types.string
  )
  .addOptionalParam(
    "mnemonicLocale",
    "Mnemonic locale to generate wallet from",
    KEYSTORE.default.mnemonic.locale,
    types.string
  )
  .addOptionalParam(
    "proxyAdmin",
    "Address of a deloyed Proxy Admin",
    DEPLOY.proxyAdmin.address,
    types.string
  )
  .addOptionalParam(
    "contractArgs",
    "Contract initialize function's arguments if any",
    [],
    types.json
  )
  .addFlag("noCompile", "Do not compile contracts before upgrade")
  .setAction(async (args: IUpgrade, hre) => {
    setGlobalHRE(hre);
    if (!args.noCompile) {
      await hre.run("compile");
    }
    args.mnemonicPhrase =
      args.mnemonicPhrase == "default" ? KEYSTORE.default.mnemonic.phrase : args.mnemonicPhrase;
    let wallet: Wallet | undefined;
    if (args.mnemonicPhrase) {
      wallet = await generateWallet(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          phrase: args.mnemonicPhrase,
          path: args.mnemonicPath,
          locale: args.mnemonicLocale,
        } as Mnemonic,
        true
      );
    } else if (args.relativePath) {
      wallet = await decryptWallet(args.relativePath, args.password, true);
    } else {
      throw new Error("Cannot get a wallet from parameters, needed path or Mnemonic");
    }
    await upgrade(args.contractName, wallet, args.contractArgs, args.proxy, args.proxyAdmin);
  });

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
  .addOptionalPositionalParam(
    "functionArgs",
    "the arguments to pass to the function",
    [],
    types.json
  )
  .addOptionalParam("artifactPath", "the path to the artifact file", undefined, types.string)
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam(
    "password",
    "Password to decrypt the wallet",
    KEYSTORE.default.password,
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
    KEYSTORE.default.mnemonic.path,
    types.string
  )
  .addOptionalParam(
    "mnemonicLocale",
    "Mnemonic locale to generate wallet from",
    KEYSTORE.default.mnemonic.locale,
    types.string
  )
  .setAction(async (args: ICallContract, hre) => {
    setGlobalHRE(hre);
    const artifact = JSON.parse(
      await fs.readFile(
        args.artifactPath ||
          `artifacts/contracts/${args.contractName}.sol/${args.contractName}.json`
      )
    );
    args.mnemonicPhrase =
      args.mnemonicPhrase == "default" ? KEYSTORE.default.mnemonic.phrase : args.mnemonicPhrase;
    let wallet: Wallet | undefined;
    if (args.mnemonicPhrase) {
      wallet = await generateWallet(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          phrase: args.mnemonicPhrase,
          path: args.mnemonicPath,
          locale: args.mnemonicLocale,
        } as Mnemonic,
        true
      );
    } else if (args.relativePath) {
      wallet = await decryptWallet(args.relativePath, args.password, true);
    }
    console.log(
      `Calling Smart Contract ${args.contractName}.${args.functionName}(${args.functionArgs}) at ${args.contractAddress}...`
    );
    console.log(
      "Result: ",
      await new Contract(
        args.contractAddress,
        artifact.abi,
        wallet || hre.ethers.provider
      ).callStatic[args.functionName](...args.functionArgs)
    );
  });

task(
  "get-logic",
  "Check what logic|implementation smart contract address is currently using a given proxy"
)
  .addPositionalParam("proxy", "address of the proxy|storage contract", undefined, types.string)
  .addOptionalParam("proxyAdmin", "Address of a deloyed Proxy Admin", undefined, types.string)
  .setAction(async (args: IGetLogic, hre: HardhatRuntimeEnvironment) => {
    setGlobalHRE(hre);

    const { logicFromProxy, adminFromProxy, logicFromAdmin, adminFromAdmin } = await getLogic(
      args.proxy,
      args.proxyAdmin,
      hre
    );

    console.log(`
          Logic contract information:
            - Logic (from Proxy's storage): ${logicFromProxy}
            - Admin (from Proxy's storage): ${adminFromProxy}
            - Logic (from Admin): ${logicFromAdmin}
            - Admin (from Admin): ${adminFromAdmin}
        `);
  });

task("change-logic", "change the actual logic|implementation smart contract of a TUP proxy")
  .addPositionalParam("proxy", "address of the proxy|storage contract", undefined, types.string)
  .addOptionalParam("proxyAdmin", "Address of a deloyed Proxy Admin", undefined, types.string)
  .addParam("newLogic", "Address of the new logic|implementation contract", undefined, types.string)
  .addOptionalParam(
    "relativePath",
    "Path relative to KEYSTORE.root to store the wallets",
    undefined,
    types.string
  )
  .addOptionalParam(
    "password",
    "Password to decrypt the wallet",
    KEYSTORE.default.password,
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
    KEYSTORE.default.mnemonic.path,
    types.string
  )
  .addOptionalParam(
    "mnemonicLocale",
    "Mnemonic locale to generate wallet from",
    KEYSTORE.default.mnemonic.locale,
    types.string
  )
  .setAction(async (args: IChangeLogic, hre: HardhatRuntimeEnvironment) => {
    setGlobalHRE(hre);

    args.mnemonicPhrase =
      args.mnemonicPhrase == "default" ? KEYSTORE.default.mnemonic.phrase : args.mnemonicPhrase;
    let wallet: Wallet | undefined;
    if (args.mnemonicPhrase) {
      wallet = await generateWallet(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          phrase: args.mnemonicPhrase,
          path: `${args.mnemonicPath}/0`,
          locale: args.mnemonicLocale,
        } as Mnemonic,
        true
      );
    } else if (args.relativePath) {
      wallet = await decryptWallet(args.relativePath, args.password, true);
    } else {
      throw new Error("ERROR: signer required to perform this task");
    }

    const { previousLogic, actualLogic, receipt } = await changeLogic(
      args.proxy,
      args.newLogic,
      wallet!,
      args.proxyAdmin
    );
    console.log(`
          Logic changed successfully:
            - Previous Logic: ${previousLogic}
            - Actual Logic: ${actualLogic}
            - Transaction: ${receipt.transactionHash}
            - Block: ${receipt.blockHash}
        `);
  });

// OTHER
task("get-timestamp", "get the current timestamp in seconds")
  .addOptionalParam("timeToAdd", "time to add to the timestamp in seconds", 0, types.int)
  .setAction(async ({ timeToAdd }, hre: HardhatRuntimeEnvironment) => {
    setGlobalHRE(hre);
    console.log(Math.floor(Date.now() / 1000) + timeToAdd);
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
    if (args) {
      // example: npx hardhat quick-test --args '[12, "hello"]'
      console.log("RAW Args: ", args, typeof args[0], args[0], typeof args[1], args[1]);
    }
    console.log("Latest block: ", await hre.ethers.provider.getBlockNumber());
    console.log(
      "First accounts: ",
      await hre.ethers.provider.getSigner(0).getAddress(),
      await hre.ethers.provider.getSigner(1).getAddress()
    );
    console.log(
      "First account balance: ",
      await hre.ethers.provider.getBalance(await hre.ethers.provider.getSigner(0).getAddress())
    );
  });

//* Config
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    version: BLOCKCHAIN.default.solVersion,
    settings: {
      optimizer: {
        enabled: true,
      },
      evmVersion: BLOCKCHAIN.default.evm,
    },
  },
  networks: {
    hardhat: {
      chainId: BLOCKCHAIN.hardhat.chainId,
      blockGasLimit: BLOCKCHAIN.default.gasLimit,
      gasPrice: BLOCKCHAIN.default.gasPrice,
      hardfork: BLOCKCHAIN.default.evm,
      allowUnlimitedContractSize: true,
      accounts: {
        mnemonic: KEYSTORE.default.mnemonic.phrase,
        path: KEYSTORE.default.mnemonic.basePath,
        count: KEYSTORE.default.accountNumber,
        // passphrase: KEYSTORE.default.password,
        accountsBalance: BigNumber.from(KEYSTORE.default.balance)
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
      url: `http://${BLOCKCHAIN.ganache.hostname}:${BLOCKCHAIN.ganache.port}`,
      chainId: BLOCKCHAIN.ganache.chainId,
      blockGasLimit: BLOCKCHAIN.default.gasLimit,
      gasPrice: BLOCKCHAIN.default.gasPrice,
      hardfork: BLOCKCHAIN.default.evm,
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
