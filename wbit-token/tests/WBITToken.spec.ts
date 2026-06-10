import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address } from '@ton/core';
import { JettonMinter, buildOnchainMetadata } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import { compile } from '@ton/blueprint';
import '@ton/test-utils';

describe('WBIT Token', () => {
  let minterCode: Cell;
  let walletCode: Cell;
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let minter: SandboxContract<JettonMinter>;

  const DECIMALS = 1_000_000_000n;
  const INITIAL_MINT = 100_000_000n * DECIMALS;

  beforeAll(async () => {
    minterCode = await compile('jetton-minter');
    walletCode = await compile('jetton-wallet');
  });

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    deployer = await blockchain.treasury('deployer');

    const content = buildOnchainMetadata({
      name: 'WBIT',
      description: 'Native token of Tepla messenger',
      symbol: 'WBIT',
      decimals: '9',
      image: 'https://tepla.app/wbit-logo.png',
    });

    minter = blockchain.openContract(
      JettonMinter.createFromConfig(
        { admin: deployer.address, content, walletCode },
        minterCode
      )
    );

    const deployResult = await minter.sendDeploy(deployer.getSender(), toNano('0.25'));
    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: minter.address,
      deploy: true,
      success: true,
    });
  });

  // ── Test 1: Deploy minter contract ──
  it('should deploy minter correctly', async () => {
    const data = await minter.getJettonData();
    expect(data.totalSupply).toBe(0n);
    expect(data.mintable).toBe(true);
    expect(data.adminAddress.equals(deployer.address)).toBe(true);
  });

  // ── Test 2: Mint tokens to address ──
  it('should mint tokens to deployer', async () => {
    const mintResult = await minter.sendMint(deployer.getSender(), {
      toAddress: deployer.address,
      jettonAmount: INITIAL_MINT,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    expect(mintResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: minter.address,
      success: true,
    });

    const data = await minter.getJettonData();
    expect(data.totalSupply).toBe(INITIAL_MINT);

    // Check deployer's wallet balance
    const walletAddress = await minter.getWalletAddress(deployer.address);
    const wallet = blockchain.openContract(JettonWallet.createFromAddress(walletAddress));
    const balance = await wallet.getBalance();
    expect(balance).toBe(INITIAL_MINT);
  });

  // ── Test 3: Transfer tokens between wallets ──
  it('should transfer tokens between wallets', async () => {
    // Mint to deployer first
    await minter.sendMint(deployer.getSender(), {
      toAddress: deployer.address,
      jettonAmount: INITIAL_MINT,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    const receiver = await blockchain.treasury('receiver');
    const deployerWalletAddress = await minter.getWalletAddress(deployer.address);
    const deployerWallet = blockchain.openContract(JettonWallet.createFromAddress(deployerWalletAddress));

    const transferAmount = 1_000_000n * DECIMALS; // 1M WBIT

    const transferResult = await deployerWallet.sendTransfer(deployer.getSender(), {
      value: toNano('0.15'),
      jettonAmount: transferAmount,
      to: receiver.address,
      responseAddress: deployer.address,
      forwardAmount: toNano('0.01'),
    });

    expect(transferResult.transactions).toHaveTransaction({
      from: deployerWalletAddress,
      success: true,
    });

    // Check balances
    const deployerBalance = await deployerWallet.getBalance();
    expect(deployerBalance).toBe(INITIAL_MINT - transferAmount);

    const receiverWalletAddress = await minter.getWalletAddress(receiver.address);
    const receiverWallet = blockchain.openContract(JettonWallet.createFromAddress(receiverWalletAddress));
    const receiverBalance = await receiverWallet.getBalance();
    expect(receiverBalance).toBe(transferAmount);
  });

  // ── Test 4: Burn tokens ──
  it('should burn tokens and reduce total supply', async () => {
    await minter.sendMint(deployer.getSender(), {
      toAddress: deployer.address,
      jettonAmount: INITIAL_MINT,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    const deployerWalletAddress = await minter.getWalletAddress(deployer.address);
    const deployerWallet = blockchain.openContract(JettonWallet.createFromAddress(deployerWalletAddress));

    const burnAmount = 10_000_000n * DECIMALS; // 10M WBIT

    const burnResult = await deployerWallet.sendBurn(deployer.getSender(), {
      value: toNano('0.1'),
      jettonAmount: burnAmount,
      responseAddress: deployer.address,
    });

    expect(burnResult.transactions).toHaveTransaction({
      from: deployerWalletAddress,
      to: minter.address,
      success: true,
    });

    // Verify total supply decreased
    const data = await minter.getJettonData();
    expect(data.totalSupply).toBe(INITIAL_MINT - burnAmount);

    // Verify wallet balance decreased
    const balance = await deployerWallet.getBalance();
    expect(balance).toBe(INITIAL_MINT - burnAmount);
  });

  // ── Test 5: Check total supply updates after multiple ops ──
  it('should track total supply across mint and burn', async () => {
    const user1 = await blockchain.treasury('user1');
    const user2 = await blockchain.treasury('user2');

    // Mint to user1
    await minter.sendMint(deployer.getSender(), {
      toAddress: user1.address,
      jettonAmount: 50_000_000n * DECIMALS,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    // Mint to user2
    await minter.sendMint(deployer.getSender(), {
      toAddress: user2.address,
      jettonAmount: 30_000_000n * DECIMALS,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    let data = await minter.getJettonData();
    expect(data.totalSupply).toBe(80_000_000n * DECIMALS);

    // Burn from user1
    const user1WalletAddr = await minter.getWalletAddress(user1.address);
    const user1Wallet = blockchain.openContract(JettonWallet.createFromAddress(user1WalletAddr));

    await user1Wallet.sendBurn(user1.getSender(), {
      value: toNano('0.1'),
      jettonAmount: 5_000_000n * DECIMALS,
      responseAddress: user1.address,
    });

    data = await minter.getJettonData();
    expect(data.totalSupply).toBe(75_000_000n * DECIMALS);
  });

  // ── Test 6: Check balances after operations ──
  it('should maintain correct balances after chain of transfers', async () => {
    const alice = await blockchain.treasury('alice');
    const bob = await blockchain.treasury('bob');

    await minter.sendMint(deployer.getSender(), {
      toAddress: alice.address,
      jettonAmount: 10_000n * DECIMALS,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    const aliceWalletAddr = await minter.getWalletAddress(alice.address);
    const aliceWallet = blockchain.openContract(JettonWallet.createFromAddress(aliceWalletAddr));

    // Alice sends 3000 to Bob
    await aliceWallet.sendTransfer(alice.getSender(), {
      value: toNano('0.15'),
      jettonAmount: 3_000n * DECIMALS,
      to: bob.address,
      responseAddress: alice.address,
      forwardAmount: toNano('0.01'),
    });

    const aliceBalance = await aliceWallet.getBalance();
    expect(aliceBalance).toBe(7_000n * DECIMALS);

    const bobWalletAddr = await minter.getWalletAddress(bob.address);
    const bobWallet = blockchain.openContract(JettonWallet.createFromAddress(bobWalletAddr));
    const bobBalance = await bobWallet.getBalance();
    expect(bobBalance).toBe(3_000n * DECIMALS);
  });

  // ── Test 7: Only admin can mint ──
  it('should reject mint from non-admin', async () => {
    const attacker = await blockchain.treasury('attacker');

    const mintResult = await minter.sendMint(attacker.getSender(), {
      toAddress: attacker.address,
      jettonAmount: 1_000_000n * DECIMALS,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    expect(mintResult.transactions).toHaveTransaction({
      from: attacker.address,
      to: minter.address,
      success: false,
      exitCode: 73, // error::unauthorized
    });

    // Supply should remain 0
    const data = await minter.getJettonData();
    expect(data.totalSupply).toBe(0n);
  });

  // ── Test 8: Transfer notifications ──
  it('should send transfer notification with forward payload', async () => {
    await minter.sendMint(deployer.getSender(), {
      toAddress: deployer.address,
      jettonAmount: 1_000n * DECIMALS,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    const receiver = await blockchain.treasury('notif-receiver');
    const deployerWalletAddress = await minter.getWalletAddress(deployer.address);
    const deployerWallet = blockchain.openContract(JettonWallet.createFromAddress(deployerWalletAddress));

    const forwardPayload = beginCell().storeUint(0, 32).storeStringTail('WBIT tip').endCell();

    const result = await deployerWallet.sendTransfer(deployer.getSender(), {
      value: toNano('0.2'),
      jettonAmount: 100n * DECIMALS,
      to: receiver.address,
      responseAddress: deployer.address,
      forwardAmount: toNano('0.05'),
      forwardPayload,
    });

    // Should have notification transaction to receiver
    expect(result.transactions).toHaveTransaction({
      to: receiver.address,
      success: true,
    });
  });

  // ── Test: Change admin ──
  it('should allow admin to change admin', async () => {
    const newAdmin = await blockchain.treasury('newAdmin');
    await minter.sendChangeAdmin(deployer.getSender(), newAdmin.address);

    const data = await minter.getJettonData();
    expect(data.adminAddress.equals(newAdmin.address)).toBe(true);
  });

  // ── Test: Insufficient balance transfer fails ──
  it('should reject transfer with insufficient balance', async () => {
    await minter.sendMint(deployer.getSender(), {
      toAddress: deployer.address,
      jettonAmount: 100n * DECIMALS,
      forwardTonAmount: toNano('0.05'),
      totalTonAmount: toNano('0.2'),
    });

    const receiver = await blockchain.treasury('receiver2');
    const deployerWalletAddress = await minter.getWalletAddress(deployer.address);
    const deployerWallet = blockchain.openContract(JettonWallet.createFromAddress(deployerWalletAddress));

    const result = await deployerWallet.sendTransfer(deployer.getSender(), {
      value: toNano('0.15'),
      jettonAmount: 1000n * DECIMALS, // more than balance
      to: receiver.address,
      responseAddress: deployer.address,
      forwardAmount: toNano('0.01'),
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: deployerWalletAddress,
      success: false,
    });
  });
});
