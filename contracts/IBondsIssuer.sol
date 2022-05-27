pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
//import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IBond.sol";
import "./InflationRateFetcher.sol";

contract IBondsIssuer is Ownable {
  using SafeMath for uint256;


  mapping(uint256 => BondInfo) public iBondsList;
  mapping(address => uint256) public rateFetcherList;

  struct BondInfo {
    address bondAddress;
    address currencyToken;
    uint256 totalSupply;
    uint256 maturityPeriod;
  }

  //TODO initially tried to manage RateFetcher initialization in factory class, but gave up due to contract size exceed error
  // may need to consider proxy or clone pattern
//  struct RateFetcherInfo {
//    uint256 bondId;
//    address oracle;
//    string jobId;
//    uint256 fee;
//  }


  uint256 SECONDS_IN_A_YEAR = 31449600;


  function deploy(uint256 bondId, address currencyToken, uint256 totalSupply, uint256 maturityPeriod) public onlyOwner {

    require(totalSupply > 0, "totalSupply should be positive");
    BondInfo storage iBond = iBondsList[bondId];
    require(iBond.bondAddress == address(0), "iBondIssuer::deploy: already deployed");

    iBondsList[bondId].bondAddress = address(
      new IBond(address(this), currencyToken, totalSupply, maturityPeriod)
    );
    iBondsList[bondId].currencyToken = currencyToken;
    iBondsList[bondId].totalSupply = totalSupply;
    iBondsList[bondId].maturityPeriod = maturityPeriod;

  }

  function setRateFetcher(uint256 bondId, address rateFetcherAddr) public onlyOwner{
    rateFetcherList[rateFetcherAddr] = bondId;
  }

  //This method is called from InflationRateFetcher
  function updateRate(uint256 inflationRate, uint256 rewardsDuration) public  onlyUpdater{
    require(rateFetcherList[msg.sender]!=0, "unauthorized access");
    console.log(msg.sender);
    uint256 bondId = rateFetcherList[msg.sender];
    require(iBondsList[bondId].bondAddress != address(0),  "IBondIssuer::not deployed");

    uint256 rewardAmount = (iBondsList[bondId].totalSupply).mul(inflationRate).div(1e20).mul(rewardsDuration).div(SECONDS_IN_A_YEAR);
    distributeReward(bondId, rewardAmount, rewardsDuration);
  }



  function distributeReward(uint256 bondId, uint256 rewardAmount, uint256 rewardsDuration) public
    onlyUpdater
  {
    console.log(msg.sender);
    require(iBondsList[bondId].bondAddress != address(0),  "IBondIssuer::update: not deployed");

    if (rewardAmount > 0 && rewardsDuration > 0) {

      require(
        IERC20(iBondsList[bondId].currencyToken).transfer(iBondsList[bondId].bondAddress, rewardAmount),
        "IBondIssuer::claimRewardAmount: transfer failed"
      );
      IBond(iBondsList[bondId].bondAddress).distributeReward(rewardAmount, rewardsDuration);
    }
  }

  function pullExtraTokens(address token, uint256 amount) external onlyOwner {
    IERC20(token).transfer(msg.sender, amount);
  }

  modifier onlyUpdater() {
    require((owner() == _msgSender()) || rateFetcherList[msg.sender]!=0, "caller is neither the owner nor rate Fetcher");
    _;
  }
}
