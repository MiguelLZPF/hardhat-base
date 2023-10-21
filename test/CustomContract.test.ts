import { GAS_OPT, TEST } from "configuration";
import hre from "hardhat";
import { Provider, Block } from "ethers";
import { setGlobalHRE } from "scripts/utils";
import { INetwork } from "models/Configuration";
import CustomWallet from "scripts/wallets";
import {
  StorageUpgr__factory as StorageUpgrFactory,
  Storage__factory,
} from "typechain-types";
import CustomContract from "models/CustomContract";
import { expect } from "chai";

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
describe("CustomContract", () => {
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

  describe("Deployment", () => {
    it("should deploy a new custom contract", async () => {
      const deployResult = await CustomContract.deploy(
        Storage__factory.abi,
        StorageUpgrFactory.bytecode,
        admin,
        [12],
        GAS_OPT.max,
      );
      expect(deployResult).not.to.be.undefined;
      expect(deployResult.contract).not.to.be.undefined;
      expect(deployResult.receipt).not.to.be.undefined;
      expect(deployResult.contract.target).to.equal(
        deployResult.contract.address,
      );
      expect(deployResult.contract.target).to.equal(
        await deployResult.contract.getAddress(),
      );
      expect(deployResult.contract.address).to.equal(
        await deployResult.contract.getAddress(),
      );
      expect(await deployResult.contract.getDeployedCode()).to.equal(
        await provider.getCode(deployResult.contract.address),
      );
    });
  });
});
