// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.8.3) (proxy/transparent/ProxyAdmin.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @dev Only used to compile external (imports) contracts
 */
abstract contract _externals is ProxyAdmin {

}

contract TUP is TransparentUpgradeableProxy {
  constructor(
    address logic,
    address initialOwner,
    bytes memory data
  ) TransparentUpgradeableProxy(logic, initialOwner, data) {}

  function getProxyAdmin() public returns (address) {
    return _proxyAdmin();
  }

  function getImplementation() public view returns (address) {
    return _implementation();
  }

  receive() external payable {
    // custom function code
  }
}
