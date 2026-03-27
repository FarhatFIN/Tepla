import { TonClient, WalletContractV4 } from '@ton/ton';
import { Address, beginCell, toNano, Cell } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { getClient } from './ton';
import { createLogger } from '@tepla/common';

const logger = createLogger('wbit-ops');

const WBIT_MINTER_ADDRESS = process.env.WBIT_MINTER_ADDRESS || '';
const DECIMALS = 1_000_000_000n; // 9 decimals

// Op codes matching the FunC contracts
const OP_TRANSFER = 0xf8a7ea5;
const OP_GET_WALLET_DATA = 'get_wallet_data';
const OP_GET_WALLET_ADDRESS = 'get_wallet_address';

export function parseAmount(amount: string): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0') * DECIMALS;
  if (parts[1]) {
    const frac = parts[1].padEnd(9, '0').slice(0, 9);
    return whole + BigInt(frac);
  }
  return whole;
}

export function formatAmount(amount: bigint): string {
  const whole = amount / DECIMALS;
  const frac = amount % DECIMALS;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(9, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

export async function getJettonWalletAddress(ownerAddress: string): Promise<string> {
  if (!WBIT_MINTER_ADDRESS) {
    logger.warn('WBIT_MINTER_ADDRESS not set, returning placeholder');
    return 'EQ_placeholder_wallet_address';
  }

  const client = getClient();
  const minterAddr = Address.parse(WBIT_MINTER_ADDRESS);

  const result = await client.runMethod(minterAddr, OP_GET_WALLET_ADDRESS, [
    { type: 'slice', cell: beginCell().storeAddress(Address.parse(ownerAddress)).endCell() },
  ]);

  const walletAddress = result.stack.readAddress();
  return walletAddress.toString();
}

export async function getJettonBalance(ownerAddress: string): Promise<bigint> {
  try {
    const walletAddr = await getJettonWalletAddress(ownerAddress);
    const client = getClient();
    const result = await client.runMethod(Address.parse(walletAddr), OP_GET_WALLET_DATA, []);
    return result.stack.readBigNumber();
  } catch {
    return 0n; // Wallet not initialized = 0 balance
  }
}

export async function transfer(
  fromMnemonic: string,
  toAddress: string,
  amount: bigint,
  forwardPayload?: string
): Promise<string> {
  const client = getClient();
  const words = fromMnemonic.split(' ');
  const keyPair = await mnemonicToPrivateKey(words);
  const wallet = client.open(
    WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 })
  );

  const senderAddress = wallet.address;
  const jettonWalletAddr = await getJettonWalletAddress(senderAddress.toString());

  // Build transfer body
  let body = beginCell()
    .storeUint(OP_TRANSFER, 32)
    .storeUint(0, 64) // query_id
    .storeCoins(amount)
    .storeAddress(Address.parse(toAddress))
    .storeAddress(senderAddress) // response_address
    .storeBit(false) // no custom_payload
    .storeCoins(toNano('0.01')); // forward_ton_amount

  if (forwardPayload) {
    const payload = beginCell().storeUint(0, 32).storeStringTail(forwardPayload).endCell();
    body.storeBit(true).storeRef(payload);
  } else {
    body.storeBit(false);
  }

  const seqno = await wallet.getSeqno();

  await wallet.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      {
        to: Address.parse(jettonWalletAddr),
        value: toNano('0.1'),
        body: body.endCell(),
      } as any,
    ],
  });

  logger.info('WBIT transfer sent', {
    from: senderAddress.toString().slice(0, 10) + '...',
    to: toAddress.slice(0, 10) + '...',
    amount: formatAmount(amount),
  });

  return `${senderAddress.toString()}_${seqno}`;
}

export async function getMinterInfo(): Promise<{
  totalSupply: bigint;
  mintable: boolean;
  adminAddress: string;
}> {
  if (!WBIT_MINTER_ADDRESS) {
    return { totalSupply: 0n, mintable: true, adminAddress: '' };
  }

  const client = getClient();
  const result = await client.runMethod(Address.parse(WBIT_MINTER_ADDRESS), 'get_jetton_data', []);
  const totalSupply = result.stack.readBigNumber();
  const mintable = result.stack.readNumber() !== 0;
  const adminAddress = result.stack.readAddress();

  return {
    totalSupply,
    mintable,
    adminAddress: adminAddress.toString(),
  };
}
