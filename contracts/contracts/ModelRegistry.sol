// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ModelRegistry is Ownable {

    // IMPORTANT → Your OZ version requires passing msg.sender
    constructor() Ownable(msg.sender) {}

    struct Model {
        address provider;
        string cid;
        uint256 price;
        bool active;
        string category;
    }

    mapping(bytes32 => Model) public models;

    event ModelRegistered(bytes32 indexed id, address indexed provider, string cid, uint256 price, string category);
    event ModelUpdated(bytes32 indexed id, string cid, uint256 price, string category);
    event ModelStatusChanged(bytes32 indexed id, bool active);

    function registerModel(
        bytes32 id,
        string calldata cid,
        uint256 price,
        string calldata category
    ) external {
        require(models[id].provider == address(0), "Model already exists");

        models[id] = Model({
            provider: msg.sender,
            cid: cid,
            price: price,
            active: true,
            category: category
        });

        emit ModelRegistered(id, msg.sender, cid, price, category);
    }

    function updateModel(
        bytes32 id,
        string calldata cid,
        uint256 price,
        string calldata category
    ) external {
        Model storage m = models[id];
        require(m.provider == msg.sender, "Not model owner");
        require(m.active, "Model inactive");

        m.cid = cid;
        m.price = price;
        m.category = category;

        emit ModelUpdated(id, cid, price, category);
    }

    function setModelStatus(bytes32 id, bool active) external {
        Model storage m = models[id];
        require(m.provider == msg.sender, "Not model owner");

        m.active = active;

        emit ModelStatusChanged(id, active);
    }

    function getModel(bytes32 id)
        external
        view
        returns (
            address provider,
            string memory cid,
            uint256 price,
            bool active,
            string memory category
        )
    {
        Model memory m = models[id];
        return (m.provider, m.cid, m.price, m.active, m.category);
    }
}
