pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IIBondsIssuer.sol";

contract InflationRateFetcher is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    //Oracle: 0x9f8f7c4dCF80Babff1081089F44A89619E82A211
    //JobId: 9d5070da558c4c07b9a91af2ba63b7f5
    //fee: 0
    //Link Address: 0x01BE23585060835E02B77ef475b0Cc51aA1e0709 (rinkeby)


    address public oracleId;
    string public jobId;
    uint256 public fee;
    address public bondIssuer;
    uint256 SECONDS_IN_A_DAY = 86400;
    //uint256 lastTimeUpdate;

    bytes public data;
    string public date;
    uint256 public yearOverYearInflation;


    constructor(
        address oracleId_,
        string memory jobId_,
        uint256 fee_,
        address bondIssuer_
    ) {
        //TODO fix for test
        //setPublicChainlinkToken();
        setChainlinkToken(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);
        setChainlinkOracle(oracleId_);
        oracleId = oracleId_;
        jobId = jobId_;
        fee = fee_;
        bondIssuer = bondIssuer_;
    }


    function requestDateAndYoYInflation()
    public
    {
        Chainlink.Request memory req = buildChainlinkRequest(bytes32(bytes(jobId)), address(this), this.fulfillDateAndRates.selector);
        req.add("get", "https://truflation-api.hydrogenx.tk/current");
        req.add("path1", "date");
        req.add("path2", "yearOverYearInflation");
        sendOperatorRequest(req, fee);
    }

    event RequestFulfilled(
        bytes32 indexed requestId,
        bytes indexed data,
        int256 yearOverYearInflation
    );


    function fulfillDateAndRates(
        bytes32 requestId,
        bytes memory bytesData,
        int256 _yearOverYearInflation
    )
    public
    //TODO fix for test
    //recordChainlinkFulfillment(requestId)
    {
        emit RequestFulfilled(requestId, bytesData, _yearOverYearInflation);
        data = bytesData;
        require(!compareStrings(date, string(data)), "the rate is already update");
        date = string(data);

        uint256 yearOverYearInflation = 0;
        if(_yearOverYearInflation >= 0){
            yearOverYearInflation = uint256(_yearOverYearInflation);
        } //if inflationRate < 0, then inflationRate = 0
        IIBondsIssuer(bondIssuer).updateRate(yearOverYearInflation, SECONDS_IN_A_DAY);

    }

    function compareStrings(string memory a, string memory b) public view returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function changeOracle(address _oracle) public onlyOwner {
        oracleId = _oracle;
    }

    function changeJobId(string memory _jobId) public onlyOwner {
        jobId = _jobId;
    }

    function getChainlinkToken() public view returns (address) {
        return chainlinkTokenAddress();
    }

    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer");
    }

}