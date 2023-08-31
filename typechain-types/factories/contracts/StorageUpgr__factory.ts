/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../common";
import type {
  StorageUpgr,
  StorageUpgrInterface,
} from "../../contracts/StorageUpgr";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "num",
        type: "uint256",
      },
    ],
    name: "Stored",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "message",
        type: "string",
      },
    ],
    name: "ThankYou",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "initialValue",
        type: "uint256",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "payMe",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "retrieve",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "num",
        type: "uint256",
      },
    ],
    name: "store",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b506105c8806100206000396000f3fe6080604052600436106100705760003560e01c80638da5cb5b1161004e5780638da5cb5b146100cf578063d997ccb3146100f7578063f2fde38b146100ff578063fe4b84df1461011f57600080fd5b80632e64cec1146100755780636057361d14610098578063715018a6146100ba575b600080fd5b34801561008157600080fd5b506065546040519081526020015b60405180910390f35b3480156100a457600080fd5b506100b86100b3366004610549565b61013f565b005b3480156100c657600080fd5b506100b8610172565b3480156100db57600080fd5b506033546040516001600160a01b03909116815260200161008f565b6100b8610186565b34801561010b57600080fd5b506100b861011a366004610562565b610299565b34801561012b57600080fd5b506100b861013a366004610549565b610312565b606581905560405181907fc6d8c0af6d21f291e7c359603aa97e0ed500f04db6e983b9fce75a91c6b8da6b90600090a250565b61017a610429565b6101846000610483565b565b600061019a6033546001600160a01b031690565b6001600160a01b03163460405160006040518083038185875af1925050503d80600081146101e4576040519150601f19603f3d011682016040523d82523d6000602084013e6101e9565b606091505b50509050806102365760405162461bcd60e51b81526020600482015260146024820152734661696c656420746f2073656e64206d6f6e657960601b60448201526064015b60405180910390fd5b603354604080516001600160a01b03909216825260208201819052600882820152675468616e6b73212160c01b60608301525133917f7c3676b72a389bbe134f4d71be959e22331d009bfeb2c1d01cc7d97d97d70507919081900360800190a250565b6102a1610429565b6001600160a01b0381166103065760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b606482015260840161022d565b61030f81610483565b50565b600054610100900460ff16158080156103325750600054600160ff909116105b8061034c5750303b15801561034c575060005460ff166001145b6103af5760405162461bcd60e51b815260206004820152602e60248201527f496e697469616c697a61626c653a20636f6e747261637420697320616c72656160448201526d191e481a5b9a5d1a585b1a5e995960921b606482015260840161022d565b6000805460ff1916600117905580156103d2576000805461ff0019166101001790555b60658290556103df6104d5565b8015610425576000805461ff0019169055604051600181527f7f26b83ff96e1f2b6a682f133852f6798a09c465da95921460cefb38474024989060200160405180910390a15b5050565b6033546001600160a01b031633146101845760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260640161022d565b603380546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b600054610100900460ff166105405760405162461bcd60e51b815260206004820152602b60248201527f496e697469616c697a61626c653a20636f6e7472616374206973206e6f74206960448201526a6e697469616c697a696e6760a81b606482015260840161022d565b61018433610483565b60006020828403121561055b57600080fd5b5035919050565b60006020828403121561057457600080fd5b81356001600160a01b038116811461058b57600080fd5b939250505056fea26469706673582212201dc81ebeca08da35f25b7dcd741da08c85b723dec2672004f71d485f9c7c21de64736f6c63430008140033";

type StorageUpgrConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: StorageUpgrConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class StorageUpgr__factory extends ContractFactory {
  constructor(...args: StorageUpgrConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      StorageUpgr & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): StorageUpgr__factory {
    return super.connect(runner) as StorageUpgr__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): StorageUpgrInterface {
    return new Interface(_abi) as StorageUpgrInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): StorageUpgr {
    return new Contract(address, _abi, runner) as unknown as StorageUpgr;
  }
}
