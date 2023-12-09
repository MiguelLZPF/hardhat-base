import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
// import { ethers } from "hardhat"; //! Cannot be imported here or any file that is imported here because it is generated here
import { HardhatUserConfig } from "hardhat/types";
import { BLOCKCHAIN, KEYSTORE } from "configuration";
import { networkNameToId } from "models/Configuration";
import { quickTest, createSigner, deploy, upgrade } from "tasks/index";

//* TASKS
quickTest;
// WALLET
createSigner;
// DEPLOY
deploy;
upgrade;
// task("generate-wallets", "Generates Encryped JSON persistent wallets")
//   .addPositionalParam(
//     "type",
//     "Type of generation [single, batch]",
//     "single",
//     types.string,
//   )
//   .addParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root to store the wallets",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam("password", "Wallet password", undefined, types.string)
//   .addOptionalParam(
//     "entropy",
//     "Wallet entropy for random generation",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "privateKey",
//     "Private key to generate wallet from. Hexadecimal String format expected",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPhrase",
//     "Mnemonic phrase to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPath",
//     "Mnemonic path to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "batchSize",
//     "Number of user wallets to be generated in batch",
//     undefined,
//     types.int,
//   )
//   .setAction(async (args: IGenerateWallets, hre) => {
//     await setGlobalHRE(hre);
//     let wallet: CustomWallet | HDNodeWallet;
//     if (args.type && args.type.toLowerCase() === "batch") {
//       wallet = (await hre.run("create-signer", {
//         mnemonicPhrase: args.mnemonicPhrase,
//         mnemonicPath: args.mnemonicPath || KEYSTORE.default.mnemonic.basePath,
//       } as ISignerInformation)) as HDNodeWallet;
//       for (
//         let index = 0;
//         index < (args.batchSize || KEYSTORE.default.batchSize);
//         index++
//       ) {
//         new CustomWallet(wallet.deriveChild(index).privateKey).storeEncrypted(
//           `${args.relativePath || "default"}_${
//             index < 10 ? `0${index}` : index
//           }`,
//           args.password,
//         );
//       }
//     } else {
//       wallet = await hre.run("create-signer", {
//         privateKey: args.privateKey,
//         mnemonicPhrase: args.mnemonicPhrase,
//         mnemonicPath: args.mnemonicPath,
//       } as ISignerInformation);
//       new CustomWallet(wallet.privateKey).storeEncrypted(
//         args.relativePath || "default",
//         args.password,
//       );
//     }
//   });

// task(
//   "get-wallet-info",
//   "Recover all information from an encrypted wallet or an HD Wallet",
// )
//   .addOptionalPositionalParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root where the encrypted wallet is located",
//     undefined,
//     types.string,
//   )
//   .addOptionalPositionalParam(
//     "password",
//     "Password to decrypt the wallet",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPhrase",
//     "Mnemonic phrase to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPath",
//     "Mnemonic path to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addFlag(
//     "showPrivate",
//     "set to true if you want to show the private key and mnemonic phrase",
//   )
//   .setAction(async (args: IGetWalletInfo, hre) => {
//     const wallet: CustomWallet | HDNodeWallet = await hre.run("create-signer", {
//       relativePath: args.relativePath,
//       password: args.password,
//       privateKey: args.privateKey,
//       mnemonicPhrase: args.mnemonicPhrase,
//       mnemonicPath: args.mnemonicPath,
//     } as ISignerInformation);
//     let privateKey = wallet.privateKey;
//     let mnemonicPhrase: string | undefined = undefined;
//     let mnemonicPath: string | null = null;
//     if (wallet instanceof HDNodeWallet) {
//       mnemonicPhrase = wallet.mnemonic?.phrase;
//       mnemonicPath = wallet.path;
//     }
//     // needed because is read-only
//     if (!args.showPrivate) {
//       privateKey = "***********";
//       mnemonicPhrase = "***********";
//     }
//     console.log(`
//     Wallet information:
//       - Address: ${wallet.address}
//       - Public Key: ${new SigningKey(wallet.privateKey).publicKey}
//       - Private Key: ${privateKey}
//       - Mnemonic:
//         - Phrase: ${mnemonicPhrase}
//         - Path: ${mnemonicPath}
//       - ETH Balance (Wei): ${await hre.ethers.provider.getBalance(
//         wallet.address,
//       )}
//     `);
//   });

