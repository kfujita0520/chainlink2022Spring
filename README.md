# i-Bond with Truflation

## Inspiration
i-Bond (inflation linked bond) is very popular among retail working class people to protect their asset from inflation. However, currently issuance amount is not enough to meet people's demand.
We would like to offer cost-efficient and transparent system for bond issuance and interest distribution. Then hopefully more i-bond will be allocated to more people by reallocating saved cost to interest rewards budget.
In addition, inflation rate metrics should be more tightly tied to people's everyday life cost rather than metrics the central government defines, which sometimes affected by political factor.

## What it does
This system can offer following features to achieve quick, cost-efficient and transparent operations.
- Create bond very easily by just specifying Currency, Maturity Period, Issued Amount.
- Interest Rate is dynamically changed everyday and this will be the inflation rate defined by Truflation.
- Accrued interest will be given to user every seconds and user could withdraw it at any time.
- User can transfer their subscribed amount of bond to other user at their will instantly.

The example screenshot of UI can be found below.
![screenshot](docs/img/screen.png?raw=true)

For inflation rate, we will take the metric calculated by Truflation in decentralized way. For the detail why central bank metric sometimes has problem and how Truflation can fix this problem is explained in their site.
https://whitepaper.truflation.com/background/problem


## How we built it
Please find the system architecture attached on image gallery.
![system_architecture](docs/img/system_architecture.png?raw=true)
There are two highlight we can address on our system development.

1) Chainlink Integration  
   We have built custom job in order to fetch two parameters(inflation rate & Date) from truflation API. (Example job provided by Trulation retuned inflation rate only.)
   RateFetcher contract, which inherits ChainLinkClient, requests chainlink oracle to return "inflation rate" and "date", then verify if returned data is already fetched one or not by "date" value. If the data is new, RateFetcher contract will notify it to iBond contract (through iBondIssuer Contract).
   Lastly, rate update must be done every day. (Truflation rate is updated daily). We will reply on the ChianLink Keeper mechanism for this.

2) IBond Implementation  
   Core logic of i-bond is implemented in IBond contract, which is a bit complicated. IBond contract instance will be created whenever issuer create different i-bond(maturity period, currency, supply amount).
   IBond contract store all basic bond information as well as subscription situation of each subscriber. All necessary functions for subscriber (subscribe, claim accrued interest, transfer) are also supported in this contract.


## TODO of this project
1) Limit subscription amount per person  
   Usually, amount of i-bond each person can buy is limited due to its popularity and we should add function of it. For example, bond issuer can set "cap" amount per person, then they can change at any time depending on the subscription situation. (i.e. if less people buy, they can increase the cap.)
   Note if we seriously implement, perhaps, we should tie up with some crypto KYC vendor, as currently it is very normal for one person to have multiple ETH accounts. our system only can differentiate the account at the moment.

2) UI  
    UI implementaion is still minimal and can be better further. In addition to product UI, some test tool UI is nice-to-have. 
For example, reward distribution tool etc.


3) Code Improvement  
   A couple of TODO notes are added inside source code where we have room to improve

## Acknowledgments
For working on ChainLink integration with Truflation, I got a big help from professional people of these products. 
I would like to special thank for following people. 

@joequant: Joseph at Truflation
who explained the technical specification of Truflation API.  
@mgladson: Matt at Block Farms
who supported external adapter development of mine. 