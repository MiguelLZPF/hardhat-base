import { GAS_OPT, KEYSTORE, TEST } from "configuration";
import * as HRE from "hardhat";
import { step } from "mocha-steps";
import { expect } from "chai";
import {
  Provider,
  Wallet,
  HDNodeWallet,
  Block,
  TransactionReceipt,
  ContractTransactionReceipt,
  ZeroAddress,
  isAddress,
  parseEther,
} from "ethers";
import { IStorage, Ownable, ProxyAdmin } from "typechain-types";
import { getContractInstance, setGlobalHRE } from "scripts/utils";
import { INetwork } from "models/Configuration";
import { deploy, deployUpgradeable } from "scripts/deploy";

// Specific Constants
const CONTRACT_NAME = "StorageUpgr";
const STORAGE_DEPLOYED_AT = undefined;
const INIT_VALUE = 12;

// General Variables
let provider: Provider;
let network: INetwork;
let accounts: Wallet[] = [];
let lastReceipt: ContractTransactionReceipt | TransactionReceipt | null;
let lastBlock: Block | null;
// Specific Variables
// -- wallets | accounts
let admin: Wallet;
let defaultUser: Wallet;
// -- contracts
let proxyAdmin: ProxyAdmin;
let storage: IStorage & Ownable;
describe("Storage", () => {
  before("Generate test Accounts", async () => {
    ({ gProvider: provider, gNetwork: network } = await setGlobalHRE(HRE));
    lastBlock = await provider.getBlock("latest");
    if (!lastBlock || lastBlock.number < 0) {
      throw new Error(`❌  🛜  Cannot connect with Provider. No block number could be retreived`);
    }
    console.log(`✅  Connected to network: ${network.name} (latest block: ${lastBlock.number})`);
    // Generate TEST.accountNumber wallets
    const baseWallet = HDNodeWallet.fromPhrase(
      KEYSTORE.default.mnemonic.phrase,
      undefined,
      KEYSTORE.default.mnemonic.basePath
    );
    for (let index = 0; index < TEST.accountNumber; index++) {
      accounts.push(new Wallet(baseWallet.deriveChild(index).privateKey, provider));
    }
    // set specific roles
    admin = accounts[0];
    defaultUser = accounts[1];
  });

  describe("Deployment and Initialization", () => {
    if (STORAGE_DEPLOYED_AT) {
      step("Should create contract instance", async () => {
        storage = await getContractInstance<IStorage & Ownable>(CONTRACT_NAME, admin);
        const storageAddr = await storage.getAddress();
        expect(isAddress(storageAddr)).to.be.true;
        expect(storageAddr).to.equal(STORAGE_DEPLOYED_AT);
        console.log(`${CONTRACT_NAME} contract recovered at: ${storageAddr}`);
      });
    } else {
      step("Should deploy contract", async () => {
        // deploy and "store" ProxyAdmin
        const proxyAdminDeployResult = await deploy(
          "ProxyAdmin",
          admin,
          undefined,
          undefined,
          GAS_OPT.max,
          false
        );
        proxyAdmin = proxyAdminDeployResult.contractInstance as ProxyAdmin;
        // deploy Storage
        const deployResult = await deployUpgradeable<IStorage & Ownable>(
          CONTRACT_NAME,
          admin,
          [INIT_VALUE],
          undefined,
          GAS_OPT.max,
          proxyAdmin,
          true
        );
        // get the upgradeable instance as IStorage
        storage = deployResult.contractInstance;
        const storageAddr = await storage.getAddress();
        expect(isAddress(storageAddr)).to.be.true;
        expect(storageAddr).not.to.equal(ZeroAddress);
        console.log(`NEW ${CONTRACT_NAME} contract deployed at: ${storageAddr}`);
      });
      step("Should check if correct initialization", async () => {
        const response = await storage.retrieve();
        expect(response).equal(INIT_VALUE);
      });
    }
  });

  describe("Main", () => {
    before("Set the correct signer", async () => {
      storage = storage.connect(defaultUser) as IStorage & Ownable;
    });
    step("Should store new value", async () => {
      // check initial state
      const previous = await storage.retrieve();
      expect(previous).equal(INIT_VALUE);
      // change stored value
      const newValue = 21;
      lastReceipt = await (await storage.store(newValue, GAS_OPT.max)).wait();
      expect(lastReceipt).not.to.be.null;
      const events = await storage.queryFilter(
        storage.filters.Stored(newValue),
        lastReceipt!.blockNumber,
        lastReceipt!.blockNumber
      );
      expect(events.length).to.equal(1);
      // check final state
      const final = await storage.retrieve();
      expect(final).to.equal(newValue);
    });
  });

  describe("Owner", () => {
    before("Set the correct signer", async () => {
      storage = storage.connect(admin) as IStorage & Ownable;
    });

    step("Should transfer ownership", async () => {
      // check initial state
      const previous = await storage.owner();
      expect(previous).equal(admin.address);
      // change owner
      lastReceipt = await (
        await storage.transferOwnership(defaultUser.address, GAS_OPT.max)
      ).wait();
      expect(lastReceipt).not.to.be.null;
      const events = await storage.queryFilter(
        storage.filters.OwnershipTransferred(admin.address, defaultUser.address),
        lastReceipt!.blockNumber,
        lastReceipt!.blockNumber
      );
      expect(events.length).to.equal(1);
      // check final state
      const final = await storage.owner();
      expect(final).to.equal(defaultUser.address);
    });

    step("Should transfer back the ownership", async () => {
      // check initial state
      const previous = await storage.owner();
      expect(previous).equal(defaultUser.address);
      // change owner
      lastReceipt = await (
        await (storage.connect(defaultUser) as IStorage & Ownable).transferOwnership(
          admin.address,
          GAS_OPT.max
        )
      ).wait();
      expect(lastReceipt).not.to.be.null;
      const events = await storage.queryFilter(
        storage.filters.OwnershipTransferred(defaultUser.address, admin.address),
        lastReceipt!.blockNumber,
        lastReceipt!.blockNumber
      );
      expect(events.length).to.equal(1);
      // check final state
      const final = await storage.owner();
      expect(final).to.equal(admin.address);
    });
  });

  describe("PayMe", () => {
    before("Set the correct signer", async () => {
      storage = storage.connect(defaultUser) as IStorage & Ownable;
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
      lastReceipt = await (await storage.payMe({ ...GAS_OPT.max, value: amount })).wait();
      expect(lastReceipt).not.to.be.null;
      const events = await storage.queryFilter(
        storage.filters.ThankYou(undefined, defaultUser.address),
        lastReceipt!.blockNumber,
        lastReceipt!.blockNumber
      );
      expect(events.length).to.equal(1);
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
