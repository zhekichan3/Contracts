// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

contract Staking is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Staker contains info related to each staker.
    struct Staker {
        uint256 amount; // Tokens currently staked to the contract
        uint256 rewardAllowed; // Rewards allowed to be paid out
        uint256 rewardDebt; // Param is needed for correct calculation staker's share
        uint256 distributed; // Amount of distributed tokens
        uint256 unstakeAmount; // Amount of tokens which is available to unstake
        uint256 unstakeTime; // The time when tokens are available to withdraw
    }

    // StakeInfo contains info related to stake.
    struct StakeInfo {
        uint256 _startTime; // The time when staking and reward accrual starts 
        uint256 _endTime; // The time when staking and reward accrual ends
        uint256 _distributionTime; // The time for which the total reward is produced
        uint256 _unlockClaimTime; // The time since when reward amount is available to claim in unix timestamp format
        uint256 _unstakeLockTime; // The unbind time period for staked tokens in seconds
        uint256 _rewardTotal; // The reward amount generated during distribution time
        uint256 _totalStaked; // The total amount of staked token between from all users
        uint256 _totalDistributed; // The total amount of distributed rewards between all users
        address _stakeTokenAddress; // Address of staking token
        address _rewardTokenAddress; // Address of reward distribution token
    }

    // Stakers info by token holders.
    mapping(address => Staker) public _stakers;

    // ERC20 token staking to the contract.
    ERC20 public stakingToken;

    // ERC20 token earned by stakers as reward.
    ERC20 public rewardToken;

    // Staking's reward amount produced per distribution time.
    uint256 public rewardTotal;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable unlockClaimTime;
    uint256 public immutable distributionTime;
    uint256 public unstakeLockTime;

    // Аuxiliary parameter (tps) for staking's math
    uint256 public tokensPerStake;
    // Аuxiliary parameter for staking's math
    uint256 public rewardProduced;
    // Аuxiliary parameter for staking's math
    uint256 public allProduced;
    // Аuxiliary parameter for staking's math
    uint256 public producedTime;

    // Amount of currently staked tokens from all users.
    uint256 public totalStaked;
    // Amount of currently claimed rewards by the users.
    uint256 public totalDistributed;
    // Minimal required amount to stake.
    uint256 public minStakingAmount;
    // Maximum allowed amount to stake.
    uint256 public maxStakingAmount;

    /**
     * @dev Emitted in `stake` when the user staked the tokens
     */
    event tokensStaked(uint256 amount, uint256 time, address indexed sender);

    /**
     * @dev Emitted in `claim` when the user claimed his reward tokens
     */
    event tokensClaimed(uint256 amount, uint256 time, address indexed sender);

    /**
     * @dev Emitted in `unstake` when the user unstaked his tokens from the contract
     */
    event tokensUnstaked(uint256 amount, uint256 time, address indexed sender);

    constructor(
        uint256 _rewardTotal,
        uint256 _startTime,
        uint256 _distributionTime,
        uint256 _unlockClaimTime,
        uint256 _unstakeLockTime
    ) public {
        // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        // Sets `DEFAULT_ADMIN_ROLE` as ``ADMIN_ROLE``'s admin role.
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);

        rewardTotal = _rewardTotal;
        startTime = _startTime;
        endTime = 0;
        distributionTime = _distributionTime;
        unlockClaimTime = _unlockClaimTime;
        unstakeLockTime = _unstakeLockTime;

        producedTime = _startTime;
    }

    /**
     * @dev Initializes the Staking and Reward tokens to contract
     *
     */
    function initialize(address _rewardToken, address _stakingToken) public {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Staking: caller is not an admin"
        );

        require(
            address(stakingToken) == address(0) &&
                address(rewardToken) == address(0),
            "Staking: contract already initialized"
        );
        rewardToken = ERC20(_rewardToken);
        stakingToken = ERC20(_stakingToken);
    }

    /**
     * @dev Calculates the necessary parameters for staking
     *
     */
    function produced() private view returns (uint256) {
        return
            allProduced.add(
                rewardTotal.mul(block.timestamp - producedTime).div(
                    distributionTime
                )
            );
    }

    function update() public {
        uint256 rewardProducedAtNow = produced();
        if (rewardProducedAtNow > rewardProduced) {
            uint256 producedNew = rewardProducedAtNow.sub(rewardProduced);
            if (totalStaked > 0) {
                tokensPerStake = tokensPerStake.add(
                    producedNew.mul(1e20).div(totalStaked)
                );
            }
            rewardProduced = rewardProduced.add(producedNew);
        }
    }

    /**
     * @dev stake
     *
     * Parameters:
     *
     * - `_amount` - stake amount
     */
    function stake(uint256 _amount) public {
        require(
            block.timestamp > startTime,
            "Staking: staking time has not come yet"
        );
        Staker storage staker = _stakers[msg.sender];

        // Transfer specified amount of staking tokens to the contract
        IERC20(stakingToken).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        if (totalStaked > 0) {
            update();
        }
        staker.rewardDebt = staker.rewardDebt.add(
            _amount.mul(tokensPerStake).div(1e20)
        );

        totalStaked = totalStaked.add(_amount);
        staker.amount = staker.amount.add(_amount);

        update();

        emit tokensStaked(_amount, block.timestamp, msg.sender);
    }

    /**
     * @dev unstake - return staked amount
     *
     * Parameters:
     *
     * - `_amount` - stake amount
     */

    function unstake(uint256 _amount) public nonReentrant {
        Staker storage staker = _stakers[msg.sender];

        require(
            staker.amount >= _amount,
            "Staking: Not enough tokens to unstake"
        );

        update();

        staker.rewardAllowed = staker.rewardAllowed.add(
            _amount.mul(tokensPerStake).div(1e20)
        );
        staker.amount = staker.amount.sub(_amount);
        totalStaked = totalStaked.sub(_amount);

        IERC20(stakingToken).safeTransfer(msg.sender, _amount);

        emit tokensUnstaked(_amount, block.timestamp, msg.sender);
    }

    /**
     * @dev claim available rewards
     */
    function claim() public nonReentrant returns (bool) {
        require(
            block.timestamp > unlockClaimTime,
            "Staking: Claiming is locked"
        );
        if (totalStaked > 0) {
            update();
        }

        uint256 reward = calcReward(msg.sender, tokensPerStake);
        require(reward > 0, "Staking: Nothing to claim");

        Staker storage staker = _stakers[msg.sender];

        staker.distributed = staker.distributed.add(reward);
        totalDistributed = totalDistributed.add(reward);

        IERC20(rewardToken).safeTransfer(msg.sender, reward);
        emit tokensClaimed(reward, block.timestamp, msg.sender);
        return true;
    }

    /**
     * @dev calcReward - calculates available reward
     */
    function calcReward(address _staker, uint256 _tps)
        private
        view
        returns (uint256 reward)
    {
        Staker storage staker = _stakers[_staker];

        reward = staker
            .amount
            .mul(_tps)
            .div(1e20)
            .add(staker.rewardAllowed)
            .sub(staker.distributed)
            .sub(staker.rewardDebt);

        return reward;
    }

    /**
     * @dev getClaim - returns available reward of `_staker`
     */
    function getClaim(address _staker) public view returns (uint256 reward) {
        uint256 _tps = tokensPerStake;
        if (totalStaked > 0) {
            uint256 rewardProducedAtNow = produced();
            if (rewardProducedAtNow > rewardProduced) {
                uint256 producedNew = rewardProducedAtNow.sub(rewardProduced);
                _tps = _tps.add(producedNew.mul(1e20).div(totalStaked));
            }
        }
        reward = calcReward(_staker, _tps);

        return reward;
    }

    /**
     * @dev setReward - sets amount of reward during `distributionTime`
     */
    function setReward(uint256 _amount) public {
        require(hasRole(ADMIN_ROLE, msg.sender));
        allProduced = produced();
        producedTime = block.timestamp;
        rewardTotal = _amount;
    }

    function staked() public view returns (uint256) {
        return totalStaked;
    }

    function distributed() public view returns (uint256) {
        return totalDistributed;
    }

    /**
     * @dev getStakingInfo - return information about the stake
     */
    function getStakingInfo() external view returns (StakeInfo memory info_) {
        info_ = StakeInfo({
            _startTime: startTime,
            _endTime: endTime,
            _distributionTime: distributionTime,
            _unlockClaimTime: unlockClaimTime,
            _unstakeLockTime: unstakeLockTime,
            _rewardTotal: rewardTotal,
            _totalStaked: totalStaked,
            _totalDistributed: totalDistributed,
            _stakeTokenAddress: address(stakingToken),
            _rewardTokenAddress: address(rewardToken)
        });

        return info_;
    }

    /**
     * @dev getInfoByAddress - return information about the staker
     */
    function getInfoByAddress(address _address)
        external
        view
        returns (
            uint256 staked_,
            uint256 claim_,
            uint256 unstakeAmount_,
            uint256 unstakeTime_
        )
    {
        Staker storage staker = _stakers[_address];
        staked_ = staker.amount;
        unstakeAmount_ = staker.unstakeAmount;
        unstakeTime_ = staker.unstakeTime;

        claim_ = getClaim(_address);

        return (staked_, claim_, unstakeAmount_, unstakeTime_);
    }

    /**
     * @dev removeReward - remove reward tokens from the contract
     */
    function removeReward(uint256 _amount) public {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Staking: caller is not an admin"
        );
        require(_amount > 0, "Amount must be possitive");
        IERC20(rewardToken).safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev removeStake - remove staking tokens from the contract
     */
    function removeStake(uint256 _amount) public {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Staking: caller is not an admin"
        );
        require(_amount > 0, "Amount must be possitive");
        IERC20(stakingToken).safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev getRewardToken - return address of the reward token
     */
    function getRewardToken() external view returns (address) {
        return address(rewardToken);
    }

    /**
     * @dev getStakingToken - return address of the staking token
     */
    function getStakingToken() external view returns (address) {
        return address(stakingToken);
    }

        /**
     * @dev synchronizeContract - synchronize the smart contracts
     */
    function updateStakingInfo(
        uint256 _tps,
        uint256 _totalStaked,
        uint256 _totalDistributed
    ) external {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Staking: caller is not an admin"
        );

        tokensPerStake = _tps;
        totalStaked = _totalStaked;
        totalDistributed = _totalDistributed;
    }

       /**
     * @dev updateStakerInfo - update user information
     */
    function updateStakerInfo(
        address _user,
        uint256 _amount,
        uint256 _rewardAllowed,
        uint256 _rewardDebt,
        uint256 _distributed,
        uint256 _unstakeAmount,
        uint256 _unstakeTime
    ) external {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Staking: caller is not an admin"
        );

        Staker storage staker = _stakers[_user];

        staker.amount = _amount;
        staker.rewardAllowed = _rewardAllowed;
        staker.rewardDebt = _rewardDebt;
        staker.distributed = _distributed;
        staker.unstakeAmount = _unstakeAmount;
        staker.unstakeTime = _unstakeTime;
    }
}
