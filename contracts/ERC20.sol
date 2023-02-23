// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint8 private tokenDecimals;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 _decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
        tokenDecimals = _decimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return tokenDecimals;
    }
}