// task("get-mnemonic", "Recover mnemonic phrase from an encrypted wallet")
//   .addPositionalParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root where the encrypted wallet is located",
//     undefined,
//     types.string,
//   )
//   .addOptionalPositionalParam(
//     "password",
//     "Password to decrypt the wallet",
//     undefined,
//     types.string,
//   )
//   .setAction(async (args: IGetMnemonic, hre) => {
//     const wallet: HDNodeWallet = await hre.run("create-signer", {
//       relativePath: args.relativePath,
//       password: args.password,
//     } as ISignerInformation);
//     console.log(`
//       - Mnemonic:
//         - Phrase: ${wallet.mnemonic?.phrase}
//         - Path: ${wallet.path}
//     `);
//   });

// DEPLOYMENTS

// task(
//   "call-contract",
//   "Call a contract function (this does not change contract storage or state)",
// )
//   .addPositionalParam(
//     "contractName",
//     "the name of the contract to get the ABI",
//     undefined,
//     types.string,
//   )
//   .addPositionalParam(
//     "contractAddress",
//     "the address where de contract is located",
//     undefined,
//     types.string,
//   )
//   .addPositionalParam(
//     "functionName",
//     "the name of the function to call",
//     undefined,
//     types.string,
//   )
//   .addOptionalPositionalParam(
//     "functionArgs",
//     "the arguments to pass to the function",
//     undefined,
//     types.string,
//   )
//   // Signer params
//   .addOptionalParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root to store the wallets",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "password",
//     "Password to decrypt the wallet",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "privateKey",
//     "A private key in hexadecimal can be used to sign",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPhrase",
//     "Mnemonic phrase to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPath",
//     "Mnemonic path to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .setAction(async (args: ICallContract, hre) => {
//     setGlobalHRE(hre);
//     const wallet = await hre.run("create-signer", {
//       relativePath: args.relativePath,
//       password: args.password,
//       privateKey: args.privateKey,
//       mnemonicPhrase: args.mnemonicPhrase,
//       mnemonicPath: args.mnemonicPath,
//     } as ISignerInformation);
//     console.log(
//       `Calling Smart Contract ${args.contractName}.${args.functionName}(${args.functionArgs}) at ${args.contractAddress}...`,
//     );
//     const functionArgs = args.functionArgs
//       ? JSON5.parse(args.functionArgs)
//       : [];
//     const contract = await getContractInstance<Contract>(
//       args.contractName,
//       wallet,
//       args.contractAddress,
//     );
//     console.log(
//       "Result: ",
//       await contract[args.functionName].staticCallResult(...functionArgs),
//     );
//   });

// task(
//   "execute-contract",
//   "Execute the transacction of a contract function (it CHANGES contract storage or state)",
// )
//   .addPositionalParam(
//     "contractName",
//     "the name of the contract to get the ABI",
//     undefined,
//     types.string,
//   )
//   .addPositionalParam(
//     "contractAddress",
//     "the address where de contract is located",
//     undefined,
//     types.string,
//   )
//   .addPositionalParam(
//     "functionName",
//     "the name of the function to call",
//     undefined,
//     types.string,
//   )
//   .addOptionalPositionalParam(
//     "functionArgs",
//     "the arguments to pass to the function",
//     undefined,
//     types.string,
//   )
//   // Signer params
//   .addOptionalParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root to store the wallets",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "password",
//     "Password to decrypt the wallet",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "privateKey",
//     "A private key in hexadecimal can be used to sign",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPhrase",
//     "Mnemonic phrase to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPath",
//     "Mnemonic path to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .setAction(async (args: ICallContract, hre) => {
//     setGlobalHRE(hre);
//     const wallet: Wallet = await hre.run("create-signer", {
//       relativePath: args.relativePath,
//       password: args.password,
//       privateKey: args.privateKey,
//       mnemonicPhrase: args.mnemonicPhrase,
//       mnemonicPath: args.mnemonicPath,
//     } as ISignerInformation);
//     console.log(
//       `Calling Smart Contract ${args.contractName}.${args.functionName}(${args.functionArgs}) at ${args.contractAddress}...`,
//     );
//     const functionArgs = args.functionArgs
//       ? JSON5.parse(args.functionArgs)
//       : [];
//     const contract = await getContractInstance(
//       args.contractName,
//       wallet,
//       args.contractAddress,
//     );
//     const receipt = await (
//       (await contract[args.functionName](
//         ...functionArgs,
//         GAS_OPT.max,
//       )) as ContractTransactionResponse
//     ).wait();
//     if (!receipt) {
//       throw new Error(`❌  ⛓️  Cannot execute transaction. No receipt found`);
//     }
//     console.log("\nTransaction executed succesfully: ", {
//       TransactionHash: receipt.hash,
//       BlockHash: receipt.blockHash,
//       BlockNumber: receipt.blockNumber,
//     });
//   });

