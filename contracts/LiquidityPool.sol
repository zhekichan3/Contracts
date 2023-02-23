// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LiquidityPool is Ownable, ReentrancyGuard, ERC20 {
    using SafeERC20 for IERC20;

    // Struct with data for user liquidity
    struct Liquidity {
        uint256 unlockTime;
        uint256 lpTokenBalance;
    }

    // liquidity[userAddress]
    mapping(address => Liquidity) public liquidity;

    address public immutable bridge; // Bridge smart contract address
    address public immutable token; // Accepted token
    uint256 public immutable factor; // Useful to work with token that has not 18 decimals e.g USDT
    uint256 public lockPeriod; // Period of lock to remove liquidity
    uint256 public accruedFee; // Total amount of acrrued fee

    constructor(
        uint256 _lockPeriod,
        address _token,
        string memory _name,
        string memory _symbol,
        address _bridge
    ) ERC20(_name, _symbol) {
        lockPeriod = _lockPeriod;
        token = _token;
        bridge = _bridge;
        factor = 18 - ERC20(_token).decimals();
    }

    modifier onlyBridge() {
        require(msg.sender == bridge, "Only bridge address");
        _;
    }

    /**
     * @dev transfer token from pool to recipient.
     * @param recipient recipient of token.
     * @param amount amount of token.
     * @param fee amount of fee.
     */
    function transferLiquidity(
        address recipient,
        uint256 amount,
        uint256 fee
    ) external onlyBridge {
        IERC20(token).safeTransfer(recipient, amount);
        accruedFee += fee;
    }

    /**
     * @dev add liquidity to pool.
     * @param amount amount of transfer.
     */
    function addLiquidity(uint256 amount) external {
        uint256 lpTokenAmount = amount * (10**factor);

        liquidity[msg.sender].lpTokenBalance += lpTokenAmount;
        liquidity[msg.sender].unlockTime = block.timestamp + lockPeriod;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, lpTokenAmount);
    }

    /**
     * @dev remove liquidity from pool.
     * @param amount` the amount of LP tokens provided
     */

    function removeLiquidity(uint256 amount) external nonReentrant {
        require(
            liquidity[msg.sender].lpTokenBalance > 0,
            "Pool: sender is not a liquidity provider"
        );
        require(
            liquidity[msg.sender].unlockTime < block.timestamp,
            "Pool: Tokens are not yet available for withdrawal"
        );

        uint256 lpTokenAmount = amount * (10**factor);

        require(
            liquidity[msg.sender].lpTokenBalance >= lpTokenAmount,
            "Pool: not enough token to remove"
        );
        // accrued fees are in the source token decimals whereas lp tokens is
        // always 18 decimal points. Thus we need to calculate lpFee with the source token's decimals precision
        uint256 lpFee = (accruedFee * lpTokenAmount) / totalSupply();

        // LPs are in 18 decimals whereas the source token does not always have 18.
        // We need to brign the figure down to the decimal points of the source tokens
        // since this is the liquidity that will be sent back to the sender
        uint256 withdrawAmount = amount + lpFee;
        accruedFee -= lpFee;

        liquidity[msg.sender].lpTokenBalance -= lpTokenAmount;

        IERC20(token).safeTransfer(msg.sender, withdrawAmount);
        _burn(msg.sender, lpTokenAmount);
    }

    /**
     * @dev Returns unlockTime by address.
     */
    function getUnlockTime() external view returns (uint256 unlockTime) {
        return liquidity[msg.sender].unlockTime;
    }

    /**
     * @dev update the lockPeriod;
     * @param newLockPeriod period of lock.
     */
    function updateLockPeriod(uint256 newLockPeriod) external onlyOwner {
        lockPeriod = newLockPeriod;
    }
}
