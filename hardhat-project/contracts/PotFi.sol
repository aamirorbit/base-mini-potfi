// contracts/PotFi.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PotFi - Social Media Engagement Reward Pot Contract
 * @notice Creates token reward pots for social media engagement with jackpot mechanics
 * @dev SECURITY MODEL:
 * 
 * RANDOMNESS: Uses user-provided secret + multiple entropy sources for jackpot determination
 * - User supplies a secret (unpredictable by validators)
 * - Combined with block variables (prevrandao, timestamp, basefee, gasprice, gasleft)
 * - Suitable for low-value pots ($5-100) where economic attack cost > reward
 * - For high-value pots (>$1000), consider Chainlink VRF integration
 * 
 * ANTI-BOT: Backend signature verification (gateSigner) + on-chain cooldown
 * REENTRANCY: Protected via ReentrancyGuard + Checks-Effects-Interactions pattern
 * ACCESS CONTROL: Owner can update parameters; consider multi-sig for production
 */
contract PotFi is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    struct Pot {
        address creator;
        address token;
        uint128 amount;        // total funded amount
        uint128 claimedAmount; // total amount already claimed
        uint64  createdAt;
        uint32  claimed;       // how many people have claimed
        uint32  timeoutSecs;   // e.g., 43_200 (12h)
        uint128 standardClaim; // standard claim amount (e.g., 0.01 USDC)
        bool    active;
        bytes32 postId;        // Farcaster cast ID
        bool    requireLike;   // Require like to claim
        bool    requireRecast; // Require recast to claim
        bool    requireComment;// Require comment to claim
    }

    // ---- Admin constants / params ----
    address public immutable feeTreasury;         // 2.5% per claim
    uint256 public constant FEE_BPS = 250;        // 2.5%
    uint256 public constant BPS     = 10_000;
    uint128 public constant MIN_POT_USDC = 1e6;         // 1 USDC (6 dp)
    uint128 public constant MAX_POT_USDC = 100_000e6;   // 100k USDC
    uint32  public constant MAX_WINNERS  = 200;
    uint32  public constant MAX_TIMEOUT  = 30 days;     // Maximum timeout period

    // Jackpot probability parameters
    uint256 public baseJackpotChance = 100;       // 1% base chance (100/10000)
    uint256 public claimMultiplier = 10;          // +0.1% per claim (10/10000)
    uint256 public timeMultiplier = 5;            // +0.05% per hour (5/10000)
    uint256 public maxJackpotChance = 5000;       // 50% max chance (5000/10000)

    // anti-bot
    uint32  public cooldownSecs = 30;             // global cooldown between claims
    address public gateSigner;                    // backend signer that issues permits
    address public usdcToken;                     // optional: set once to enforce USDC bounds

    // ---- Storage ----
    mapping(bytes32 => Pot) public pots;
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;    // address -> claimed for this pot
    mapping(address => uint64) public lastClaimAt;                      // global cooldown
    mapping(bytes32 => bool) public usedPermit;                         // prevent replay

    // EIP-191 style signed payloads
    // V1 (legacy, domain-less): keccak256("PotFiPermit(address,bytes32,uint256,bytes32)")
    // V2 (recommended):        keccak256("PotFiPermit(address,bytes32,uint256,bytes32,address,uint256)")
    bytes32 public constant PERMIT_TYPEHASH_V1 = keccak256("PotFiPermit(address,bytes32,uint256,bytes32)");
    bytes32 public constant PERMIT_TYPEHASH_V2 = keccak256("PotFiPermit(address,bytes32,uint256,bytes32,address,uint256)");

    event PotCreated(
        bytes32 indexed id, 
        address indexed creator, 
        address token, 
        uint256 amount, 
        uint128 standardClaim,
        bytes32 postId,
        bool requireLike,
        bool requireRecast,
        bool requireComment
    );
    event StandardClaim(bytes32 indexed id, address indexed to, uint256 net, uint256 fee);
    event JackpotClaim(bytes32 indexed id, address indexed to, uint256 net, uint256 fee, uint256 totalClaims);
    event Swept(bytes32 indexed id, address indexed to, uint256 amount);
    event CooldownUpdated(uint32 oldValue, uint32 newValue);
    event GateSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event UsdcTokenUpdated(address indexed token);
    event JackpotParamsUpdated(uint256 baseChance, uint256 claimMultiplier, uint256 timeMultiplier, uint256 maxChance);
    event PotClosed(bytes32 indexed id, uint256 totalClaimed, uint256 totalClaims);

    constructor(address _feeTreasury, address _gateSigner) Ownable(msg.sender) {
        require(_feeTreasury != address(0) && _gateSigner != address(0), "zero");
        feeTreasury = _feeTreasury;
        gateSigner  = _gateSigner;
    }

    // Admin knobs
    function setCooldown(uint32 secs) external onlyOwner { 
        uint32 oldValue = cooldownSecs;
        cooldownSecs = secs;
        emit CooldownUpdated(oldValue, secs);
    }
    
    function setGateSigner(address s) external onlyOwner { 
        require(s != address(0), "zero");
        address oldSigner = gateSigner;
        gateSigner = s;
        emit GateSignerUpdated(oldSigner, s);
    }
    
    function setUsdcToken(address token) external onlyOwner { 
        usdcToken = token;
        emit UsdcTokenUpdated(token);
    }
    
    function setJackpotParams(
        uint256 _baseChance, 
        uint256 _claimMultiplier, 
        uint256 _timeMultiplier, 
        uint256 _maxChance
    ) external onlyOwner {
        require(_maxChance <= 10000, "max-chance"); // Can't exceed 100%
        baseJackpotChance = _baseChance;
        claimMultiplier = _claimMultiplier;
        timeMultiplier = _timeMultiplier;
        maxJackpotChance = _maxChance;
        emit JackpotParamsUpdated(_baseChance, _claimMultiplier, _timeMultiplier, _maxChance);
    }

    // --- Create ---
    // Original function signature for backward compatibility
    function createPot(
        address token,
        uint128 amount,
        uint128 standardClaim,
        uint32 timeoutSecs,
        bytes32 postId,
        bool requireLike,
        bool requireRecast,
        bool requireComment
    ) external returns (bytes32 id) {
        // Call the new function with default salt
        return createPotWithSalt(
            token,
            amount,
            standardClaim,
            timeoutSecs,
            postId,
            requireLike,
            requireRecast,
            requireComment,
            bytes32(0) // Will use block.prevrandao as default
        );
    }
    
    // New function with salt parameter for enhanced security
    function createPotWithSalt(
        address token,
        uint128 amount,
        uint128 standardClaim, // e.g., 1e4 for 0.01 USDC (6 decimals)
        uint32 timeoutSecs,
        bytes32 postId,
        bool requireLike,
        bool requireRecast,
        bool requireComment,
        bytes32 salt          // User-provided salt for unpredictable pot ID
    ) public returns (bytes32 id) {
        require(token != address(0), "token");
        require(timeoutSecs > 0 && timeoutSecs <= MAX_TIMEOUT, "timeout-bounds");
        require(standardClaim > 0, "standard-claim");
        require(amount >= standardClaim * 10, "pot-too-small"); // At least 10 claims worth
        require(standardClaim <= amount / 2, "standard-claim-too-large"); // Can't claim more than half in one go
        require(postId != bytes32(0), "postId-required"); // Cast ID is required

        // If it's USDC, apply hard bounds (optional for other tokens)
        if (_isUSDC(token)) {
            require(amount >= MIN_POT_USDC && amount <= MAX_POT_USDC, "pot-bounds");
        }

        // Pull funds in
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Create pot with salt for unpredictability
        // If salt is not provided (bytes32(0)), use block.prevrandao as default for backward compatibility
        if (salt == bytes32(0)) {
            salt = bytes32(block.prevrandao);
        }
        
        id = keccak256(abi.encode(msg.sender, token, amount, standardClaim, block.timestamp, salt));
        Pot storage p = pots[id];
        require(!p.active, "exists");

        p.creator = msg.sender;
        p.token = token;
        p.amount = amount;
        p.claimedAmount = 0;
        p.createdAt = uint64(block.timestamp);
        p.timeoutSecs = timeoutSecs;
        p.standardClaim = standardClaim;
        p.claimed = 0;
        p.active = true;
        p.postId = postId;
        p.requireLike = requireLike;
        p.requireRecast = requireRecast;
        p.requireComment = requireComment;

        emit PotCreated(id, msg.sender, token, amount, standardClaim, postId, requireLike, requireRecast, requireComment);
    }

    // --- Claim ---
    function claim(
        bytes32 id,
        uint256 deadline,
        bytes32 castId,
        bytes calldata signature,
        bytes32 userSecret  // User-provided secret for randomness
    ) external nonReentrant {
        require(block.timestamp <= deadline, "expired");
        require(userSecret != bytes32(0), "secret-required");
        
        bytes32 h1 = _permitHashV1(msg.sender, id, deadline, castId);
        bytes32 h2 = _permitHashV2(msg.sender, id, deadline, castId);
        require(!usedPermit[h1] && !usedPermit[h2], "used");

        Pot storage p = pots[id];
        require(p.active, "inactive");
        require(!hasClaimed[id][msg.sender], "one/addr");
        require(p.claimed < MAX_WINNERS, "max-claims-reached");

        // cooldown
        uint64 last = lastClaimAt[msg.sender];
        if (last != 0) require(block.timestamp >= last + cooldownSecs, "cooldown");
        lastClaimAt[msg.sender] = uint64(block.timestamp);

        // verify signer (Like+Comment+Recast were checked server-side)
        bytes32 digestV2 = _toEthSignedMessageHash(h2);
        address signer = ECDSA.recover(digestV2, signature);
        bool isV2 = (signer == gateSigner);
        
        if (!isV2) {
            // try legacy V1 for backward-compat
            bytes32 digestV1 = _toEthSignedMessageHash(h1);
            signer = ECDSA.recover(digestV1, signature);
            require(signer != address(0) && signer == gateSigner, "gate");
        }

        // Mark as claimed
        hasClaimed[id][msg.sender] = true;
        p.claimed += 1;

        // mark permit used BEFORE external token transfers to avoid any surprises
        // Only mark the version that was actually used
        if (isV2) {
            usedPermit[h2] = true;
        } else {
            usedPermit[h1] = true;
        }

        // Calculate remaining funds
        uint256 remainingFunds = uint256(p.amount) - uint256(p.claimedAmount);
        require(remainingFunds > 0, "no-funds");

        // Determine if this is a jackpot claim
        bool isJackpot = _calculateJackpotTrigger(p, id, userSecret);
        
        uint256 claimAmount;
        if (isJackpot) {
            // Jackpot: give all remaining funds
            claimAmount = remainingFunds;
            p.active = false; // Close the pot
        } else {
            // Standard claim: give standard amount or remainder if less
            claimAmount = remainingFunds < p.standardClaim ? remainingFunds : p.standardClaim;
        }

        // Update claimed amount
        p.claimedAmount += uint128(claimAmount);

        // Calculate fee and net amount
        uint256 fee = (claimAmount * FEE_BPS) / BPS;
        // Ensure minimum fee of 1 wei for non-zero claims to avoid rounding to zero
        if (fee == 0 && claimAmount > 0) {
            fee = 1;
        }
        uint256 net = claimAmount - fee;

        // Transfer tokens
        IERC20(p.token).safeTransfer(msg.sender, net);
        if (fee > 0) IERC20(p.token).safeTransfer(feeTreasury, fee);

        // Close pot if no funds left
        if (p.claimedAmount >= p.amount) {
            p.active = false;
            emit PotClosed(id, p.claimedAmount, p.claimed);
        }

        // Emit appropriate event
        if (isJackpot) {
            emit JackpotClaim(id, msg.sender, net, fee, p.claimed);
            // Jackpot always closes the pot
            if (p.claimedAmount < p.amount) {
                emit PotClosed(id, p.claimedAmount, p.claimed);
            }
        } else {
            emit StandardClaim(id, msg.sender, net, fee);
        }
    }

    // --- Sweep after timeout ---
    function sweep(bytes32 id) external nonReentrant {
        Pot storage p = pots[id];
        require(p.active, "inactive");
        require(msg.sender == p.creator, "creator");
        require(block.timestamp >= p.createdAt + p.timeoutSecs, "wait");

        uint256 remaining = uint256(p.amount) - uint256(p.claimedAmount);
        p.active = false;
        p.claimedAmount = p.amount; // Mark all as claimed
        
        if (remaining > 0) {
            IERC20(p.token).safeTransfer(p.creator, remaining);
        }
        
        emit Swept(id, p.creator, remaining);
        emit PotClosed(id, p.amount - remaining, p.claimed);
    }

    // --- Views ---
    function getRemainingFunds(bytes32 id) external view returns (uint256) {
        Pot storage p = pots[id];
        return uint256(p.amount) - uint256(p.claimedAmount);
    }

    function getJackpotProbability(bytes32 id) external view returns (uint256) {
        Pot storage p = pots[id];
        return _getJackpotChance(p);
    }

    // Get pot's cast ID and engagement requirements
    function getPotRequirements(bytes32 id) external view returns (
        bytes32 postId,
        bool requireLike,
        bool requireRecast,
        bool requireComment
    ) {
        Pot storage p = pots[id];
        return (p.postId, p.requireLike, p.requireRecast, p.requireComment);
    }

    // Get just the cast ID for a pot
    function getPostId(bytes32 id) external view returns (bytes32) {
        return pots[id].postId;
    }

    // --- Internals ---
    function _calculateJackpotTrigger(Pot storage p, bytes32 potId, bytes32 userSecret) internal view returns (bool) {
        uint256 jackpotChance = _getJackpotChance(p);
        
        // Generate pseudo-random number using multiple entropy sources
        // Key addition: userSecret (unpredictable by validators)
        // Additional restrictions: tx.gasprice, block.basefee
        bytes32 entropy = keccak256(abi.encode(
            userSecret,           // 🔑 USER-PROVIDED - validator cannot predict
            block.prevrandao,     // Block randomness
            block.timestamp,      // Block time
            msg.sender,           // Claimer address
            potId,                // Pot identifier
            p.claimed,            // Number of claims so far
            blockhash(block.number - 1),  // Previous block hash
            tx.gasprice,          // 🔒 Transaction gas price (harder to manipulate)
            block.basefee         // 🔒 EIP-1559 base fee (protocol-level)
        ));
        
        uint256 randomValue = uint256(entropy) % 10000;
        return randomValue < jackpotChance;
    }

    function _getJackpotChance(Pot storage p) internal view returns (uint256) {
        // Base probability: 1% (100/10000)
        uint256 chance = baseJackpotChance;
        
        // Increasing probability: +0.1% per claim
        chance += p.claimed * claimMultiplier;
        
        // Time-based multiplier: +0.05% per hour
        uint256 hoursElapsed = (block.timestamp - p.createdAt) / 3600;
        chance += hoursElapsed * timeMultiplier;
        
        // Cap at maximum (default 50%)
        if (chance > maxJackpotChance) {
            chance = maxJackpotChance;
        }
        
        return chance;
    }

    function _permitHashV1(address claimer, bytes32 potId, uint256 deadline, bytes32 castId) internal pure returns (bytes32) {
        return keccak256(abi.encode(PERMIT_TYPEHASH_V1, claimer, potId, deadline, castId));
    }
    
    function _permitHashV2(address claimer, bytes32 potId, uint256 deadline, bytes32 castId) internal view returns (bytes32) {
        return keccak256(abi.encode(PERMIT_TYPEHASH_V2, claimer, potId, deadline, castId, address(this), block.chainid));
    }
    
    function _toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    // If set, enforce USDC bounds only when token matches configured usdcToken
    function _isUSDC(address token) internal view returns (bool) { 
        return usdcToken != address(0) && token == usdcToken; 
    }
}

