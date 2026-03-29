import { toNano, Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import * as fs from 'fs';

export async function run(provider: NetworkProvider, args: string[]) {
  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));
  const minterAddress = Address.parse(deployment.minterAddress);

  const minter = provider.open(JettonMinter.createFromAddress(minterAddress));
  const deployer = provider.sender();

  const toAddress = args[0] ? Address.parse(args[0]) : deployer.address!;
  const amount = args[1] ? BigInt(args[1]) * 1_000_000_000n : 1_000_000n * 1_000_000_000n; // default 1M WBIT

  console.log(`Minting ${Number(amount / 1_000_000_000n)} WBIT to ${toAddress.toString()}`);

  await minter.sendMint(provider, deployer, {
    toAddress,
    jettonAmount: amount,
    forwardTonAmount: toNano('0.05'),
    totalTonAmount: toNano('0.2'),
  });

  console.log('Mint transaction sent!');

  // Wait and verify
  const supply = await minter.getTotalSupply(provider);
  console.log('New total supply:', Number(supply / 1_000_000_000n), 'WBIT');
}
