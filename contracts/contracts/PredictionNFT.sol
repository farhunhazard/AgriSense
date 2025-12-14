// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PredictionNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId = 1;

    event PredictionMinted(address indexed to, uint256 tokenId, string tokenURI);

    // 👇 Pass msg.sender to Ownable constructor (required in OZ v5)
    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    /// @notice Mint a prediction NFT to `to` with tokenURI (e.g. ipfs://CID)
    /// Only owner (deployer by default) can mint.
    function mintPrediction(address to, string calldata tokenURI_)
        external
        onlyOwner
        returns (uint256)
    {
        uint256 tid = nextTokenId++;
        _safeMint(to, tid);
        _setTokenURI(tid, tokenURI_);
        emit PredictionMinted(to, tid, tokenURI_);
        return tid;
    }
}
