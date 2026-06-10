import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import * as fs from 'fs';

export async function run(provider: NetworkProvider, args: string[]) {
  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));
  const minterAddress = Address.parse(deployment.minterAddress);

  const minter = provider.open(JettonMinter.createFromAddress(minterAddress));

  const data = await minter.getJettonData(provider);

  console.log('═══ WBIT Token Info ═══');
  console.log('Minter address:', minterAddress.toString());
  console.log('Total supply:', Number(data.totalSupply / 1_000_000_000n).toLocaleString(), 'WBIT');
  console.log('Mintable:', data.mintable);
  console.log('Admin:', data.adminAddress.toString());
  console.log('Network:', deployment.network);
  console.log('Deployed at:', deployment.deployedAt);

  // Check specific wallet balance if address provided
  if (args[0]) {
    const ownerAddress = Address.parse(args[0]);
    const walletAddress = await minter.getWalletAddress(provider, ownerAddress);
    console.log('\n═══ Wallet Info ═══');
    console.log('Owner:', ownerAddress.toString());
    console.log('Jetton wallet:', walletAddress.toString());

    try {
      const wallet = provider.open(JettonWallet.createFromAddress(walletAddress));
      const walletData = await wallet.getWalletData(provider);
      console.log('Balance:', Number(walletData.balance / 1_000_000_000n).toLocaleString(), 'WBIT');
    } catch {
      console.log('Balance: 0 WBIT (wallet not initialized)');
    }
  }
}
