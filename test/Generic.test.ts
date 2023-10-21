import { GAS_OPT, TEST } from "configuration";
import hre, { upgrades } from "hardhat";
import { Provider, Block } from "ethers";
import { setGlobalHRE } from "scripts/utils";
import { INetwork } from "models/Configuration";
import CustomWallet from "scripts/wallets";
import {
  StorageUpgr__factory as StorageUpgrFactory,
  StorageUpgr,
} from "typechain-types";

// Specific Constants

// General Variables
let provider: Provider;
let network: INetwork;
let accounts: CustomWallet[] = [];
let lastBlock: Block | null;
// Specific Variables
// -- wallets | accounts
let admin: CustomWallet;
let defaultUser: CustomWallet;
// -- contracts
describe("Storage", () => {
  before("Generate test Accounts", async () => {
    ({ gProvider: provider, gNetwork: network } = await setGlobalHRE(hre));
    lastBlock = await provider.getBlock("latest");
    if (!lastBlock || lastBlock.number < 0) {
      throw new Error(
        `❌  🛜  Cannot connect with Provider. No block number could be retreived`,
      );
    }
    console.log(
      `✅  🛜  Connected to network: ${network.name} (latest block: ${lastBlock.number})`,
    );
    // Generate TEST.accountNumber wallets
    const baseWallet = CustomWallet.fromPhrase();
    for (let index = 0; index < TEST.accountNumber; index++) {
      accounts.push(
        new CustomWallet(baseWallet.deriveChild(index).privateKey, provider),
      );
    }
    // set specific roles
    admin = accounts[0];
    defaultUser = accounts[1];
  });

  describe("Deployment and Initialization", () => {
    it("should test upgrade", async () => {
      const storage = (await upgrades.deployProxy(
        new StorageUpgrFactory(admin),
        [12],
        { kind: "uups", txOverrides: GAS_OPT.max },
      )) as unknown as StorageUpgr;
      console.log(await storage.retrieve());
      const receipt = await storage.deploymentTransaction()?.wait();
      const events = await storage.queryFilter(
        storage.filters.Upgraded(),
        receipt?.blockNumber,
        receipt?.blockNumber,
      );
      console.log(events[0].args.implementation);

      const implementation = events[0].args.implementation;
      console.info(
        "\n✅ 🎉 Contract deployed successfully! Contract Information:",
        `\n  - Contract Name (id within this project): Storage`,
        `\n  - Logic Address (the only one if regular deployment): ${implementation}`,
        `\n  - Proxy Address (only if upgradeable deployment): ${await storage.getAddress()}`,
        `\n  - Admin or Deployer: ${admin.address}`,
        `\n  - Deploy Timestamp: ${(
          await storage.deploymentTransaction()?.getBlock()
        )?.timestamp}`,
        `\n  - Bytecode Hash:`,
      );
    });
  });
});
