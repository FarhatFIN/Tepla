import TonWeb from "tonweb";

const getTonProvider = () => {
  const endpoint =
    process.env.TON_RPC_ENDPOINT ?? "https://toncenter.com/api/v2/jsonRPC";
  const apiKey = process.env.TON_API_KEY;
  const HttpProvider = TonWeb.HttpProvider as unknown as new (
    endpoint: string,
    params?: { apiKey?: string },
  ) => unknown;
  const provider = new HttpProvider(endpoint, { apiKey });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (TonWeb as any)(provider) as typeof TonWeb;
};

export const getTonBalance = async (address: string): Promise<number> => {
  const tonweb = getTonProvider() as unknown as {
    provider: { getBalance: (addr: string) => Promise<string | number> };
  };
  const balance = await tonweb.provider.getBalance(address);
  return Number(balance) / 1e9;
};

export const sendTonTransfer = async (params: {
  toAddress: string;
  amountTon: number;
  comment?: string;
}): Promise<string> => {
  // TonWeb types are not available; treat as unknown and narrow at call sites.
  const tonweb = getTonProvider() as unknown as Record<string, unknown>;
  const secretKeyBase64 = process.env.TON_WALLET_SECRET_KEY;
  const publicKeyBase64 = process.env.TON_WALLET_PUBLIC_KEY;

  if (!secretKeyBase64 || !publicKeyBase64) {
    throw new Error("TON wallet keys are not configured.");
  }

  const secretKey = Buffer.from(secretKeyBase64, "base64");
  const publicKey = Buffer.from(publicKeyBase64, "base64");

  const walletModule = tonweb.wallet as { all: { WalletV3: new (prov: unknown, opts: { publicKey: Uint8Array; wc: number }) => unknown } };
  const WalletClass = walletModule.all.WalletV3;
  const wallet = new WalletClass(tonweb.provider, {
    publicKey,
    wc: 0,
  });

  const seqno = await (wallet as { methods: { seqno: () => { call: () => Promise<number> } } }).methods.seqno().call();

  const amountNano = Math.floor(params.amountTon * 1e9);

  const transfer = (wallet as { methods: { transfer: (opts: unknown) => { send: () => Promise<unknown> } } }).methods.transfer({
    secretKey,
    toAddress: params.toAddress,
    amount: amountNano,
    seqno,
    payload: params.comment ?? "",
    sendMode: 3,
  });

  const result = await transfer.send();
  return String(result);
};

