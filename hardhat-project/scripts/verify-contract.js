import hre from "hardhat";
const { run } = hre;

async function main() {
  // Replace these with your deployed contract details
  const contractAddress = process.argv[2];
  const feeTreasury = process.argv[3];
  const gateSigner = process.argv[4];

  if (!contractAddress || !feeTreasury || !gateSigner) {
    console.log("❌ Usage: node scripts/verify-contract.js <contractAddress> <feeTreasury> <gateSigner>");
    console.log("Example: node scripts/verify-contract.js 0x123... 0xabc... 0xdef...");
    process.exit(1);
  }

  console.log("🔍 Verifying contract on BaseScan...");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🏦 Fee Treasury:", feeTreasury);
  console.log("🔐 Gate Signer:", gateSigner);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [feeTreasury, gateSigner],
    });
    
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("ℹ️  Contract is already verified");
    } else {
      console.error("❌ Verification failed:");
      console.error(error);
      process.exit(1);
    }
  }
}

main()
  .then(() => {
    console.log("✨ Verification script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Verification script failed:");
    console.error(error);
    process.exit(1);
  });
