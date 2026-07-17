import { walletsApi } from './api/wallets.api';
import { freighterService } from './stellar/freighter.service';

export interface WalletProvider {
  isInstalled(): Promise<boolean>;
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string | null>;
  getNetwork(): Promise<string>;
  getBalance(address: string): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
}

export class FreighterWalletProvider implements WalletProvider {
  private address: string | null = null;

  async isInstalled(): Promise<boolean> {
    return freighterService.isInstalled();
  }

  async connect(): Promise<string> {
    const address = await freighterService.requestAccess();
    this.address = address;
    return address;
  }

  async disconnect(): Promise<void> {
    this.address = null;
  }

  async getAddress(): Promise<string | null> {
    if (this.address) return this.address;
    try {
      const address = await freighterService.getPublicKey();
      this.address = address;
      return address;
    } catch {
      return null;
    }
  }

  async getNetwork(): Promise<string> {
    const res = await freighterService.getNetwork();
    return res.network;
  }

  async getBalance(address: string): Promise<string> {
    const balance = await walletsApi.balance(address);
    return parseFloat(balance.nativeBalance).toFixed(5);
  }

  async signTransaction(xdr: string): Promise<string> {
    return freighterService.signClassicTransaction(xdr, this.address ?? undefined);
  }
}

export const walletService = new FreighterWalletProvider();
