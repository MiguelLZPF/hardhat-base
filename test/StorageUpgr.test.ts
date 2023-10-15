import { GAS_OPT, TEST } from "configuration";
import * as HRE from "hardhat";
import { step } from "mocha-steps";
import { expect } from "chai";
import { Provider, Block, ZeroAddress, isAddress, parseEther } from "ethers";
import {
  IStorage,
  Ownable,
  ProxyAdmin,
  ProxyAdmin__factory,
} from "typechain-types";
import { setGlobalHRE } from "scripts/utils";
import { INetwork } from "models/Configuration";
import CustomWallet from "scripts/wallets";
import StorageUpgr from "models/StorageUpgr";
import CustomContract from "models/CustomContract";

// Specific Constants
const CONTRACT_NAME = "StorageUpgr";
const STORAGE_DEPLOYED_AT = undefined;
const STORAGE_LOGIC = undefined;
const PROXY_ADMIN = undefined;
const INIT_VALUE = 12;

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
let proxyAdmin: CustomContract<ProxyAdmin>;
let storage: StorageUpgr;
describe("Storage", () => {
  before("Generate test Accounts", async () => {
    ({ gProvider: provider, gNetwork: network } = await setGlobalHRE(HRE));
    lastBlock = await provider.getBlock("latest");
    if (!lastBlock || lastBlock.number < 0) {
      throw new Error(
        `❌  🛜  Cannot connect with Provider. No block number could be retreived`,
      );
    }
    console.log(
      `✅  Connected to network: ${network.name} (latest block: ${lastBlock.number})`,
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
    if (STORAGE_DEPLOYED_AT && STORAGE_LOGIC && PROXY_ADMIN) {
      step("Should create contract instance", async () => {
        storage = new StorageUpgr(
          STORAGE_DEPLOYED_AT,
          admin,
          STORAGE_LOGIC,
          PROXY_ADMIN,
        );
        expect(isAddress(storage.address)).to.be.true;
        expect(storage.address).to.equal(STORAGE_DEPLOYED_AT);
        console.log(
          `${CONTRACT_NAME} contract recovered at: ${storage.address}`,
        );
      });
    } else {
      step("Should deploy ProxyAdmin", async () => {
        const deployResult = await CustomContract.deploy<
          ProxyAdmin__factory,
          ProxyAdmin
        >(new ProxyAdmin__factory(admin), admin, [admin.address], GAS_OPT.max);
        proxyAdmin = deployResult.contract;
        expect(isAddress(proxyAdmin.address)).to.be.true;
        expect(proxyAdmin.address).not.to.equal(ZeroAddress);
        console.log(
          `NEW Proxy Admin contract deployed at: ${proxyAdmin.address}`,
        );
      });
      step("Should deploy contract", async () => {
        const deployResult = await StorageUpgr.deployStorage(
          admin,
          proxyAdmin.address,
          INIT_VALUE,
          undefined,
          true,
        );
        storage = deployResult.contract;
        expect(isAddress(storage.address)).to.be.true;
        expect(storage.address).not.to.equal(ZeroAddress);
        console.log(
          `NEW ${CONTRACT_NAME} contract deployed at: ${storage.address}`,
        );
      });
      step("Should check if correct initialization", async () => {
        const response = await storage.retrieve();
        expect(response).equal(INIT_VALUE);
      });
    }
  });

  //! Notice that from here are the exact same tests that Non Upgradeable Storage
  describe("Main", () => {
    before("Set the correct signer", async () => {
      storage.connect(defaultUser);
    });
    step("Should store new value", async () => {
      // check initial state
      const previous = await storage.retrieve();
      expect(previous).equal(INIT_VALUE);
      // change stored value
      const newValue = 21;
      await storage.store(newValue);
      // check final state
      const final = await storage.retrieve();
      expect(final).to.equal(newValue);
    });
  });

  describe("Owner", () => {
    before("Set the correct signer", async () => {
      storage.connect(admin);
    });

    step("Should transfer ownership", async () => {
      // check initial state
      const previous = await storage.owner();
      expect(previous).equal(admin.address);
      // change owner
      await storage.transferOwnership(defaultUser.address, GAS_OPT.max);
      // check final state
      const final = await storage.owner();
      expect(final).to.equal(defaultUser.address);
    });

    step("Should transfer back the ownership", async () => {
      // Check initial state
      const previous = await storage.owner();
      expect(previous).equal(defaultUser.address);
      // Change owner
      storage.connect(defaultUser);
      await storage.transferOwnership(admin.address, GAS_OPT.max);
      // Check final state
      const final = await storage.owner();
      expect(final).to.equal(admin.address);
    });
  });

  describe("PayMe", () => {
    before("Set the correct signer", async () => {
      storage.connect(defaultUser);
    });
    step("Should pay the owner of the contract", async () => {
      const amount = parseEther("13.0");
      // check initial state
      const initBalances = {
        admin: await provider.getBalance(admin.address),
        defaultUser: await provider.getBalance(defaultUser.address),
      };
      expect(initBalances.admin).greaterThanOrEqual(0);
      expect(initBalances.defaultUser).greaterThanOrEqual(0);
      // pay contract
      await storage.payMe({ ...GAS_OPT.max, value: amount });
      // check final state
      const finalBalances = {
        admin: await provider.getBalance(admin.address),
        defaultUser: await provider.getBalance(defaultUser.address),
      };
      expect(finalBalances.admin >= initBalances.admin).to.be.true;
      expect(finalBalances.defaultUser <= initBalances.defaultUser).to.be.true;
    });
  });
});
