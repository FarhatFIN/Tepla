import { toNano, Address, beginCell } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonMinter, buildOnchainMetadata } from '../wrappers/JettonMinter';
import * as fs from 'fs';

const INITIAL_MINT = 100_000_000n * 1_000_000_000n; // 100M WBIT (with 9 decimals)

export async function run(provider: NetworkProvider) {
  const walletCode = await compile('jetton-wallet');
  const minterCode = await compile('jetton-minter');

  const content = buildOnchainMetadata({
    name: 'WBIT',
    description: 'Native token of Tepla messenger',
    symbol: 'WBIT',
    decimals: '9',
    image: 'https://tepla.app/wbit-logo.png',
  });

  const deployer = provider.sender();
  const deployerAddress = deployer.address!;

  const minter = provider.open(
    JettonMinter.createFromConfig(
      {
        admin: deployerAddress,
        content,
        walletCode,
      },
      minterCode
    )
  );

  console.log('Deploying WBIT Jetton Minter...');
  console.log('Address:', minter.address.toString());

  await minter.sendDeploy(provider, deployer, toNano('0.25'));
  await provider.waitForDeploy(minter.address);

  console.log('Minter deployed! Minting initial supply...');

  // Mint 100M WBIT to deployer
  await minter.sendMint(provider, deployer, {
    toAddress: deployerAddress,
    jettonAmount: INITIAL_MINT,
    forwardTonAmount: toNano('0.05'),
    totalTonAmount: toNano('0.2'),
  });

  console.log(`Minted ${100_000_000} WBIT to deployer`);

  // Save deployment info
  const deployment = {
    network: process.env.NETWORK || 'testnet',
    minterAddress: minter.address.toString(),
    adminAddress: deployerAddress.toString(),
    deployedAt: new Date().toISOString(),
    initialMint: '100000000',
    totalSupplyTarget: '1000000000',
  };

  fs.writeFileSync('deployment.json', JSON.stringify(deployment, null, 2));
  console.log('Deployment info saved to deployment.json');

  // Verify
  const data = await minter.getJettonData(provider);
  console.log('Total supply:', data.totalSupply.toString());
  console.log('Admin:', data.adminAddress.toString());
  console.log('Mintable:', data.mintable);
}
