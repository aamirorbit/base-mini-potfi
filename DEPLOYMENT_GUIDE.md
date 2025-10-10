# JackPot Frame Deployment Guide

## 🚀 **Production Deployment Checklist**

### **✅ Pre-Deployment Setup**

1. **Environment Variables**
   ```bash
   # Base Network
   NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
   NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=0x...
   
   # USDC on Base
   NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   
   # Neynar API (Farcaster integration)
   NEYNAR_API_KEY=your_neynar_api_key
   
   # Gate Signer (for permit generation)
   GATE_SIGNER_PK=your_private_key
   FEE_TREASURY_ADDRESS=0x...
   
   # WalletConnect
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   
   # App Domain (for frames)
   NEXT_PUBLIC_APP_DOMAIN=https://yourdomain.com
   ```

2. **Smart Contract Deployment**
   ```bash
   # Deploy to Base mainnet
   npm run deploy
   
   # Verify contract
   npm run verify <contract_address>
   ```

3. **Domain Setup**
   - Configure your domain (e.g., `jackpot.yourdomain.com`)
   - Set up SSL certificate
   - Update `NEXT_PUBLIC_APP_DOMAIN` in environment

### **✅ Frame Implementation**

1. **Frame Endpoints**
   - `/api/frame` - Main frame entry point
   - `/api/frame/create` - Create JackPot flow
   - `/api/frame/claim` - Claim JackPot flow
   - `/api/frame/image` - Dynamic frame images

2. **Farcaster Manifest**
   - Update `public/.well-known/farcaster.json` with your domain
   - Ensure manifest is accessible at `https://yourdomain.com/.well-known/farcaster.json`

3. **Frame Testing**
   - Test frame functionality on Base App
   - Verify engagement verification works
   - Test claim flow end-to-end

### **✅ Production Deployment**

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Deploy to Platform**
   - **Vercel**: `vercel --prod`
   - **Netlify**: `netlify deploy --prod`
   - **Railway**: `railway deploy`
   - **Custom**: Upload build files to your server

3. **Environment Configuration**
   - Set all environment variables in your deployment platform
   - Ensure `NEXT_PUBLIC_APP_DOMAIN` matches your domain
   - Verify all API keys are set correctly

### **✅ Post-Deployment Verification**

1. **Frame Functionality**
   - Test main frame loads correctly
   - Test create flow works
   - Test claim flow works
   - Test engagement verification

2. **Smart Contract Integration**
   - Verify contract is deployed and verified
   - Test pot creation works
   - Test claim functionality
   - Test sweep functionality

3. **Farcaster Integration**
   - Test frames work on Base App
   - Verify engagement verification
   - Test permit generation
   - Test claim processing

### **✅ Monitoring & Maintenance**

1. **Error Monitoring**
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Monitor frame interactions
   - Track engagement verification failures

2. **Performance Monitoring**
   - Monitor frame load times
   - Track API response times
   - Monitor smart contract gas usage

3. **Security Monitoring**
   - Monitor for suspicious activity
   - Track permit generation
   - Monitor claim patterns

### **✅ Troubleshooting**

1. **Frame Issues**
   - Check frame metadata is correct
   - Verify image URLs are accessible
   - Test frame interactions

2. **Smart Contract Issues**
   - Verify contract is deployed
   - Check contract interactions
   - Monitor gas usage

3. **Farcaster Integration Issues**
   - Verify Neynar API key
   - Check engagement verification
   - Test permit generation

### **✅ Security Considerations**

1. **Environment Variables**
   - Never expose private keys to client
   - Use secure environment variable storage
   - Rotate keys regularly

2. **Frame Security**
   - Validate all frame inputs
   - Implement rate limiting
   - Monitor for abuse

3. **Smart Contract Security**
   - Verify contract is audited
   - Monitor for suspicious activity
   - Implement proper access controls

### **✅ Performance Optimization**

1. **Frame Performance**
   - Optimize frame images
   - Implement caching
   - Monitor load times

2. **API Performance**
   - Implement rate limiting
   - Cache frequently accessed data
   - Monitor response times

3. **Smart Contract Performance**
   - Optimize gas usage
   - Monitor transaction costs
   - Implement batch operations

### **✅ Backup & Recovery**

1. **Data Backup**
   - Backup environment variables
   - Backup smart contract state
   - Backup frame configurations

2. **Recovery Procedures**
   - Document recovery steps
   - Test recovery procedures
   - Maintain backup systems

### **✅ Documentation**

1. **User Documentation**
   - Frame usage instructions
   - Troubleshooting guide
   - FAQ section

2. **Developer Documentation**
   - API documentation
   - Smart contract documentation
   - Deployment procedures

---

## 🎯 **Success Metrics**

- **Frame Load Time**: < 2 seconds
- **Engagement Verification**: > 95% success rate
- **Claim Success Rate**: > 90%
- **User Satisfaction**: > 4.5/5

## 🆘 **Support**

For deployment issues:
1. Check environment variables
2. Verify domain configuration
3. Test frame functionality
4. Monitor error logs
5. Contact support if needed

---

**Ready to deploy your JackPot Frame implementation! 🚀**
