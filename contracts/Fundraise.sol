// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IVesting.sol";

contract Fundraise is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant APPROVE_ROLE = keccak256("APPROVE_ROLE");
    bytes32 public constant TOKEN_CONTROL_ROLE =
        keccak256("TOKEN_CONTROL_ROLE");

    enum CampaignState {
        Unknown,
        AwaitingApprove,
        Active,
        CompletedSuccessfully,
        CompletedUnsuccessfully
    }

    enum CampaignType {
        Unknown,
        Public,
        PrivateWhitelist,
        PrivateToken
    }

    // Сampaign struct contains initial information on the project.
    struct Campaign {
        uint256 StartIn; // Campaign's start time
        uint256 EndIn; // Campaign's end time
        uint256 MinAllocation; // The minimum allocation threshold for the exchange in AcceptedToken
        uint256 MaxAllocation; // The maximum allocation threshold for the exchange in AcceptedToken
        address AcceptedToken; // Token accepted for the exchange (if it's ether, then must be address(0))
        address RewardTokenAddress; // Project token address
        uint256 RewardAmount; // The amount to be exchanged
        uint256 TokenRate; // Exchnage rate
        address payable Owner; // Project owner
        uint256 MinGoal; // The minimum exchange threshold to consider the campaign successful
        uint256 MaxGoal; // Maximum exchange amount
        uint256 ClaimUnlockTime; // The unlock time of tokens receipt in case of successful completion of the campaign
        CampaignType Type; // Project type: public or whitelist
        CampaignState State; // Project current state: for example - active
    }

    // CampaignInfo struct contains additional information on the project
    struct CampaignInfo {
        uint256 FeeAmount; // Fee amount to be transferred to the specified recipient
        uint256 ReceivedFromUsers; // Amount recieved from all participants in AcceptedToken
        uint256 AccumulatedForPayout; // Totaly accumulated amount to be paid out in Project token
        uint256 PaidOut; // Currently paid out amount in Project token
        uint256 Refunded; // Refunded amount in AcceptedToken, valid if the Campaign finished unsuccessfully
        uint256 AcceptedTokenDecimals; // Decimals of AcceptedToken calculated for the exchange
        uint256 RewardTokenDecimals; // Decimals of Project token calculated for the exchange
        address VestingAddress; // Specified vesting address for the Campaign
    }

    // CampaignInfoList struct combines contains Campaign and CampaignInfo info
    // and it's used only for view getter
    struct CampaignInfoList {
        uint256 StartIn;
        uint256 EndIn;
        uint256 MinGoal;
        uint256 MaxGoal;
        address AcceptedToken;
        address RewardTokenAddress;
        uint256 TokenRate;
        uint256 ReceivedFromUsers;
        uint256 AccumulatedForPayout;
        uint256 PaidOut;
        uint256 Refunded;
        CampaignType Type;
        CampaignState State;
    }

    // UserInfo struct contains information on the user participated in the Campaign
    struct UserInfo {
        uint256 ReceivedFromUser; // Amount recieved from the participant in AcceptedToken
        uint256 Accumulated; // Totaly accumulated amount to be paid out in Project token
        uint256 PaidOut; // Currently paid out amount to the user in Project token
    }

    // Array of Campaign structs
    Campaign[] public campaigns;
    mapping(uint256 => CampaignInfo) public campaignsInfo;

    // campaignsUserAllocation[campaign_id][user_address] = allocation
    mapping(uint256 => mapping(address => uint256))
        public campaignsUserAllocation;

    // whitelists_users[campaign_id][user_address] = true/false
    mapping(uint256 => mapping(address => bool)) public whitelists_users;
    // required_token[campaign_id] = token_address
    mapping(uint256 => address) public required_token;
    // required_token_amount[campaign_id] = amount
    mapping(uint256 => uint256) public required_token_amount;
    // users[campaign_id][user_address] = UserInfo struct
    mapping(uint256 => mapping(address => UserInfo)) public users;

    // List of accepted tokens
    mapping(address => bool) public AcceptedTokenList;

    // Users Participated
    mapping(address => bool) public UserParticipated;
    uint256 Participated = 0;

    // Users Participated Campaigns
    // UserParticipatedCampaignStatus[user][campaign] = true
    mapping(address => mapping(uint256 => bool))
        public UserParticipatedCampaignStatus;
    mapping(address => uint256[]) public UserParticipatedCampaigns;
    // Fee recipient's address
    address payable fee_receiver;

    /**
     * @dev Emitted in `createCampaign` when the new Campaign was created
     */
    event campaignCreated(
        uint256 CampaignID,
        uint256 StartIn,
        uint256 EndIn,
        uint256 MinAllocation,
        uint256 MaxAllocation,
        address AcceptedToken,
        address RewardTokenAddress,
        uint256 RewardAmount,
        uint256 TokenRate,
        address Owner,
        uint256 MinGoal,
        uint256 MaxGoal,
        CampaignType Type
    );

    /**
     * @dev Emitted in `approveCampaign` when the created Campaign was approved
     */
    event campaignApproved(uint256 CampaignID);

    /**
     * @dev Emitted in `finishCampaign` when an active Campaign got finished
     */
    event campaignFinished(
        uint256 CampaignID,
        CampaignState State,
        uint256 ReceivedFromUsers,
        uint256 AccumulatedForPayout
    );

    /**
     * @dev Emitted in `joinToCampaign` when a user joined an active campaign
     */
    event Swapped(
        uint256 indexed CampaignID,
        address indexed Sender,
        uint256 ReceivedFromUser,
        uint256 Accumulated,
        uint256 TotalReceivedFromUser,
        uint256 TotalAccumulatedForPayout,
        uint256 Timestamp
    );

    /**
     * @dev Emitted when a user refunded token amount
     */
    event Refunded(
        uint256 indexed CampaignID,
        address indexed Sender,
        address Token,
        uint256 Amount
    );

    /**
     * @dev Emitted when a user claimed token amount
     */
    event tokenClaimed(
        uint256 indexed CampaignID,
        address indexed Sender,
        address Token,
        uint256 Amount
    );

    /**
     * @dev Emitted when the claimtime was set
     */
    event claimTimeSet(uint256 indexed CampaignID, uint256 ClaimUnlockTime);

    /**
     * @dev Emitted when the vesting contract got updated
     */
    event vestingUpdated(uint256 indexed CampaignID, address VestingAddress);

    /**
     * @dev Emitted when the accepted token list was updated
     */
    event TokenListUpdated(address indexed AcceptedToken, bool Accepted);

    /**
     * @dev Contract constructor without parameters
     */
    constructor() public {
        // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(TOKEN_CONTROL_ROLE, msg.sender);
        // Sets `DEFAULT_ADMIN_ROLE` as ``ADMIN_ROLE``'s admin role.
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        // Sets `ADMIN_ROLE` as ``APPROVE_ROLE``'s admin role.
        _setRoleAdmin(APPROVE_ROLE, ADMIN_ROLE);
        // Sets `ADMIN_ROLE` as ``TOKEN_CONTROL_ROLE``'s admin role.
        _setRoleAdmin(TOKEN_CONTROL_ROLE, ADMIN_ROLE);
        // Allow ether for Swap
        AcceptedTokenList[address(0)] = true;
    }

    /**
     * @dev Creates a new Campaign.
     */
    function createCampaign(
        uint256 _StartIn,
        uint256 _EndIn,
        uint256 _MinAllocation,
        uint256 _MaxAllocation,
        address _AcceptedToken,
        address _RewardTokenAddress,
        uint256 _RewardAmount,
        uint256 _TokenRate,
        address payable _Owner,
        uint256 _MinGoal,
        uint256 _MaxGoal,
        CampaignType _Type
    ) external payable returns (uint256 CampaignID) {
        require(
            _StartIn < _EndIn,
            "The start campaign time must be less then end time."
        );

        require(
            block.timestamp < _StartIn,
            "The start campaign time must be in the future."
        );

        require(
            _MinAllocation < _MaxAllocation,
            "The min allocation amount must be less then max allocation amount."
        );

        require(
            _MinGoal < _MaxGoal,
            "The min goal amount must be less then max goal amount."
        );

        require(
            AcceptedTokenList[_AcceptedToken],
            "Token is not in the list of accepted tokens."
        );

        require(_Owner != address(0), "Owner address must be defined.");
        require(
            _RewardTokenAddress != address(0),
            "Token address must be defined."
        );
        require(_RewardAmount > 0, "Token amount must be greater than zero.");
        require(_TokenRate > 0, "Token Rate must be greater than zero.");
        require(_MaxGoal > 0, "Max goal must be greater than zero.");

        campaigns.push(
            Campaign({
                StartIn: _StartIn,
                EndIn: _EndIn,
                MinAllocation: _MinAllocation,
                MaxAllocation: _MaxAllocation,
                AcceptedToken: _AcceptedToken,
                RewardTokenAddress: _RewardTokenAddress,
                RewardAmount: _RewardAmount,
                TokenRate: _TokenRate,
                Owner: _Owner,
                MinGoal: _MinGoal,
                MaxGoal: _MaxGoal,
                ClaimUnlockTime: 0,
                Type: _Type,
                State: CampaignState.AwaitingApprove
            })
        );

        CampaignID = campaigns.length - 1;
        campaignsInfo[CampaignID] = CampaignInfo({
            FeeAmount: msg.value,
            ReceivedFromUsers: 0,
            AccumulatedForPayout: 0,
            PaidOut: 0,
            Refunded: 0,
            AcceptedTokenDecimals: 0,
            RewardTokenDecimals: 0,
            VestingAddress: address(0)
        });

        emit campaignCreated(
            CampaignID,
            _StartIn,
            _EndIn,
            _MinAllocation,
            _MaxAllocation,
            _AcceptedToken,
            _RewardTokenAddress,
            _RewardAmount,
            _TokenRate,
            _Owner,
            _MinGoal,
            _MaxGoal,
            _Type
        );
    }

    /**
     * @dev Updates the vesting's address.
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _vestingAddress Updating vesting's address.
     */
    function updateVesting(uint256 _campaign_id, address _vestingAddress)
        public
    {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(APPROVE_ROLE, msg.sender),
            "Caller is not an admin or approver."
        );

        require(
            _vestingAddress != address(0),
            "Vesting address cannot be zero"
        );

        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];

        campaignInfo.VestingAddress = _vestingAddress;
        emit vestingUpdated(_campaign_id, _vestingAddress);
    }

    /**
     * @dev Calculates the available amount of tokens to be paid out.
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _user User's address.
     * @return amount_  available to claim
     */
    function calcAvailableToken(uint256 _campaign_id, address _user)
        private
        view
        returns (uint256 amount_)
    {
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];
        UserInfo storage userInfo = users[_campaign_id][_user];

        uint256 amount = userInfo.Accumulated;

        IVesting vesting = IVesting(campaignInfo.VestingAddress);
        amount_ = vesting.calcAvailableToken(amount).sub(userInfo.PaidOut);

        return (amount_);
    }

    /**
     * @dev Approves the campaign with the gived ID.
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _sender User's address, who is going to be a token's supplier while starting a new campaign.
     */
    function approveCampaign(uint256 _campaign_id, address _sender) external {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
                hasRole(APPROVE_ROLE, msg.sender),
            "Caller is not an admin or approver."
        );

        Campaign storage campaign = campaigns[_campaign_id];
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];

        require(
            campaigns[_campaign_id].State == CampaignState.AwaitingApprove,
            "The campaign status must be awaiting approve."
        );

        uint256 tokenBalance = ERC20(campaign.RewardTokenAddress).balanceOf(
            address(this)
        );

        // transfer specified amount of project tokens to the contract
        ERC20(campaign.RewardTokenAddress).safeTransferFrom(
            _sender,
            address(this),
            campaign.RewardAmount
        );

        require(
            ERC20(campaign.RewardTokenAddress).balanceOf(address(this)) ==
                tokenBalance.add(campaign.RewardAmount),
            "Unable to transfer specified amount of project tokens."
        );

        // transfer comission to fee receiver
        if (campaignInfo.FeeAmount > 0) {
            fee_receiver.transfer(campaignInfo.FeeAmount);
        }

        campaign.State = CampaignState.Active;

        uint256 tokenDecimal = 18;
        // if ether was accepted for exchange
        if (campaign.AcceptedToken != address(0)) {
            tokenDecimal = ERC20(campaign.AcceptedToken).decimals();
        }

        require(tokenDecimal <= 18, "Too high decimals.");
        campaignInfo.AcceptedTokenDecimals = 10**tokenDecimal;

        tokenDecimal = ERC20(campaign.RewardTokenAddress).decimals();
        require(tokenDecimal <= 18, "Too high decimals.");
        campaignInfo.RewardTokenDecimals = 10**tokenDecimal;

        emit campaignApproved(_campaign_id);
    }

    /**
     * @dev Finishes the specified campaign.
     *
     * @param _campaign_id Campaign's unique identifier.
     */
    function finishCampaign(uint256 _campaign_id) external {
        Campaign storage campaign = campaigns[_campaign_id];

        require(
            block.timestamp > campaign.EndIn,
            "Campaign end time has not yet arrived."
        );

        require(
            campaign.State == CampaignState.Active,
            "The campaign status must be active."
        );

        finishCampaignAndSetState(_campaign_id);
    }

    /**
     * @dev Finishes the campaign with specified ID and sets the corresponding state.
     *
     * @param _campaign_id Campaign's unique identifier.
     */
    function finishCampaignAndSetState(uint256 _campaign_id) private {
        Campaign storage campaign = campaigns[_campaign_id];
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];

        if (campaignInfo.ReceivedFromUsers >= campaign.MinGoal) {
            campaign.State = CampaignState.CompletedSuccessfully;

            // if ether was accepted for exchange
            if (campaign.AcceptedToken == address(0)) {
                campaign.Owner.transfer(campaignInfo.ReceivedFromUsers);
            } else {
                ERC20(campaign.AcceptedToken).safeTransfer(
                    campaign.Owner,
                    campaignInfo.ReceivedFromUsers
                );
            }
        } else {
            campaign.State = CampaignState.CompletedUnsuccessfully;
        }

        emit campaignFinished(
            _campaign_id,
            campaign.State,
            campaignInfo.ReceivedFromUsers,
            campaignInfo.AccumulatedForPayout
        );
    }

    /**
     * @dev Enrolls the user to the specified campaign.
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _amount User's initial amount he is getting enrolled with to the campaign
     */
    function joinToCampaign(uint256 _campaign_id, uint256 _amount)
        public
        payable
    {
        Campaign storage campaign = campaigns[_campaign_id];
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];
        UserInfo storage userInfo = users[_campaign_id][msg.sender];

        require(
            campaign.State == CampaignState.Active,
            "The campaign status must be active."
        );

        // checking the start and end of the campaign
        require(
            block.timestamp > campaign.StartIn,
            "Campaign time has not come yet."
        );

        require(block.timestamp < campaign.EndIn, "Campaign time has expired.");

        // check if the company is whitelisted private
        if (campaign.Type == CampaignType.PrivateWhitelist) {
            require(
                whitelists_users[_campaign_id][msg.sender],
                "Sender must be whitelisted."
            );
            // checking if the company is private by the balance of the given token
        } else if (campaign.Type == CampaignType.PrivateToken) {
            require(
                ERC20(required_token[_campaign_id]).balanceOf(msg.sender) >=
                    required_token_amount[_campaign_id],
                "The Sender must have a more then min balance in the required token."
            );
        }

        // if ether is accepted for exchange
        if (campaign.AcceptedToken == address(0)) {
            _amount = msg.value;
        } else {
            ERC20(campaign.AcceptedToken).safeTransferFrom(
                msg.sender,
                address(this),
                _amount
            );
        }

        // checking the min and max allocation of the campaign
        if (
            campaign.MaxGoal.sub(campaignInfo.ReceivedFromUsers) >
            campaign.MinAllocation
        ) {
            require(
                _amount >= campaign.MinAllocation,
                "Allocation amount is less than the minimum threshold."
            );
        }

        campaignsUserAllocation[_campaign_id][
            msg.sender
        ] = campaignsUserAllocation[_campaign_id][msg.sender].add(_amount);

        require(
            campaignsUserAllocation[_campaign_id][msg.sender] <=
                campaign.MaxAllocation,
            "User allocation amount is more than the maximum threshold."
        );

        userInfo.ReceivedFromUser = userInfo.ReceivedFromUser.add(_amount);

        uint256 tokens = _amount
        .mul(campaignInfo.RewardTokenDecimals)
        .mul(1000000).div(campaign.TokenRate).div( // 1000 on ETH Fundraise
                campaignInfo.AcceptedTokenDecimals
            );

        userInfo.Accumulated = userInfo.Accumulated.add(tokens);

        campaignInfo.AccumulatedForPayout = campaignInfo
            .AccumulatedForPayout
            .add(tokens);

        campaignInfo.ReceivedFromUsers = campaignInfo.ReceivedFromUsers.add(
            _amount
        );

        // checking the filling of the campaign
        require(
            campaignInfo.ReceivedFromUsers <= campaign.MaxGoal,
            "Exchange amount exceeds MaxGoal."
        );

        if (!UserParticipated[msg.sender]) {
            UserParticipated[msg.sender] = true;
            Participated++;
        }

        if (!UserParticipatedCampaignStatus[msg.sender][_campaign_id]) {
            UserParticipatedCampaignStatus[msg.sender][_campaign_id] = true;
            UserParticipatedCampaigns[msg.sender].push(_campaign_id);
        }

        emit Swapped(
            _campaign_id,
            msg.sender,
            _amount,
            tokens,
            userInfo.ReceivedFromUser,
            userInfo.Accumulated,
            block.timestamp
        );

        // if the MaxGoal is reached - finish campaign
        if (campaignInfo.ReceivedFromUsers == campaign.MaxGoal) {
            finishCampaignAndSetState(_campaign_id);
        }
    }

    /**
     * @dev Claims back sent token if campaign completted unsuccessfully
     * @param _campaign_id Campaign's unique identifier.
     */
    function claimRefund(uint256 _campaign_id) public nonReentrant {
        Campaign storage campaign = campaigns[_campaign_id];
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];
        UserInfo storage userInfo = users[_campaign_id][msg.sender];

        require(
            campaign.State == CampaignState.CompletedUnsuccessfully,
            "Campaign must be completed unsuccessfully."
        );

        require(
            userInfo.ReceivedFromUser > 0,
            "There is nothing to claiming, the balance is zero."
        );
        uint256 amount;

        // if ether was accepted for exchange
        if (campaign.AcceptedToken == address(0)) {
            amount = userInfo.ReceivedFromUser;
            campaignInfo.Refunded = campaignInfo.Refunded.add(
                userInfo.ReceivedFromUser
            );
            userInfo.ReceivedFromUser = 0;

            msg.sender.transfer(amount);
        } else {
            amount = userInfo.ReceivedFromUser;
            campaignInfo.Refunded = campaignInfo.Refunded.add(
                userInfo.ReceivedFromUser
            );
            userInfo.ReceivedFromUser = 0;

            ERC20(campaign.AcceptedToken).safeTransfer(msg.sender, amount);
        }

        emit Refunded(_campaign_id, msg.sender, campaign.AcceptedToken, amount);
    }

    /**
     * @dev Claim swapped tokens if campaign completted successfully.
     * @param _campaign_id Campaign's unique identifier.
     */
    function claimToken(uint256 _campaign_id) public payable nonReentrant {
        Campaign storage campaign = campaigns[_campaign_id];
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];
        UserInfo storage userInfo = users[_campaign_id][msg.sender];

        require(
            campaign.State == CampaignState.CompletedSuccessfully,
            "Campaign must be completed successfully."
        );

        require(
            userInfo.Accumulated.sub(userInfo.PaidOut) > 0,
            "There is nothing to claiming, the balance is zero."
        );

        require(
            block.timestamp >= campaigns[_campaign_id].ClaimUnlockTime,
            "The time for claim tokens has not come yet."
        );

        uint256 amount;

        if (campaignInfo.VestingAddress == address(0)) {
            amount = userInfo.Accumulated;
        } else {
            amount = calcAvailableToken(_campaign_id, msg.sender);
        }

        userInfo.PaidOut = userInfo.PaidOut.add(amount);
        campaignInfo.PaidOut = campaignInfo.PaidOut.add(amount);

        ERC20(campaign.RewardTokenAddress).safeTransfer(msg.sender, amount);

        emit tokenClaimed(
            _campaign_id,
            msg.sender,
            campaign.RewardTokenAddress,
            amount
        );
    }

    /**
     * @dev Sets claim unlock time
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _unlockTime The time when to unlock the claim
     */
    function SetClaimUnlockTime(uint256 _campaign_id, uint256 _unlockTime)
        external
    {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin.");

        // require(
        //     campaigns[_campaign_id].ClaimUnlockTime == 0,
        //     "Claim unlock time already set."
        // );

        campaigns[_campaign_id].ClaimUnlockTime = _unlockTime;
        emit claimTimeSet(_campaign_id, _unlockTime);
    }

    /**
     * @dev Adds user to whitelist for a private campaign.
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _users An array of adresses to be added to the whitelist.
     */
    function AddUserToWhitelist(uint256 _campaign_id, address[] memory _users)
        external
    {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin.");

        for (uint256 i = 0; i < _users.length; i++) {
            whitelists_users[_campaign_id][_users[i]] = true;
        }
    }

    /**
     * @dev Removes user from whitelist for a private campaign
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _users An array of adresses to be removed from the whitelist.
     */
    function RemoveUserFromWhitelist(
        uint256 _campaign_id,
        address[] memory _users
    ) external {
        require(
            hasRole(ADMIN_ROLE, msg.sender) ||
                (msg.sender == campaigns[_campaign_id].Owner),
            "Caller is not an admin or campaign owner."
        );
        for (uint256 i = 0; i < _users.length; i++) {
            whitelists_users[_campaign_id][_users[i]] = false;
        }
    }

    /**
     * @dev Setting token address for the private campaign
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _token Token's address.
     * @param _amount Required amount on the token for the private campaign.
     */
    function UpdateRequiredToken(
        uint256 _campaign_id,
        address _token,
        uint256 _amount
    ) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin.");
        require(_token != address(0), "Token address can't be address(0).");

        required_token[_campaign_id] = _token;
        required_token_amount[_campaign_id] = _amount;
    }

    /**
     * @dev Add or remove a token address from the list of allowed to be accepted for exchange
     *
     * @param _token Token's address.
     * @param _state Bool state which sets whether the token should be accepted or not.
     */
    function UpdateTokenList(address _token, bool _state) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin.");
        require(_token != address(0), "Token address can't be address(0).");

        AcceptedTokenList[_token] = _state;
        emit TokenListUpdated(_token, _state);
    }

    /**
     * @dev Setting the address - the recipient of the commission
     *
     * @param _fee_receiver The fee recipient's address.
     */
    function UpdateFeeReceiver(address payable _fee_receiver) external {
        require(hasRole(ADMIN_ROLE, msg.sender), "Caller is not an admin.");
        require(_fee_receiver != address(0), "Receiver can't be address(0).");

        fee_receiver = _fee_receiver;
    }

    /**
     * @dev claimRewardToken
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _receiver Recipient's address.
     * @param _amount  An amount to transfer.
     */
    function claimRewardToken(
        uint256 _campaign_id,
        address _receiver,
        uint256 _amount
    ) external {
        require(
            hasRole(TOKEN_CONTROL_ROLE, msg.sender),
            "Caller is not an token controller."
        );

        Campaign storage campaign = campaigns[_campaign_id];

        ERC20(campaign.RewardTokenAddress).safeTransfer(_receiver, _amount);
    }

    /**
     * @dev claimAcceptedToken
     *
     * @param _campaign_id Campaign's unique identifier.
     * @param _receiver Recipient's address.
     * @param _amount  An amount to transfer.
     */
    function claimAcceptedToken(
        uint256 _campaign_id,
        address _receiver,
        uint256 _amount
    ) external {
        require(
            hasRole(TOKEN_CONTROL_ROLE, msg.sender),
            "Caller is not an token controller."
        );

        Campaign storage campaign = campaigns[_campaign_id];

        ERC20(campaign.AcceptedToken).safeTransfer(_receiver, _amount);
    }

    /**
     * @dev removeTokenByAddress - remove any token from the contract by its address
     *
     * @param _address Token's address.
     * @param _amount  An amount to transfer.
     */
    function removeTokenByAddress(address _address, uint256 _amount) public {
        require(
            hasRole(ADMIN_ROLE, msg.sender),
            "Staking: caller is not an admin"
        );
        require(_address != address(0), "Invalid token address");
        require(_amount > 0, "Amount must be possitive");
        ERC20(_address).safeTransfer(msg.sender, _amount);
    }

    /**
     * @dev Returns user info for specified campaign ID
     *
     * @param _user User's address.
     * @param _campaign_id Campaign's unique identifier.
     */
    function GetUserInfo(address _user, uint256 _campaign_id)
        external
        view
        returns (
            uint256 ReceivedFromUser, //
            uint256 Accumulated,
            uint256 AvailableToClaim,
            uint256 AcceptedTokenBalance, //
            string memory AcceptedTokenSymbol,
            string memory AcceptedTokenName,
            uint256 RewardTokenBalance, //
            string memory RewardTokenSymbol,
            string memory RewardTokenName
        )
    {
        Campaign storage campaign = campaigns[_campaign_id];
        UserInfo storage userInfo = users[_campaign_id][_user];
        CampaignInfo storage campaignInfo = campaignsInfo[_campaign_id];

        // if ether is accepted for exchange
        if (campaign.AcceptedToken == address(0)) {
            AcceptedTokenBalance = _user.balance;
            AcceptedTokenSymbol = "ETH";
            AcceptedTokenName = "Ethereum";
        } else {
            AcceptedTokenBalance = ERC20(campaign.AcceptedToken).balanceOf(
                _user
            );
            AcceptedTokenSymbol = ERC20(campaign.AcceptedToken).symbol();
            AcceptedTokenName = ERC20(campaign.AcceptedToken).name();
        }

        RewardTokenBalance = ERC20(campaign.RewardTokenAddress).balanceOf(
            _user
        );
        RewardTokenSymbol = ERC20(campaign.RewardTokenAddress).symbol();
        RewardTokenName = ERC20(campaign.RewardTokenAddress).name();

        if (campaignInfo.VestingAddress == address(0)) {
            AvailableToClaim = userInfo.Accumulated.sub(userInfo.PaidOut);
        } else {
            AvailableToClaim = calcAvailableToken(_campaign_id, _user);
        }

        return (
            userInfo.ReceivedFromUser,
            userInfo.Accumulated.sub(userInfo.PaidOut),
            AvailableToClaim,
            AcceptedTokenBalance,
            AcceptedTokenSymbol,
            AcceptedTokenName,
            RewardTokenBalance,
            RewardTokenSymbol,
            RewardTokenName
        );
    }

    /**
     * @dev Returns campaigns the user has participated in.
     *
     * @param _user User's address
     */
    function GetUserParticipatedCampaigns(address _user)
        external
        view
        returns (uint256[] memory UserParticipatedCampaignsList)
    {
        return UserParticipatedCampaigns[_user];
    }

    /**
     * @dev Returns user info for specified private campaign ID
     *
     * @param _user User's address.
     * @param _campaign_id Campaign's unique identifier.
     */
    function GetUserInfoForPrivateCampaign(address _user, uint256 _campaign_id)
        external
        view
        returns (
            uint256 PrivateTokenUserBalance, //
            uint256 PrivateTokenCampaignBalance, //
            string memory PrivateTokenSymbol, //
            string memory PrivateTokenName, //
            bool WhitelistStatus
        )
    {
        Campaign storage campaign = campaigns[_campaign_id];

        if (campaign.Type == CampaignType.PrivateToken) {
            PrivateTokenUserBalance = ERC20(required_token[_campaign_id])
                .balanceOf(_user);
            PrivateTokenSymbol = ERC20(required_token[_campaign_id]).symbol();
            PrivateTokenName = ERC20(required_token[_campaign_id]).name();
        }

        return (
            PrivateTokenUserBalance,
            required_token_amount[_campaign_id],
            PrivateTokenSymbol,
            PrivateTokenName,
            whitelists_users[_campaign_id][_user]
        );
    }

    /**
     * @dev Returns campaigns info
     *
     * @param _campaign_id A list of campaigns' unique identifiers
     */
    function GetCampaignInfo(uint256[] memory _campaign_id)
        external
        view
        returns (CampaignInfoList[] memory campaignsInfoList)
    {
        campaignsInfoList = new CampaignInfoList[](_campaign_id.length);

        for (uint256 i = 0; i < _campaign_id.length; i++) {
            campaignsInfoList[i] = CampaignInfoList({
                StartIn: campaigns[_campaign_id[i]].StartIn,
                EndIn: campaigns[_campaign_id[i]].EndIn,
                MinGoal: campaigns[_campaign_id[i]].MinGoal,
                MaxGoal: campaigns[_campaign_id[i]].MaxGoal,
                AcceptedToken: campaigns[_campaign_id[i]].AcceptedToken,
                RewardTokenAddress: campaigns[_campaign_id[i]]
                    .RewardTokenAddress,
                TokenRate: campaigns[_campaign_id[i]].TokenRate,
                ReceivedFromUsers: campaignsInfo[_campaign_id[i]]
                    .ReceivedFromUsers,
                AccumulatedForPayout: campaignsInfo[_campaign_id[i]]
                    .AccumulatedForPayout,
                PaidOut: campaignsInfo[_campaign_id[i]].PaidOut,
                Refunded: campaignsInfo[_campaign_id[i]].Refunded,
                Type: campaigns[_campaign_id[i]].Type,
                State: campaigns[_campaign_id[i]].State
            });
        }

        return campaignsInfoList;
    }

    /**
     * @dev Returns total Users Participated
     */
    function GetTotalUsersParticipated()
        external
        view
        returns (uint256 UsersParticipated)
    {
        UsersParticipated = Participated;

        return UsersParticipated;
    }

    /**
     * @dev Returns the numbers of campaign
     */
    function GetCampaignNumbers()
        external
        view
        returns (uint256 campaignNumbers)
    {
        return campaigns.length;
    }
}
