// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPredictionNFT {
    function mintPrediction(address to, string calldata tokenURI_) external returns (uint256);
}

contract PredictionRegistry {
    struct Prediction {
        uint256 id;
        bytes32 modelId;
        address requester;
        string cid; // ipfs cid pointing to prediction JSON / metadata
        uint256 timestamp;
        uint256 tokenId; // 0 if not minted
    }

    address public owner;
    address public nft; // PredictionNFT contract address
    uint256 public counter;

    // id => Prediction
    mapping(uint256 => Prediction) public predictions;
    // modelId => prediction ids (for simple indexing)
    mapping(bytes32 => uint256[]) public modelPredictions;

    event PredictionRecorded(uint256 indexed id, bytes32 indexed modelId, address indexed requester, string cid, uint256 tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address _nft) {
        owner = msg.sender;
        nft = _nft;
    }

    function setNFT(address _nft) external onlyOwner {
        nft = _nft;
    }

    /**
     * @dev Record a prediction. If `mint` is true, this contract will call PredictionNFT.mintPrediction(to, tokenURI).
     *      For minting to work, this contract must be the owner of the PredictionNFT contract (transferOwnership to this contract).
     * @param modelId bytes32 id of the model used
     * @param cid IPFS CID with prediction result metadata (e.g., ipfs://CID or raw CID — we store string)
     * @param to address to receive minted NFT (if mint==true). If to==address(0) uses msg.sender.
     * @param mint whether to mint an NFT for this prediction
     */
    function recordPrediction(bytes32 modelId, string calldata cid, address to, bool mint) external payable returns (uint256) {
        require(bytes(cid).length > 0, "cid required");

        uint256 id = ++counter;
        uint256 tokenId = 0;
        address receiver = to == address(0) ? msg.sender : to;

        if (mint) {
            require(nft != address(0), "nft not set");
            // Call mint on NFT contract; if the NFT contract reverts, this will bubble up
            tokenId = IPredictionNFT(nft).mintPrediction(receiver, cid);
        }

        predictions[id] = Prediction({
            id: id,
            modelId: modelId,
            requester: msg.sender,
            cid: cid,
            timestamp: block.timestamp,
            tokenId: tokenId
        });

        modelPredictions[modelId].push(id);

        emit PredictionRecorded(id, modelId, msg.sender, cid, tokenId);
        return id;
    }

    /* Read helpers */

    function getPredictionsForModel(bytes32 modelId) external view returns (Prediction[] memory) {
        uint256[] storage ids = modelPredictions[modelId];
        Prediction[] memory out = new Prediction[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            out[i] = predictions[ids[i]];
        }
        return out;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
