// scripts/deploy-prediction.js
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) PredictionNFT already deployed? If not, deploy it here.
  const PredictionNFT = await ethers.getContractFactory("PredictionNFT");
  const nft = await PredictionNFT.deploy("AgriSense Predictions", "APRED");
  await nft.deployed();
  console.log("PredictionNFT deployed at:", nft.address);

  // 2) Deploy PredictionRegistry with nft address
  const PredictionRegistry = await ethers.getContractFactory("PredictionRegistry");
  const registry = await PredictionRegistry.deploy(nft.address);
  await registry.deployed();
  console.log("PredictionRegistry deployed at:", registry.address);

  // 3) Transfer NFT ownership to registry so it can mint
  const tx = await nft.transferOwnership(registry.address);
  await tx.wait();
  console.log("Transferred NFT ownership to registry:", registry.address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
