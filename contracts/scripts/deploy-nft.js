const hre = require("hardhat");

async function main() {
  const PredictionNFT = await hre.ethers.getContractFactory("PredictionNFT");

  // Name + symbol for NFT collection
  const nft = await PredictionNFT.deploy("AgriSensePrediction", "AGRPRED");

  await nft.deployed();

  console.log("PredictionNFT deployed at:", nft.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
