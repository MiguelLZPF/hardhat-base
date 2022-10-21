import { ENV } from "../configuration";
import ganache from "ganache";
import { BigNumber } from "ethers";

const ganacheServer = ganache.server({
  chain: {
    chainId: ENV.BLOCKCHAIN.ganache.chainId,
    hardfork: ENV.BLOCKCHAIN.default.evm,
    vmErrorsOnRPCResponse: true,
  },
  miner: {
    blockGasLimit: ENV.BLOCKCHAIN.default.gasLimit,
    defaultGasPrice: ENV.BLOCKCHAIN.default.gasPrice,
  },
  wallet: {
    mnemonic: ENV.KEYSTORE.default.mnemonic.phrase,
    hdPath: ENV.KEYSTORE.default.mnemonic.path,
    totalAccounts: ENV.KEYSTORE.default.accountNumber,
    lock: false,
    passphrase: ENV.KEYSTORE.default.password,
    defaultBalance: BigNumber.from(ENV.KEYSTORE.default.balance).toNumber(),
  },
  database: {
    dbPath: ENV.BLOCKCHAIN.ganache.dbPath,
  },
  logging: {
    // quiet: true,
    // verbose: true,
  },
});

async function main() {
  try {
    await ganacheServer.listen(ENV.BLOCKCHAIN.ganache.port);
    console.log(`Ganache server listening on port ${ENV.BLOCKCHAIN.ganache.port}...`);
    const provider = ganacheServer.provider;
    console.log(
      "Chain: ",
      provider.getOptions().chain,
      "Miner: ",
      provider.getOptions().miner,
      "Accounts: ",
      provider.getInitialAccounts()
    );
  } catch (error) {
    console.log("ERROR: Ganache server error", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
