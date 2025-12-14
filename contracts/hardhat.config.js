require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    // alias "qie" so you can use: npx hardhat run --network qie scripts/deploy-*.js
    qie: {
      url: "https://rpc1testnet.qie.digital", // primary QIE Testnet RPC
      chainId: 1983,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      // optional: increase timeouts if your node is slow
      timeout: 200000
    },

    // keep original name if you referenced it elsewhere
    qie_testnet: {
      url: "https://rpc1testnet.qie.digital",
      chainId: 1983,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 200000
    }
  }
};
