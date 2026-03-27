import { TonClient, WalletContractV4, internal, toNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { createLogger } from '@tepla/common';

const logger = createLogger('ton-client');

const TON_ENDPOINT = process.env.TON_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC';
const TON_API_KEY = process.env.TON_API_KEY || '';

let clientInstance: TonClient | null = null;

export function getClient(): TonClient {
  if (!clientInstance) {
    clientInstance = new TonClient({
      endpoint: TON_ENDPOINT,
      apiKey: TON_API_KEY || undefined,
    });
    logger.info('TON client initialized', { endpoint: TON_ENDPOINT });
  }
  return clientInstance;
}

export async function getBalance(address: string): Promise<bigint> {
  const client = getClient();
  const { Address } = await import('@ton/core');
  const balance = await client.getBalance(Address.parse(address));
  return balance;
}

export async function walletFromMnemonic(mnemonic: string): Promise<{
  wallet: WalletContractV4;
  keyPair: { publicKey: Buffer; secretKey: Buffer };
}> {
  const words = mnemonic.split(' ');
  const keyPair = await mnemonicToPrivateKey(words);
  const wallet = WalletContractV4.create({ publicKey: keyPair.publicKey, workchain: 0 });
  return { wallet, keyPair };
}

export async function sendTransaction(boc: string): Promise<void> {
  const client = getClient();
  const { Cell } = await import('@ton/core');
  const cell = Cell.fromBase64(boc);
  await client.sendFile(cell.toBoc());
}

export async function waitForTransaction(address: string, timeout = 30000): Promise<boolean> {
  const client = getClient();
  const { Address } = await import('@ton/core');
  const addr = Address.parse(address);

  const startTime = Date.now();
  const startSeqno = await client.open(
    WalletContractV4.create({ publicKey: Buffer.alloc(32), workchain: 0 })
  );

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    try {
      const txs = await client.getTransactions(addr, { limit: 1 });
      if (txs.length > 0) return true;
    } catch {}
  }
  return false;
}

export function formatTon(nanotons: bigint): string {
  const tons = Number(nanotons) / 1e9;
  return tons.toFixed(4);
}
