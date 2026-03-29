import { toNano, Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import * as fs from 'fs';

export async function run(provider: NetworkProvider, args: string[]) {
  if (args.length < 2) {
    console.log('Usage: blueprint run transfer <toAddress> <amount>');
    return;
  }

  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));
  const minterAddress = Address.parse(deployment.minterAddress);

  const minter = provider.open(JettonMinter.createFromAddress(minterAddress));
  const sender = provider.sender();

  const toAddress = Address.parse(args[0]);
  const amount = BigInt(args[1]) * 1_000_000_000n;

  // Get sender's jetton wallet address
  const senderWalletAddress = await minter.getWalletAddress(provider, sender.address!);
  const senderWallet = provider.open(JettonWallet.createFromAddress(senderWalletAddress));

  console.log(`Transferring ${Number(amount / 1_000_000_000n)} WBIT to ${toAddress.toString()}`);

  const balanceBefore = await senderWallet.getBalance(provider);
  console.log('Balance before:', Number(balanceBefore / 1_000_000_000n), 'WBIT');

  await senderWallet.sendTransfer(provider, sender, {
    value: toNano('0.15'),
    jettonAmount: amount,
    to: toAddress,
    responseAddress: sender.address!,
    forwardAmount: toNano('0.01'),
  });

  console.log('Transfer sent!');
}