// task("sign-tx", "Signs the unsigned transaction")
//   .addPositionalParam(
//     "unsignedTx",
//     "The complete unsigned transaction",
//     undefined,
//     types.string,
//   )
//   // Signer params
//   .addOptionalParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root to store the wallets",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "password",
//     "Password to decrypt the wallet",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "privateKey",
//     "A private key in hexadecimal can be used to sign",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPhrase",
//     "Mnemonic phrase to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPath",
//     "Mnemonic path to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .setAction(async (args: ISignTransaction, hre) => {
//     setGlobalHRE(hre);
//     const wallet: Wallet = await hre.run("create-signer", {
//       relativePath: args.relativePath,
//       password: args.password,
//       privateKey: args.privateKey,
//       mnemonicPhrase: args.mnemonicPhrase,
//       mnemonicPath: args.mnemonicPath,
//     } as ISignerInformation);

//     const signedTx = await wallet.signTransaction(args.unsignedTx);

//     console.log("\nTransaction signed succesfully: ", {
//       UnsignedTransaction: args.unsignedTx,
//       SignedTransaction: signedTx,
//       Signer: wallet.address,
//       SignerNonce: await wallet.getNonce(),
//     });
//   });

// task(
//   "get-logic",
//   "Check what logic|implementation smart contract address is currently using a given proxy",
// )
//   .addPositionalParam(
//     "proxy",
//     "address of the proxy|storage contract",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "proxyAdmin",
//     "Address of a deloyed Proxy Admin",
//     undefined,
//     types.string,
//   )
//   .setAction(async (args: IGetLogic, hre: HardhatRuntimeEnvironment) => {
//     await setGlobalHRE(hre);

//     const { logicFromProxy, adminFromProxy, logicFromAdmin, adminFromAdmin } =
//       await getLogic(args.proxy, args.proxyAdmin);

//     console.log(`
//           Logic contract information:
//             - Logic (from Proxy's storage): ${logicFromProxy}
//             - Admin (from Proxy's storage): ${adminFromProxy}
//             - Logic (from Admin): ${logicFromAdmin}
//             - Admin (from Admin): ${adminFromAdmin}
//         `);
//   });

// task(
//   "change-logic",
//   "change the actual logic|implementation smart contract of a TUP proxy",
// )
//   .addPositionalParam(
//     "proxy",
//     "address of the proxy|storage contract",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "proxyAdmin",
//     "Address of a deloyed Proxy Admin",
//     undefined,
//     types.string,
//   )
//   .addParam(
//     "newLogic",
//     "Address of the new logic|implementation contract",
//     undefined,
//     types.string,
//   )
//   // Signer params
//   .addOptionalParam(
//     "relativePath",
//     "Path relative to KEYSTORE.root to store the wallets",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "password",
//     "Password to decrypt the wallet",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "privateKey",
//     "A private key in hexadecimal can be used to sign",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPhrase",
//     "Mnemonic phrase to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .addOptionalParam(
//     "mnemonicPath",
//     "Mnemonic path to generate wallet from",
//     undefined,
//     types.string,
//   )
//   .setAction(async (args: IChangeLogic, hre: HardhatRuntimeEnvironment) => {
//     setGlobalHRE(hre);
//     const wallet = await hre.run("create-signer", {
//       relativePath: args.relativePath,
//       password: args.password,
//       privateKey: args.privateKey,
//       mnemonicPhrase: args.mnemonicPhrase,
//       mnemonicPath: args.mnemonicPath,
//     } as ISignerInformation);
//     const { previousLogic, actualLogic, receipt } = await changeLogic(
//       args.proxy,
//       args.newLogic,
//       wallet!,
//       args.proxyAdmin,
//     );
//     if (!receipt) {
//       throw new Error(`❌  ⛓️  Cannot execute transaction. No receipt found`);
//     }
//     console.log(`
//           Logic changed successfully:
//             - Previous Logic: ${previousLogic}
//             - Actual Logic: ${actualLogic}
//             - Transaction: ${receipt.hash}
//             - Block: ${receipt.blockHash}
//         `);
//   });

