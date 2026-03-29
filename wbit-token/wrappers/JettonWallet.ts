import {
  Address,
  beginCell,
  Cell,
  Contract,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

export type WalletData = {
  balance: bigint;
  ownerAddress: Address;
  jettonMasterAddress: Address;
  walletCode: Cell;
};

export class JettonWallet implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonWallet(address);
  }

  async sendTransfer(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      jettonAmount: bigint;
      to: Address;
      responseAddress: Address;
      forwardAmount: bigint;
      forwardPayload?: Cell;
      queryId?: number;
    }
  ) {
    const body = beginCell()
      .storeUint(0xf8a7ea5, 32) // op::transfer
      .storeUint(opts.queryId ?? 0, 64)
      .storeCoins(opts.jettonAmount)
      .storeAddress(opts.to)
      .storeAddress(opts.responseAddress)
      .storeBit(false) // no custom_payload
      .storeCoins(opts.forwardAmount);

    if (opts.forwardPayload) {
      body.storeBit(true).storeRef(opts.forwardPayload);
    } else {
      body.storeBit(false);
    }

    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: body.endCell(),
    });
  }

  async sendBurn(
    provider: ContractProvider,
    via: Sender,
    opts: {
      value: bigint;
      jettonAmount: bigint;
      responseAddress: Address;
      queryId?: number;
    }
  ) {
    await provider.internal(via, {
      value: opts.value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x595f07bc, 32) // op::burn
        .storeUint(opts.queryId ?? 0, 64)
        .storeCoins(opts.jettonAmount)
        .storeAddress(opts.responseAddress)
        .endCell(),
    });
  }

  async getBalance(provider: ContractProvider): Promise<bigint> {
    const data = await this.getWalletData(provider);
    return data.balance;
  }

  async getWalletData(provider: ContractProvider): Promise<WalletData> {
    const result = await provider.get('get_wallet_data', []);
    return {
      balance: result.stack.readBigNumber(),
      ownerAddress: result.stack.readAddress(),
      jettonMasterAddress: result.stack.readAddress(),
      walletCode: result.stack.readCell(),
    };
  }
}
