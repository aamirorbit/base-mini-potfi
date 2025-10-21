import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the new ABI
const abiPath = path.join(__dirname, '../abis/PotFi.json');
const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// Read the current contracts.ts file
const contractsPath = path.join(__dirname, '../lib/contracts.ts');
let contractsContent = fs.readFileSync(contractsPath, 'utf8');

// Find the potfiAbi array in the file
const startMarker = 'export const potfiAbi = [';
const endMarker = '] as const';

const startIndex = contractsContent.indexOf(startMarker);
const endIndex = contractsContent.indexOf(endMarker, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error('❌ Could not find potfiAbi array in contracts.ts');
  process.exit(1);
}

// Format the ABI with proper indentation
const formattedAbi = JSON.stringify(abi, null, 2)
  .split('\n')
  .map((line, index) => {
    if (index === 0) return line; // First line
    return '  ' + line; // Indent other lines
  })
  .join('\n');

// Replace the old ABI with the new one
const newContent = 
  contractsContent.substring(0, startIndex + startMarker.length) +
  '\n' + formattedAbi + '\n' +
  contractsContent.substring(endIndex);

// Write the updated content
fs.writeFileSync(contractsPath, newContent);

console.log('✅ Updated lib/contracts.ts with new ABI');

// Print summary of changes
console.log('\n📋 ABI Update Summary:');
console.log(`- Total ABI items: ${abi.length}`);

const functions = abi.filter(item => item.type === 'function');
const events = abi.filter(item => item.type === 'event');

console.log(`- Functions: ${functions.length}`);
console.log(`- Events: ${events.length}`);

// Check for key features
const hasCreatePotWithSalt = functions.some(f => f.name === 'createPotWithSalt');
const hasPotClosed = events.some(e => e.name === 'PotClosed');
const claimFunction = functions.find(f => f.name === 'claim');
const hasUserSecret = claimFunction?.inputs.some(i => i.name === 'userSecret');

console.log('\n✅ Key features confirmed:');
console.log(`- createPotWithSalt: ${hasCreatePotWithSalt ? '✅' : '❌'}`);
console.log(`- PotClosed event: ${hasPotClosed ? '✅' : '❌'}`);
console.log(`- claim with userSecret: ${hasUserSecret ? '✅' : '❌'}`);

console.log('\n📝 The frontend will now use the updated ABI with all security improvements!');
