pragma solidity ^0.8.0;

abstract contract RewardsDistributionRecipient {
  address public rewardsDistribution;

  function distributeReward(uint256 reward, uint256 duration) external virtual;

  modifier onlyRewardsDistribution() {
    require(
      msg.sender == rewardsDistribution,
      "Caller is not RewardsDistribution contract"
    );
    _;
  }
}
