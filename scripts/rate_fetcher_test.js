// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const {moveTime} = require("../utils/move-time");
const {moveBlocks} = require("../utils/move-blocks");

let iBond, usdToken, iBondIssuer, rateFecher, deployer, subscriber1, subscriber2, subscriber3;

const SECONDS_IN_A_HOUR = 3600
const SECONDS_IN_A_DAY = 86400
const SECONDS_IN_A_WEEK = 604800
const SECONDS_IN_A_YEAR = 31449600

let bondId = 100;
let oracle = "0x9f8f7c4dCF80Babff1081089F44A89619E82A211";
let jobId = "9d5070da558c4c07b9a91af2ba63b7f5";
let fee = 0;

async function main() {

    await initialSetup();


    //await rewardShareByMultiStakers();

    //await soloStakingGeneralProgress();

    //await performClaimRewardViaFactory();

    //await lockingStake();

    //TODO call claimRewad from BondIssuer
    //TODO change the method name from claimReward to RewardFulfill or GrantReward

    console.log('total_supply: ', hre.ethers.utils.formatEther(await iBond.totalSupply()));


    console.log(await printBalance(subscriber1.address));
    let amount100 = hre.ethers.utils.parseEther("100");
    let addAmount = SECONDS_IN_A_DAY*1000000;
    await iBond.connect(subscriber1).subscribe(amount100);
    //console.log(await printBalance(subscriber1.address));


    await iBondIssuer.distributeReward(bondId, addAmount, SECONDS_IN_A_DAY);
    await printGlobalStatus(iBond);
    console.log("Status of Subscriber1");
    await printStakerStatus(subscriber1);

    await moveTime(SECONDS_IN_A_HOUR*3);
    await moveBlocks(1);

    console.log('------------------------');

    await printGlobalStatus(iBond);
    console.log("Status of Subscriber1");
    await printStakerStatus(subscriber1);

    await iBond.connect(subscriber2).subscribe(amount100);

    await moveTime(SECONDS_IN_A_HOUR*3);
    await moveBlocks(1);

    console.log('------------------------');

    await printGlobalStatus(iBond);
    console.log("Status of Subscriber1");
    await printStakerStatus(subscriber1);
    console.log("Status of Subscriber2");
    await printStakerStatus(subscriber2);



    // await iBondIssuer.setRateFetcher(bondId, deployer.address);
    // await iBondIssuer.updateRate("12092584745790253000", SECONDS_IN_A_DAY);

    // await iBondIssuer.setRateFetcher(bondId, subscriber3.address);
    // await iBondIssuer.connect(subscriber3).updateRate("12092584745790253000", SECONDS_IN_A_DAY);

    let date = hre.ethers.utils.toUtf8Bytes("2022-05-27");
    let requestId = hre.ethers.utils.toUtf8Bytes("3bf11ae4c11844f299f91c8d3b279f01");
    //await rateFecher.fulfillDateAndRates(requestId, date, "12092584745790253000");
    await rateFecher.updateRateByOwner("2022-05-29", "12092584745790253000");




    console.log('Complete');

}

async function initialSetup(){
    [deployer, subscriber1, subscriber2, subscriber3] = await hre.ethers.getSigners();
    const usdTokenContract = await hre.ethers.getContractFactory("USDToken");
    usdToken = await usdTokenContract.deploy();
    await usdToken.deployed();
    console.log("usdToken deployed to:", usdToken.address);


    const iBondIssuerContract = await hre.ethers.getContractFactory("IBondsIssuer");
    iBondIssuer = await iBondIssuerContract.deploy();
    await iBondIssuer.deployed();
    console.log("iBondsIssuer deployed to:", iBondIssuer.address);


    await iBondIssuer.deploy(bondId, usdToken.address, hre.ethers.utils.parseEther("1000000"), SECONDS_IN_A_YEAR);
    let iBondInfo = await iBondIssuer.iBondsList(bondId);
    console.log(iBondInfo);
    iBond = await hre.ethers.getContractAt("IBond", iBondInfo.bondAddress);

    const rateFecherContract = await hre.ethers.getContractFactory("InflationRateFetcher");
    rateFecher = await rateFecherContract.deploy(oracle, jobId, fee, iBondIssuer.address);
    await rateFecher.deployed();
    console.log("rateFecher deployed to:", rateFecher.address);

    await iBondIssuer.setRateFetcher(bondId, rateFecher.address);


    //move reward token to staking contract
    //await usdToken.transfer(iBond.address, hre.ethers.utils.parseEther("1000000"));
    //move stake token to stakers
    await usdToken.transfer(subscriber1.address, hre.ethers.utils.parseEther("10000"));
    await usdToken.transfer(subscriber2.address, hre.ethers.utils.parseEther("10000"));
    await usdToken.transfer(subscriber3.address, hre.ethers.utils.parseEther("10000"));
    await usdToken.transfer(iBondIssuer.address, hre.ethers.utils.parseEther("10000"));

    await usdToken.connect(subscriber1).approve(iBond.address, hre.ethers.constants.MaxUint256);
    await usdToken.connect(subscriber2).approve(iBond.address, hre.ethers.constants.MaxUint256);
    await usdToken.connect(subscriber3).approve(iBond.address, hre.ethers.constants.MaxUint256);
}






async function printGlobalStatus(staking){
    let reward = await staking.rewardPerToken();
    console.log("Reward Per Token: ", reward.toString());
    let supplyBal = await staking.totalSupply();
    console.log("Total Supply Balance: ", hre.ethers.utils.formatEther(supplyBal));
    let lastUpdateTime = await staking.lastUpdateTime();
    console.log("last update time: ", lastUpdateTime.toString());
    let periodFinishTime = await staking.periodFinish();
    console.log("period finish time: ", periodFinishTime.toString());
    let rewardRate = await staking.rewardRate();
    console.log("rewardRate: ", rewardRate.toString());
    let rewardBalance = await usdToken.balanceOf(staking.address);
    console.log("total reward balance: ", rewardBalance.toString());
}

async function printStakerStatus(staker){

    let earned = await iBond.earned(staker.address);//this should be the same as claimable amount
    console.log("Claimable Amount for this staker: ", earned.toString());
    let balance = await iBond.balanceOf(staker.address);
    console.log("Balance of staker: ", hre.ethers.utils.formatEther(balance));
    let paidRewardPerToken = await iBond.userRewardPerTokenPaid(staker.address);
    console.log("Paid Reward Amount Per Token for this staker: ", paidRewardPerToken.toString());
    let rewardUser = await iBond.rewards(staker.address);
    console.log("Reward Amount for this staker: ", rewardUser.toString());


}

async function printBalance(signer){
    let balance = await usdToken.balanceOf(signer);
    return hre.ethers.utils.formatEther(balance);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
