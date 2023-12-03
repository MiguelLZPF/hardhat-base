/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  BigNumberish,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../../common";
import type { Storage, StorageInterface } from "../../contracts/Storage";

const _abi = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "initialValue",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "AccessControlBadConfirmation",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "neededRole",
        type: "bytes32",
      },
    ],
    name: "AccessControlUnauthorizedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
      },
    ],
    name: "RoleAdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "RoleRevoked",
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
        indexed: true,
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
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleAdmin",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "getRoleMember",
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
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
    ],
    name: "getRoleMemberCount",
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
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "hasRole",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
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
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "callerConfirmation",
        type: "address",
      },
    ],
    name: "renounceRole",
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
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
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
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const _bytecode =
  "0x608060405234801561001057600080fd5b50604051610aec380380610aec83398101604081905261002f9161017c565b61003a600033610043565b50600255610195565b600080610050848461007b565b905080156100725760008481526001602052604090206100709084610125565b505b90505b92915050565b6000828152602081815260408083206001600160a01b038516845290915281205460ff1661011d576000838152602081815260408083206001600160a01b03861684529091529020805460ff191660011790556100d53390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a4506001610075565b506000610075565b6000610072836001600160a01b038416600081815260018301602052604081205461011d57508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610075565b60006020828403121561018e57600080fd5b5051919050565b610948806101a46000396000f3fe6080604052600436106100a75760003560e01c80639010d07c116100645780639010d07c1461019657806391d14854146101ce578063a217fddf146101ee578063ca15c87314610203578063d547741f14610223578063d997ccb31461024357600080fd5b806301ffc9a7146100ac578063248a9ca3146100e15780632e64cec11461011f5780632f2ff15d1461013457806336568abe146101565780636057361d14610176575b600080fd5b3480156100b857600080fd5b506100cc6100c7366004610824565b61024b565b60405190151581526020015b60405180910390f35b3480156100ed57600080fd5b506101116100fc36600461084e565b60009081526020819052604090206001015490565b6040519081526020016100d8565b34801561012b57600080fd5b50600254610111565b34801561014057600080fd5b5061015461014f366004610867565b610276565b005b34801561016257600080fd5b50610154610171366004610867565b6102a1565b34801561018257600080fd5b5061015461019136600461084e565b6102d9565b3480156101a257600080fd5b506101b66101b13660046108a3565b61030c565b6040516001600160a01b0390911681526020016100d8565b3480156101da57600080fd5b506100cc6101e9366004610867565b61032b565b3480156101fa57600080fd5b50610111600081565b34801561020f57600080fd5b5061011161021e36600461084e565b610354565b34801561022f57600080fd5b5061015461023e366004610867565b61036b565b610154610390565b60006001600160e01b03198216635a05180f60e01b14806102705750610270826104a2565b92915050565b600082815260208190526040902060010154610291816104d7565b61029b83836104e4565b50505050565b6001600160a01b03811633146102ca5760405163334bd91960e11b815260040160405180910390fd5b6102d48282610519565b505050565b600281905560405181907fc6d8c0af6d21f291e7c359603aa97e0ed500f04db6e983b9fce75a91c6b8da6b90600090a250565b60008281526001602052604081206103249083610546565b9392505050565b6000918252602082815260408084206001600160a01b0393909316845291905290205460ff1690565b600081815260016020526040812061027090610552565b600082815260208190526040902060010154610386816104d7565b61029b8383610519565b600061039c818061030c565b6001600160a01b03163460405160006040518083038185875af1925050503d80600081146103e6576040519150601f19603f3d011682016040523d82523d6000602084013e6103eb565b606091505b50509050806104385760405162461bcd60e51b81526020600482015260146024820152734661696c656420746f2073656e64206d6f6e657960601b60448201526064015b60405180910390fd5b3361044460008061030c565b6001600160a01b03167f7c3676b72a389bbe134f4d71be959e22331d009bfeb2c1d01cc7d97d97d70507604051610497906020808252600890820152675468616e6b73212160c01b604082015260600190565b60405180910390a350565b60006001600160e01b03198216637965db0b60e01b148061027057506301ffc9a760e01b6001600160e01b0319831614610270565b6104e1813361055c565b50565b6000806104f18484610599565b90508015610324576000848152600160205260409020610511908461062b565b509392505050565b6000806105268484610640565b9050801561032457600084815260016020526040902061051190846106ab565b600061032483836106c0565b6000610270825490565b610566828261032b565b6105955760405163e2517d3f60e01b81526001600160a01b03821660048201526024810183905260440161042f565b5050565b60006105a5838361032b565b610623576000838152602081815260408083206001600160a01b03861684529091529020805460ff191660011790556105db3390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a4506001610270565b506000610270565b6000610324836001600160a01b0384166106ea565b600061064c838361032b565b15610623576000838152602081815260408083206001600160a01b0386168085529252808320805460ff1916905551339286917ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9190a4506001610270565b6000610324836001600160a01b038416610731565b60008260000182815481106106d7576106d76108c5565b9060005260206000200154905092915050565b600081815260018301602052604081205461062357508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610270565b6000818152600183016020526040812054801561081a5760006107556001836108db565b8554909150600090610769906001906108db565b90508082146107ce576000866000018281548110610789576107896108c5565b90600052602060002001549050808760000184815481106107ac576107ac6108c5565b6000918252602080832090910192909255918252600188019052604090208390555b85548690806107df576107df6108fc565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610270565b6000915050610270565b60006020828403121561083657600080fd5b81356001600160e01b03198116811461032457600080fd5b60006020828403121561086057600080fd5b5035919050565b6000806040838503121561087a57600080fd5b8235915060208301356001600160a01b038116811461089857600080fd5b809150509250929050565b600080604083850312156108b657600080fd5b50508035926020909101359150565b634e487b7160e01b600052603260045260246000fd5b8181038181111561027057634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052603160045260246000fdfea2646970667358221220bc515c03cb5c98a690c5770c7694e5f1960e5d990c82d7a4cadbc0c24eeba13564736f6c63430008140033";

type StorageConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: StorageConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class Storage__factory extends ContractFactory {
  constructor(...args: StorageConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    initialValue: BigNumberish,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(initialValue, overrides || {});
  }
  override deploy(
    initialValue: BigNumberish,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(initialValue, overrides || {}) as Promise<
      Storage & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): Storage__factory {
    return super.connect(runner) as Storage__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): StorageInterface {
    return new Interface(_abi) as StorageInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): Storage {
    return new Contract(address, _abi, runner) as unknown as Storage;
  }
}