// // OTHER
// task("get-timestamp", "get the current timestamp in seconds")
//   .addOptionalParam(
//     "timeToAdd",
//     "time to add to the timestamp in seconds",
//     0,
//     types.int,
//   )
//   .setAction(async ({ timeToAdd }, hre: HardhatRuntimeEnvironment) => {
//     setGlobalHRE(hre);
//     console.log(Math.floor(Date.now() / 1000) + timeToAdd);
//   });

// task("quick-test", "Random quick testing function")
//   .addOptionalParam(
//     "args",
//     "Contract initialize function's arguments if any",
//     undefined,
//     types.json,
//   )
//   .setAction(async ({ args }, hre: HardhatRuntimeEnvironment) => {
//     setGlobalHRE(hre);
//     if (args) {
//       // example: npx hardhat quick-test --args '[12, "hello"]'
//       console.log(
//         "RAW Args: ",
//         args,
//         typeof args[0],
//         args[0],
//         typeof args[1],
//         args[1],
//       );
//     }
//     console.log("Latest block: ", await hre.ethers.provider.getBlockNumber());
//     console.log(
//       "First accounts: ",
//       await (await hre.ethers.provider.getSigner(0)).getAddress(),
//       await (await hre.ethers.provider.getSigner(1)).getAddress(),
//     );
//     console.log(
//       "First account balance: ",
//       await hre.ethers.provider.getBalance(
//         await (await hre.ethers.provider.getSigner(0)).getAddress(),
//       ),
//     );
//   });

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
      chainId: networkNameToId.hardhat.num,
      blockGasLimit: BLOCKCHAIN.default.gasLimit,
      gasPrice: BLOCKCHAIN.default.gasPrice,
      hardfork: BLOCKCHAIN.default.evm,
      initialBaseFeePerGas: BLOCKCHAIN.default.initialBaseFeePerGas,
      allowUnlimitedContractSize: false,
      accounts: {
        mnemonic: KEYSTORE.default.mnemonic.phrase,
        path: KEYSTORE.default.mnemonic.basePath,
        count: KEYSTORE.default.accountNumber,
        // passphrase: KEYSTORE.default.password,
        accountsBalance: String(
          BigInt(KEYSTORE.default.balance) * BigInt("0x0de0b6b3a7640000"),
        ),
      },
      loggingEnabled: false,
      mining: {
        auto: true,
        interval: [3000, 6000], // if auto is false then randomly generate blocks between 3 and 6 seconds
        mempool: { order: "fifo" }, // [priority] change how transactions/blocks are procesed
      },
    },
    ganache: {
      url: `${BLOCKCHAIN.networks.get(networkNameToId.ganache.bi)
        ?.protocol}://${BLOCKCHAIN.networks.get(networkNameToId.ganache.bi)
        ?.hostname}:${BLOCKCHAIN.networks.get(networkNameToId.ganache.bi)
        ?.port}`,
      chainId: networkNameToId.ganache.num,
      blockGasLimit: BLOCKCHAIN.default.gasLimit,
      gasPrice: BLOCKCHAIN.default.gasPrice,
      hardfork: BLOCKCHAIN.default.evm,
      initialBaseFeePerGas: BLOCKCHAIN.default.initialBaseFeePerGas,
    },
  },
  contractSizer: {
    runOnCompile: true,
  },
  gasReporter: {
    enabled: true,
    currency: "EUR",
  },
  typechain: {
    target: "ethers-v6",
    // externalArtifacts: [
    //   // Not working with byzantium EVM (compile)
    //   "node_modules/@openzeppelin/contracts/build/contracts/ProxyAdmin.json",
    //   "node_modules/@openzeppelin/contracts/build/contracts/TransparentUpgradeableProxy.json",
    // ],
  },
};

export default config;
