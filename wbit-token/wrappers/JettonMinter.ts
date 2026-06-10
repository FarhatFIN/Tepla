import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
  TupleItemSlice,
} from '@ton/core';

export type JettonMinterConfig = {
  admin: Address;
  content: Cell;
  walletCode: Cell;
};

export type JettonData = {
  totalSupply: bigint;
  mintable: boolean;
  adminAddress: Address;
  content: Cell;
  walletCode: Cell;
};

export function jettonMinterConfigToCell(config: JettonMinterConfig): Cell {
  return beginCell()
    .storeCoins(0) // total_supply starts at 0
    .storeAddress(config.admin)
    .storeRef(config.content)
    .storeRef(config.walletCode)
    .endCell();
}

export function buildOnchainMetadata(data: {
  name: string;
  description: string;
  symbol: string;
  decimals: string;
  image: string;
}): Cell {
  // SHA256 keys for on-chain metadata (TEP-64)
  const ONCHAIN_CONTENT_PREFIX = 0x00;
  const SNAKE_PREFIX = 0x00;

  const dict = beginCell();
  // For simplicity, store as off-chain metadata URI
  // In production, you'd use a dictionary with SHA256 keys

  const metadataUri = `https://tepla.app/wbit-metadata.json`;
  const uriCell = beginCell()
    .storeUint(0x01, 8) // off-chain prefix
    .storeStringTail(metadataUri)
    .endCell();

  return uriCell;
}

export class JettonMinter implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  static createFromAddress(address: Address) {
    return new JettonMinter(address);
  }

  static createFromConfig(config: JettonMinterConfig, code: Cell, workchain = 0) {
    const data = jettonMinterConfigToCell(config);
    const init = { code, data };
    return new JettonMinter(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendMint(
    provider: ContractProvider,
    via: Sender,
    opts: {
      toAddress: Address;
      jettonAmount: bigint;
      forwardTonAmount: bigint;
      totalTonAmount: bigint;
      queryId?: number;
    }
  ) {
    const mintMsg = beginCell()
      .storeUint(0x178d4519, 32) // internal_transfer op
      .storeUint(opts.queryId ?? 0, 64)
      .storeCoins(opts.jettonAmount)
      .storeAddress(this.address) // from_address (minter)
      .storeAddress(via.address!) // response_address
      .storeCoins(opts.forwardTonAmount)
      .storeBit(false) // no forward_payload
      .endCell();

    await provider.internal(via, {
      value: opts.totalTonAmount,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x642b7d07, 32) // op::mint
        .storeUint(opts.queryId ?? 0, 64)
        .storeAddress(opts.toAddress)
        .storeCoins(opts.forwardTonAmount)
        .storeRef(mintMsg)
        .endCell(),
    });
  }

  async sendChangeAdmin(
    provider: ContractProvider,
    via: Sender,
    newAdmin: Address,
    queryId?: number
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x6501f354, 32) // op::change_admin
        .storeUint(queryId ?? 0, 64)
        .storeAddress(newAdmin)
        .endCell(),
    });
  }

  async sendChangeContent(
    provider: ContractProvider,
    via: Sender,
    content: Cell,
    queryId?: number
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(0x5773d1f5, 32) // op::change_content
        .storeUint(queryId ?? 0, 64)
        .storeRef(content)
        .endCell(),
    });
  }

  async getWalletAddress(provider: ContractProvider, ownerAddress: Address): Promise<Address> {
    const result = await provider.get('get_wallet_address', [
      {
        type: 'slice',
        cell: beginCell().storeAddress(ownerAddress).endCell(),
      } as TupleItemSlice,
    ]);
    return result.stack.readAddress();
  }

  async getJettonData(provider: ContractProvider): Promise<JettonData> {
    const result = await provider.get('get_jetton_data', []);
    const totalSupply = result.stack.readBigNumber();
    const mintable = result.stack.readNumber() !== 0;
    const adminAddress = result.stack.readAddress();
    const content = result.stack.readCell();
    const walletCode = result.stack.readCell();
    return { totalSupply, mintable, adminAddress, content, walletCode };
  }

  async getTotalSupply(provider: ContractProvider): Promise<bigint> {
    const data = await this.getJettonData(provider);
    return data.totalSupply;
  }

  async getAdminAddress(provider: ContractProvider): Promise<Address> {
    const data = await this.getJettonData(provider);
    return data.adminAddress;
  }
}
