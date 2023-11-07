import { GAS_OPT, TEST } from "configuration";
import hre from "hardhat";
import { Signer, Provider, Block, ZeroAddress, Interface } from "ethers";
import { setGlobalHRE } from "scripts/utils";
import { INetwork } from "models/Configuration";
import { Storage, Storage__factory } from "typechain-types";
import CustomContract from "models/CustomContract";
import { expect } from "chai";
import CustomWallet from "models/Wallet";

//* Specific Constants

//* General Variables
let provider: Provider;
let network: INetwork;
let accounts: CustomWallet[] = [];
let lastBlock: Block | null;
//* Specific Variables
// Wallets | Accounts
let admin: CustomWallet;
let defaultUser: CustomWallet;
// Contracts
let contract: CustomContract<Storage>;
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
    it("Should deploy a new custom contract using ABI and Bytecode", async () => {
      const deployResult = await CustomContract.deploy<
        Storage__factory,
        Storage
      >(
        Storage__factory.abi,
        Storage__factory.bytecode,
        admin,
        [12],
        GAS_OPT.max,
      );
      expect(deployResult).not.to.be.undefined;
      contract = deployResult.contract;
      expect(contract).not.to.be.undefined;
      expect(deployResult.receipt).not.to.be.undefined;
      expect(contract.target).to.equal(contract.address);
      expect(contract.target).to.equal(await contract.getAddress());
      expect(contract.address).to.equal(await contract.getAddress());
      expect(await contract.getDeployedCode()).not.to.be.null;
      expect(await contract.getDeployedCode()).to.equal(
        await provider.getCode(contract.address),
      );
    });
    it("Should deploy a new custom contract using Factory", async () => {
      const deployResult = await CustomContract.deploy<
        Storage__factory,
        Storage
      >(new Storage__factory(admin), admin, [12], GAS_OPT.max);
      expect(deployResult).not.to.be.undefined;
      contract = deployResult.contract;
      expect(contract).not.to.be.undefined;
      expect(deployResult.receipt).not.to.be.undefined;
      expect(contract.target).to.equal(contract.address);
      expect(contract.target).to.equal(await contract.getAddress());
      expect(contract.address).to.equal(await contract.getAddress());
      expect(await contract.getDeployedCode()).not.to.be.null;
      expect(await contract.getDeployedCode()).to.equal(
        await provider.getCode(contract.address),
      );
    });
  });
  describe("Create new Instance", () => {
    it("Should create a new custom contract instance using address and ABI", async () => {
      contract = new CustomContract(
        contract.address,
        contract.interface,
        admin,
      );
      expect(contract).not.to.be.undefined;
      expect(contract.target).to.equal(contract.address);
      expect(contract.target).to.equal(await contract.getAddress());
      expect(contract.address).to.equal(await contract.getAddress());
      expect(await contract.getDeployedCode()).not.to.be.null;
      expect(await contract.getDeployedCode()).to.equal(
        await provider.getCode(contract.address),
      );
    });
    it("Should create a new custom contract instance from previous instance", async () => {
      const normalContract = contract.contract;
      contract = new CustomContract(normalContract);
      expect(contract).not.to.be.undefined;
      expect(contract.target).to.equal(contract.address);
      expect(contract.target).to.equal(await contract.getAddress());
      expect(contract.address).to.equal(await contract.getAddress());
      expect(await contract.getDeployedCode()).not.to.be.null;
      expect(await contract.getDeployedCode()).to.equal(
        await provider.getCode(contract.address),
      );
    });
  });
  describe("Other functionality", () => {
    it("Should get various information about contract", async () => {
      expect(contract.runner).to.eq(admin);
      expect(contract.interface.fragments[0].inputs[0].name).to.eq(
        new Interface(Storage__factory.abi).fragments[0].inputs[0].name,
      );
      expect(contract.target).to.eq(contract.address);
      expect(await contract.getDeployedCode()).not.to.be.undefined;
      expect(await contract.getDeployedCode()).not.to.be.null;
      expect(await contract.getDeployedCode()).not.to.eq("0x00");
    });
    it("Should attach to another address", async () => {
      expect(contract.address).not.to.be.undefined;
      expect(contract.address).not.to.equal(ZeroAddress);
      const previousAddress = contract.address;
      const randomAddress = CustomWallet.createRandom(provider).address;
      contract.attach(randomAddress);
      expect(contract.address).to.equal(randomAddress);
      expect(contract.address).not.to.equal(previousAddress);
    });
    it("Should connect to another signer", async () => {
      expect(contract.runner).not.to.be.undefined;
      expect(contract.runner).not.to.be.null;
      expect(await (contract.runner! as Signer).getAddress()).not.to.equal(
        ZeroAddress,
      );
      const previousRunner = contract.runner;
      contract.connect(defaultUser);
      expect(contract.runner).to.equal(defaultUser);
      expect(contract.runner).not.to.equal(previousRunner);
    });
  });
});