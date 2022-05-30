const IBondIssuerAddress = "0x41048720F820dfd243572C4209AC9eC20889eeB5";
const issueBondButton = document.getElementById('issue-bond-button');
const bondIdInput = document.getElementById('bondId');
const currencyAddressInput = document.getElementById('currency-address');
const totalAmountInput = document.getElementById('total-supply');
const maturityPeriodInput = document.getElementById('maturity-period');
const enableEthereumButton = document.getElementById('enable-button');
let accounts;
let provider;

const SECONDS_IN_A_YEAR = 31449600

enableEthereumButton.onclick = async () => {
  console.log('test');
  provider = new ethers.providers.Web3Provider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  console.log(accounts);
  console.log(accounts[0]);

};


issueBondButton.onclick = async () => {
  const signer = await provider.getSigner();
  const IBondsIssuerContract = new ethers.Contract(IBondIssuerAddress, IBondsIssuerAbi, signer);

  console.log(bondIdInput.value);
  console.log(currencyAddressInput.value);
  //TODO should define the value of Year(It should not be float, int or allow 0.5 only. Perhaps list up)
  console.log(parseFloat(maturityPeriodInput.value)*SECONDS_IN_A_YEAR);
  console.log(totalAmountInput.value);

  await IBondsIssuerContract.deploy(bondIdInput.value, currencyAddressInput.value, ethers.utils.parseEther(totalAmountInput.value), parseFloat(maturityPeriodInput.value)*SECONDS_IN_A_YEAR);

};






async function isMetaMaskConnected()  {
  const accounts = await provider.listAccounts();
  console.log('account[0]' + accounts[0]);
  console.log('account length' + accounts.length);
  return accounts.length > 0;
}


window.addEventListener('load', async (event) => {

  provider = new ethers.providers.Web3Provider(window.ethereum);

  let connected = await isMetaMaskConnected();
  if (connected){
    // metamask is connected
    console.log('metamask is connected to ' + window.ethereum.selectedAddress);
    enableEthereumButton.disabled = true;
    enableEthereumButton.innerHTML = window.ethereum.selectedAddress;


    console.log('Loading');
  } else{
    // metamask is not connected
    console.log('metamask is not connected');
    document.getElementById('metamask-announce').style.display = "block";
  }

  console.log('Completed');

});

