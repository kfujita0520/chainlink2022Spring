pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IIBond.sol";
import "./RewardsDistributionRecipient.sol";
import "hardhat/console.sol";

contract IBond is
IIBond,
RewardsDistributionRecipient,
ReentrancyGuard
{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */
    IERC20 public usdToken;//this can be any currency
    uint256 public periodFinish = 0;
    uint256 public rewardRate = 0;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    uint256 public maturityTime;
    uint256 public maturityPeriod;

    uint256 public totalSupply;
    uint256 public totalSubscribed;//the amount of bond purchase by users.
    mapping(address => uint256) private _balances;

    /* ========== CONSTRUCTOR ========== */


    constructor(
        address _rewardsDistribution,
        address _usdToken,
        uint256 _totalSupply,
        uint256 _maturityPeriod
    ) public {
        require(_totalSupply > 0, "amount of issued bond should be positive");
        usdToken = IERC20(_usdToken);
        rewardsDistribution = _rewardsDistribution;
        totalSupply = _totalSupply;
        maturityPeriod = _maturityPeriod;
        totalSubscribed = 0;
    }

    /* ========== VIEWS ========== */

//    function currencyName() external view returns (string memory) {
//        return usdToken.name();
//    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable() public view override returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view override returns (uint256) {

        return
        rewardPerTokenStored.add(
            lastTimeRewardApplicable()
            .sub(lastUpdateTime)
            .mul(rewardRate)
            .mul(1e18)
            .div(totalSupply)
        );
    }

    function earned(address account) public view override returns (uint256) {

        return
        _balances[account]
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
    }

//    function getRewardForDuration() external view override returns (uint256) {
//        //In this model, "duration" can be changed every time reward added, and there is no specific field to store it
//        //Given that, this method will return the remained time till current staking reward period will be finished
//        if (block.timestamp >= periodFinish) {
//            return 0;
//        } else {
//            return rewardRate.mul(periodFinish.sub(block.timestamp));
//        }
//    }

    /* ========== MUTATIVE FUNCTIONS ========== */
    function subscribe(uint256 amount)
    external
    override
    nonReentrant
    updateReward(msg.sender)
    {
        require(amount > 0, "Cannot stake 0");
        require(totalSupply.sub(totalSubscribed) >= amount, "Bond is sold out");
        //TODO do not exceed individual cap
        totalSubscribed = totalSubscribed.add(amount);
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        usdToken.safeTransferFrom(msg.sender, address(this), amount);
        usdToken.safeTransfer(rewardsDistribution, amount);
        emit Staked(msg.sender, amount);
    }

    function stakeTransferWithBalance(
        uint256 amount,
        address useraddress
    ) external nonReentrant updateReward(useraddress) {
        require(amount > 0 && amount <= _balances[msg.sender], "Cannot withdraw 0");
        _balances[useraddress] = _balances[useraddress].add(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        usdToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(useraddress, amount);
    }

    function withdraw(uint256 amount)
    public
    override
    nonReentrant
    updateReward(msg.sender)
    {
        require(block.timestamp > maturityTime, "Maturity date is not yet come so cannot redeem");
        require(amount > 0, "Cannot withdraw 0");

        totalSubscribed = totalSubscribed.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        usdToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);

    }

    function getReward() public override nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            usdToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    function quit() external override {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /* ========== RESTRICTED FUNCTIONS ========== */
    function updateMonthlyInterestRate(uint256 rate, uint256 rewardsDuration) external {
        //calculate reward amount and transfer from distributor, then call claimRewardAmount
        //consider which method should we call updateReward(address(0)
    }

    //TODO update reward rate with reward amount
    function distributeReward(uint256 reward, uint256 rewardsDuration)
    external
    override
    onlyRewardsDistribution
    updateReward(address(0))
    {
        //TODO once maturityTime exceed, this method should no longer works
        //TODO if maturityTime is not set, set block.timestamp + 1 year
        require(
            block.timestamp.add(rewardsDuration) >= periodFinish,
            "Cannot reduce existing period"
        );

        if (block.timestamp <= periodFinish) {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardsDuration = rewardsDuration.add(remaining);
            rewardRate = reward.add(leftover).div(rewardsDuration);
        } else {
            if(periodFinish == 0){
                //The first time of reward distribution
                //this is normal flow. if we can allow some blank time for giving reward, this is fine.
                rewardRate = reward.div(rewardsDuration);
                maturityTime =  maturityPeriod.add(block.timestamp);
            } else {
                //TODO it is still question if we need this logic.maybe throw error is easier
                uint256 overtime = block.timestamp.sub(periodFinish);
                //TODO did not consider the scenario where new claim comes after long time from periodFinish i.e overtime is bigger than rewardDuration
                rewardsDuration = rewardsDuration.sub(overtime);
                rewardRate = reward.div(rewardsDuration);
            }
        }

        uint256 balance = usdToken.balanceOf(address(this));
        require(
            rewardRate <= balance.div(rewardsDuration),
            "Provided reward too high"
        );

        lastUpdateTime = block.timestamp;
        if(periodFinish==0){
            periodFinish = block.timestamp.add(rewardsDuration);
        } else {
            periodFinish = periodFinish.add(rewardsDuration);
        }
        emit RewardAdded(reward, periodFinish);
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
}

