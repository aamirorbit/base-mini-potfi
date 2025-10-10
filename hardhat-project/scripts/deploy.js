import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Starting JackPot contract deployment...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Set up constructor parameters
  const feeTreasury = deployer.address; // You can change this to a different address
  const gateSigner = deployer.address;  // You can change this to a different address
  
  console.log("🏗️  Constructor parameters:");
  console.log("   Fee Treasury:", feeTreasury);
  console.log("   Gate Signer:", gateSigner);

  // Deploy the contract
  console.log("🔨 Deploying JackPot contract...");
  const JackPot = await ethers.getContractFactory("JackPot");
  const jackpot = await JackPot.deploy(feeTreasury, gateSigner);

  console.log("⏳ Waiting for deployment confirmation...");
  await jackpot.waitForDeployment();

  const contractAddress = await jackpot.getAddress();
  console.log("✅ JackPot deployed to:", contractAddress);

  // Get deployment transaction details
  const deploymentTx = jackpot.deploymentTransaction();
  if (deploymentTx) {
    console.log("📋 Deployment transaction hash:", deploymentTx.hash);
    console.log("⛽ Gas used:", deploymentTx.gasLimit?.toString());
  }

  // Verify contract parameters
  console.log("\n🔍 Verifying deployed contract parameters:");
  try {
    const deployedFeeTreasury = await jackpot.feeTreasury();
    const deployedGateSigner = await jackpot.gateSigner();
    const cooldownSecs = await jackpot.cooldownSecs();
    const feeBps = await jackpot.FEE_BPS();
    
    console.log("   Fee Treasury:", deployedFeeTreasury);
    console.log("   Gate Signer:", deployedGateSigner);
    console.log("   Cooldown Seconds:", cooldownSecs.toString());
    console.log("   Fee BPS:", feeBps.toString());
  } catch (error) {
    console.log("⚠️  Could not verify parameters immediately after deployment");
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Deployment Summary:");
  console.log("=======================");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  
  console.log("\n📝 Next steps:");
  console.log("1. Verify the contract on BaseScan using:");
  console.log(`   npx hardhat verify --network base ${contractAddress} "${feeTreasury}" "${gateSigner}"`);
  console.log("2. Set USDC token address if needed:");
  console.log(`   Contract method: setUsdcToken(address)`);
  console.log("3. Update fee treasury or gate signer if needed");
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
