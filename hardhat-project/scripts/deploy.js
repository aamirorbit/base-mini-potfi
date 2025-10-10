import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("🚀 Starting PotFi contract deployment...");
  
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
  console.log("🔨 Deploying PotFi contract...");
  const PotFi = await ethers.getContractFactory("PotFi");
  const potfi = await PotFi.deploy(feeTreasury, gateSigner);

  console.log("⏳ Waiting for deployment confirmation...");
  await potfi.waitForDeployment();

  const contractAddress = await potfi.getAddress();
  console.log("✅ PotFi deployed to:", contractAddress);

  // Get deployment transaction details
  const deploymentTx = potfi.deploymentTransaction();
  if (deploymentTx) {
    console.log("📋 Deployment transaction hash:", deploymentTx.hash);
    console.log("⛽ Gas used:", deploymentTx.gasLimit?.toString());
  }

  // Verify contract parameters
  console.log("\n🔍 Verifying deployed contract parameters:");
  try {
    const deployedFeeTreasury = await potfi.feeTreasury();
    const deployedGateSigner = await potfi.gateSigner();
    const cooldownSecs = await potfi.cooldownSecs();
    const feeBps = await potfi.FEE_BPS();
    
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
  
  // Automatic verification
  console.log("\n🔍 Starting automatic verification on BaseScan...");
  console.log("⏳ Waiting 30 seconds for contract to propagate...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  try {
    console.log("📝 Verifying contract...");
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [feeTreasury, gateSigner],
    });
    console.log("✅ Contract verified successfully on BaseScan!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("ℹ️  Contract is already verified");
    } else {
      console.error("⚠️  Automatic verification failed:");
      console.error(error.message);
      console.log("\n📝 You can verify manually using:");
      console.log(`   npx hardhat verify --network base ${contractAddress} "${feeTreasury}" "${gateSigner}"`);
    }
  }
  
  console.log("\n📝 Next steps:");
  console.log("1. Set USDC token address if needed:");
  console.log(`   Contract method: setUsdcToken(address)`);
  console.log("2. Update fee treasury or gate signer if needed");
  console.log("3. Update your .env.local with:");
  console.log(`   NEXT_PUBLIC_POTFI_CONTRACT_ADDRESS=${contractAddress}`);
  
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
