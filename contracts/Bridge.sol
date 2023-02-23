// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "contracts/LiquidityPool.sol";

contract Bridge is Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // All necessary information about swap
    struct SwapData {
        uint256 initTimestamp;
        address initiator;
        address recipient;
        uint256 amount;
        address srcToken;
        address destToken;
        uint8 destChainId;
        State state;
    }

    // Redeem information
    struct RedeemData {
        bytes32 message;
        address signer;
        uint256 txFee;
    }

    enum State {
        Empty,
        Active,
        Redeemed
    } // Swap statuses

    mapping(bytes32 => SwapData) public swaps; // HashedSecret => swap data
    mapping(address => LiquidityPool) public liquidityPools; // Token address to liquidity pool

    address[] public tokenAddresses; // Array of Token addresses

    address public validator; // Validator address
    uint256 public fee; // Fee value *1000
    uint256 public lockPeriod; // Period of lock to remove liquidity

    /**
     * @dev Emitted when new token added.
     */
    event NewPoolAdded(address token, string symbol, address poolAddress);

    /**
     * @dev Emitted when swap created.
     */
    event SwapInitialized(
        uint256 initTimestamp,
        address indexed initiator,
        address recipient,
        uint256 amount,
        address srcToken,
        address destToken,
        uint8 destChainId,
        string transactionNumber
    );

    /**
     * @dev Emitted when swap redeemed.
     */
    event SwapRedeemed(
        uint256 redeemTimestamp,
        uint256 netAmount,
        uint256 txFee,
        string transactionNumber,
        address initiator
    );

    constructor(
        address _validator,
        uint256 _fee,
        uint256 _lockPeriod
    ) {
        require(_validator != address(0), "Bridge: validator address is zero");
        validator = _validator;
        fee = _fee;
        lockPeriod = _lockPeriod;
    }

    /**
     * @dev Create new swap from current Blockchain to another.
     * Emits a {SwapInitialized} event.
     * @param recipient recipient address in another network.
     * @param transactionNumber unique number of transaction.
     * @param amount amount of tokens to be transferred.
     * @param srcToken symbol of the source token
     * @param destToken symbol of the destination token
     * @param destChainId the destination chainId of the newtork.  0 - eth 1 - bsc 2 - matic
     */
    function swap(
        address recipient,
        string calldata transactionNumber,
        uint256 amount,
        address srcToken,
        address destToken,
        uint8 destChainId
    ) external {
        bytes32 message = keccak256(
            abi.encodePacked(
                transactionNumber,
                amount,
                srcToken,
                destToken,
                recipient,
                uint256(destChainId)
            )
        );

        require(
            swaps[message].state == State.Empty,
            "Bridge: swap is not empty state or duplicate secret"
        );

        require(
            address(liquidityPools[srcToken]) != address(0),
            "Bridge: liquidity pool is not registered"
        );

        // lock the swap amount in the source pool
        IERC20(srcToken).safeTransferFrom(
            msg.sender,
            address(liquidityPools[srcToken]),
            amount
        );

        swaps[message] = SwapData({
            initTimestamp: block.timestamp,
            initiator: msg.sender,
            recipient: recipient,
            amount: amount,
            srcToken: srcToken,
            destToken: destToken,
            destChainId: destChainId,
            state: State.Active
        });

        emit SwapInitialized(
            swaps[message].initTimestamp,
            msg.sender,
            recipient,
            amount,
            srcToken,
            destToken,
            destChainId,
            transactionNumber
        );
    }

    /**
     * @dev Execute redeem.
     * Emits a {SwapRedeemed} event.
     * @param recipient` recipient address in this network.
     * @param transactionNumber` number of transaction.
     * @param amount` amount of transaction.
     * @param srcToken` the token on the source chain from which the swap was initiated
     * @param destToken` the token on the destination chain which is the chain in which redeem function is called
     * @param destChainId` the chain on the destination chain i.e. the chain in which redeem function is called .  0 - eth 1 - bsc 2 - matic.
     * @param v` _v of signature.
     * @param r` _r of signature.
     * @param s` _s of signature.
     */
    function redeem(
        address recipient,
        address initiator,
        string memory transactionNumber,
        uint256 amount,
        address srcToken,
        address destToken,
        uint8 destChainId,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        RedeemData memory data;

        data.message = keccak256(
            abi.encodePacked(
                transactionNumber,
                amount,
                srcToken,
                destToken,
                recipient,
                uint256(destChainId)
            )
        );

        require(
            swaps[data.message].state == State.Empty,
            "Bridge: swap is not empty state or duplicate secret and hash"
        );

        data.signer = ECDSA.recover(
            ECDSA.toEthSignedMessageHash(data.message),
            v,
            r,
            s
        );

        require(
            data.signer == validator,
            "Bridge: validator address is invalid"
        );

        LiquidityPool liquidityPool = liquidityPools[destToken];

        require(
            address(liquidityPool) != address(0),
            "Bridge: pool is not registered"
        );

        require(
            IERC20(destToken).balanceOf(address(liquidityPool)) >= amount,
            "Bridge: not enough balance in pool"
        );

        swaps[data.message].state = State.Redeemed;

        data.txFee = (amount * fee) / 1000;

        LiquidityPool(liquidityPool).transferLiquidity(
            recipient,
            amount - data.txFee,
            data.txFee
        );

        emit SwapRedeemed(
            block.timestamp,
            amount - data.txFee,
            data.txFee,
            transactionNumber,
            initiator
        );
    }

    /**
     * @dev Register new token and create new liquidity pool for it.
     * Emits a {NewPoolAdded} event.
     * @param token token address.
     */
    function addPool(address token) external onlyOwner {
        require(isContract(token), "Bridge: Invalid token address");
        require(
            address(liquidityPools[token]) == address(0),
            "Bridge: The token is already registered"
        );

        // prepare the params
        string memory name = ERC20(token).name();
        string memory symbol = ERC20(token).symbol();
        string memory lpName = string(
            abi.encodePacked(name, " Bridge LP Token")
        );
        string memory lpSymbol = string(abi.encodePacked("p", symbol));

        bytes memory bytecode = abi.encodePacked(
            type(LiquidityPool).creationCode,
            abi.encode(lockPeriod, token, lpName, lpSymbol, address(this))
        );

        bytes32 salt = keccak256(abi.encodePacked(token));
        address liquidityPool;

        assembly {
            liquidityPool := create2(
                0,
                add(bytecode, 32),
                mload(bytecode),
                salt
            )
        }

        liquidityPools[token] = LiquidityPool(liquidityPool);
        tokenAddresses.push(token);

        emit NewPoolAdded(token, symbol, address(liquidityPool));
    }

    /**
     * @dev Returns swap state.
     * @param hashedSecret` hash of swap.
     */
    function getSwapState(bytes32 hashedSecret)
        external
        view
        returns (State state)
    {
        return swaps[hashedSecret].state;
    }

    /**
     * @dev update the validator;
     * @param  newValidator address of validator.
     */
    function updateValidator(address newValidator) external onlyOwner {
        validator = newValidator;
    }

    /**
     * @dev update the lockPeriod;
     * @param newLockPeriod period of lock remove liquidity.
     */
    function updateLockPeriod(uint256 newLockPeriod) external onlyOwner {
        lockPeriod = newLockPeriod;
    }

    /**
     * @dev update the lockPeriod for the pool;
     * @param token token address.
     * @param newLockPeriod period of lock remove liquidity.
     */
    function updateLockPeriodForPool(address token, uint256 newLockPeriod)
        external
        onlyOwner
    {
        LiquidityPool liquidityPool = liquidityPools[token];
        LiquidityPool(liquidityPool).updateLockPeriod(newLockPeriod);
    }

    /**
     * @dev update the fee;
     * @param newFee value of fee.
     */
    function updateFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }

    /**
     * @dev check if the address is a smart contract;
     * @param account account address.
     */
    function isContract(address account) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
