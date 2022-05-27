pragma solidity ^0.8.0;



interface IIBondsIssuer {

  function deploy(
    uint256 bondId,
    address currencyToken,
    uint256 totalSupply,
    uint256 maturityPeriod
  ) external;

  function updateRate(uint256 rewardRate, uint256 rewardsDuration) external;

  function distributeReward(uint256 bondId, uint256 rewardAmount, uint256 rewardsDuration) external;


}
