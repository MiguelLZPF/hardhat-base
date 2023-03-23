import { BLOCKCHAIN, KEYSTORE } from "configuration";
import ganache from "ganache";
import { BigNumber } from "ethers";

const ganacheServer = ganache.server({
  chain: {
    chainId: BLOCKCHAIN.networks.get("ganache")?.chainId,
    hardfork: BLOCKCHAIN.default.evm,
    vmErrorsOnRPCResponse: true,
  },
  miner: {
    blockGasLimit: BLOCKCHAIN.default.gasLimit,
    defaultGasPrice: BLOCKCHAIN.default.gasPrice,
  },
  wallet: {
    mnemonic: KEYSTORE.default.mnemonic.phrase,
    hdPath: KEYSTORE.default.mnemonic.basePath,
    totalAccounts: KEYSTORE.default.accountNumber,
    lock: false,
    passphrase: KEYSTORE.default.password,
    defaultBalance: BigNumber.from(KEYSTORE.default.balance).toNumber(),
  },
  database: {
    dbPath: BLOCKCHAIN.networks.get("ganache")?.dbPath,
  },
  logging: {
    // quiet: true,
    // verbose: true,
  },
});

async function main() {
  try {
    await ganacheServer.listen(BLOCKCHAIN.networks.get("ganache")!.port);
    console.log(`Ganache server listening on port ${BLOCKCHAIN.networks.get("ganache")?.port}...`);
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
