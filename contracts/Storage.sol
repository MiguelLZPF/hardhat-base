// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import "./interfaces/IStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Storage is IStorage, Ownable {
  uint256 number;

  constructor(uint256 initialValue) {
    number = initialValue;
    _transferOwnership(_msgSender());
  }

  function store(uint256 num) public {
    number = num;
    emit Stored(num);
  }

  function retrieve() public view returns (uint256) {
    return number;
  }

  function payMe() public payable {
    payable(owner()).transfer(address(this).balance);
    emit ThankYou(owner(), _msgSender(), "Thanks!!");
  }
}
