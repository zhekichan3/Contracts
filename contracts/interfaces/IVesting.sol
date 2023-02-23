// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

interface IVesting {
    function calcAvailableToken(uint256 _amount)
        external
        view
        returns (uint256 availableAmount_);
}
