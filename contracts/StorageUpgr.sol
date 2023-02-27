// // SPDX-License-Identifier: GPL-3.0
// pragma solidity >=0.8.2 <0.9.0;

// // Import this file to use console.log
// import "hardhat/console.sol";
// import "./interfaces/IStorage.sol";
// import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

// /**
//  * @title Storage
//  * @dev Store & retrieve value in a variable
//  */
// contract StorageUpgr is Initializable, IStorage {
//   uint256 number;

//   function initialize(uint256 initialValue) external initializer {
//     number = initialValue;
//   }

//   function store(uint256 num) public {
//     number = num;
//     emit Stored(num);
//   }

//   function retrieve() public view returns (uint256) {
//     return number;
//   }
// }
