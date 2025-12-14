const hre = require("hardhat");

async function main() {
  const ModelRegistry = await hre.ethers.getContractFactory("ModelRegistry");
  const registry = await ModelRegistry.deploy();

  await registry.deployed();

  console.log("ModelRegistry deployed at:", registry.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
