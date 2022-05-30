
const CurrencyTokenAddress = "0x19c54C6986E146dCd2E8CB11E95BC5080Dd19839";
const IBondAddress = "0x36B71B243ADeD992fF4277f816E0C8f2fE42BabB";
const rewardButton = document.getElementById('reward-button');
const subscribeButton = document.getElementById('subscribe-button');
const subscribeAmountInput = document.getElementById('subscribe-amount');
const transferButton = document.getElementById('transfer-button');
const transferAmountInput = document.getElementById('transfer-amount');
const transferAddressInput = document.getElementById('transfer-address');
const redeemButton = document.getElementById('redeem-button');

const descBox = document.getElementById('buy-announce');
const enableEthereumButton = document.getElementById('enable-button');
const SECONDS_IN_A_YEAR = 31449600
let accounts;
let provider;

let CurrencyAddress;
let IBondContract, CurrencyContract;

enableEthereumButton.onclick = async () => {
  console.log('test');
  provider = new ethers.providers.Web3Provider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  console.log(accounts);
  console.log(accounts[0]);

};


rewardButton.onclick = async () => {
  const signer = await provider.getSigner();
  let signerAddr = await signer.getAddress();
  console.log(signerAddr);
  const IBondContract = new ethers.Contract(IBondAddress, IBondAbi, signer);

  await IBondContract.getReward();

};



subscribeButton.onclick = async () => {
  const signer = await provider.getSigner();

  const IBondContract = new ethers.Contract(IBondAddress, IBondAbi, signer);
  console.log(subscribeAmountInput.value);

  await IBondContract.subscribe(ethers.utils.parseEther(subscribeAmountInput.value));



};

transferButton.onclick = async () => {
  console.log('transfer token');
  const signer = await provider.getSigner();

  const IBondContract = new ethers.Contract(IBondAddress, IBondAbi, signer);
  console.log(transferAmountInput.value);
  console.log(transferAddressInput.value);

  await IBondContract.stakeTransferWithBalance(ethers.utils.parseEther(transferAmountInput.value), transferAddressInput.value);

};





async function setupStatus() {
  await Promise.allSettled([setupIBondStatus(), setupSubscriberStatus()]).then(result => {
    console.log('Complete promise');
  });

}

async function setupIBondStatus() {

  IBondContract = new ethers.Contract(IBondAddress, IBondAbi, provider);

  let totalSupply = await IBondContract.totalSupply();
  document.getElementById('total_supply').innerHTML = ethers.utils.formatEther(totalSupply);

  CurrencyAddress = await IBondContract.usdToken();
  CurrencyContract = new ethers.Contract(CurrencyAddress, erc20Abi, provider);
  let currency_name = await CurrencyContract.name();
  console.log(currency_name);
  document.getElementById('currency_name').innerHTML = currency_name;
  let maturity_period =  (await IBondContract.maturityPeriod()).div(SECONDS_IN_A_YEAR);
  document.getElementById('maturity_period').innerHTML = maturity_period.toString();

  let maturity_date = await IBondContract.maturityTime();
  if(maturity_date == 0){
    document.getElementById('maturity_date').innerHTML = "T.B.D.";
  } else {
    console.log('maturity_date');
    console.log(maturity_date.toString())
    console.log(new Date(maturity_date * 1000));

    document.getElementById('maturity_date').innerHTML = (new Date(maturity_date*1000)).toLocaleDateString();
  }
  let total_subscribed = await IBondContract.totalSubscribed();
  console.log(ethers.utils.formatEther(totalSupply.sub(total_subscribed)));
  document.getElementById('available_amount').innerHTML = ethers.utils.formatEther(totalSupply.sub(total_subscribed));

  //TODO apply prmiseAll
  // Example Script for Promise.all
  // let [total, period]
  //     = await Promise.allSettled([IBondContract.totalSupply(),
  //   IBondContract.maturityPeriod()
  // ]);
  // console.log(total.value.toString());

}

async function setupSubscriberStatus() {
  IBondContract = new ethers.Contract(IBondAddress, IBondAbi, provider);
  let maturity_date = await IBondContract.maturityTime();
  console.log(maturity_date.toString());
  console.log(Date.now());
  if(Math.floor(Date.now() / 1000) < maturity_date){
    redeemButton.disabled = true;
  }

  console.log('subscribed: ');
  let subscribed = await IBondContract.balanceOf(accounts[0]);
  console.log('subscribed: ', ethers.utils.formatEther(subscribed));
  document.getElementById('subscribed_amount').innerHTML = ethers.utils.formatEther(subscribed);

  console.log('claimable amount: ');
  let claim_amount = await IBondContract.earned(accounts[0]);
  console.log('claimable: ', ethers.utils.formatEther(claim_amount));
  let claim_amount_str = ethers.utils.formatEther(claim_amount);
  claim_amount_str = (+claim_amount_str).toFixed(5);
  console.log('claimable: ', claim_amount_str);

  document.getElementById('interest_amount').innerHTML = claim_amount_str;



}



async function isMetaMaskConnected()  {
  accounts = await provider.listAccounts();
  console.log('account[0]: ' + accounts[0]);
  console.log('account length: ' + accounts.length);
  return accounts.length > 0;
}

async function getTokenBalance(tokenAddress, accountAddress) {
  const erc20Contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
  let bal = await erc20Contract.balanceOf(accountAddress);
  let decimals = await erc20Contract.decimals();
  console.log('balance of token: ', ethers.utils.formatUnits(bal, decimals));
  return ethers.utils.formatUnits(bal, decimals);

  // let tokenBal = (balance/Math.pow(10, unit)).toFixed(3);

}


async function tokenHoldCheck()  {
  let balance = await getTokenBalance(CurrencyTokenAddress, window.ethereum.selectedAddress);
  console.log('balance: ', balance)
  return balance > 10;
}



window.addEventListener('load', async (event) => {

  provider = new ethers.providers.Web3Provider(window.ethereum);

  let connected = await isMetaMaskConnected();
  if (connected){
    // metamask is connected
    console.log('metamask is connected to ' + window.ethereum.selectedAddress);
    enableEthereumButton.disabled = true;
    enableEthereumButton.innerHTML = window.ethereum.selectedAddress;

    await setupStatus();
    let isTokenHolder = await tokenHoldCheck();
    if(!isTokenHolder){
      descBox.style.display = "block";
    }

    //TODO check token is approved for transfer


    console.log('Loading');
  } else{
    // metamask is not connected
    console.log('metamask is not connected');
    document.getElementById('metamask-announce').style.display = "block";
  }

  console.log('Completed');




});

