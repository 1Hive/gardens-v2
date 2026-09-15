import { Address } from "viem";
import { Chain, Connector } from "wagmi";

export const CITIZEN_WALLET_CONNECTOR_ID = "citizenWallet";

/**
 * Presentation-only connector for ConnectKit's wallet list. The provider
 * bridge intercepts selection before ConnectKit calls connect(), because
 * Citizen transactions use the signed QR/deep-link flow instead of an EIP-1193
 * wallet transport.
 */
export class CitizenWalletConnector extends Connector {
  readonly id = CITIZEN_WALLET_CONNECTOR_ID;
  readonly name = "Citizen Wallet";
  readonly ready = true;

  constructor(chains: Chain[]) {
    super({ chains, options: {} });
  }

  connect(): ReturnType<Connector["connect"]> {
    return Promise.reject(new Error("User rejected request"));
  }

  async disconnect() {}

  async getAccount(): Promise<Address> {
    throw new Error("Citizen Wallet uses the Gardens signed connection flow.");
  }

  async getChainId() {
    return 100;
  }

  async getProvider(): Promise<never> {
    throw new Error("Citizen Wallet does not expose an EIP-1193 provider.");
  }

  getWalletClient(): ReturnType<Connector["getWalletClient"]> {
    return Promise.reject(
      new Error("Citizen Wallet uses the Gardens signed connection flow."),
    );
  }

  async isAuthorized() {
    return false;
  }

  protected onAccountsChanged() {}

  protected onChainChanged() {}

  protected onDisconnect() {}
}
