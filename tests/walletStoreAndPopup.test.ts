import { beforeEach, describe, expect, it } from "vitest"
import type { WalletKeyPair } from "../lib/crypto/keyManagement"
import { useWalletStore, type Account } from "../lib/store/walletStore"
import {
  isValidPendingConnection,
  isValidPendingSwap,
  type PendingSwap
} from "../src/popup/validation"

const mockKeypair0: WalletKeyPair = {
  boxKeypair: {
    publicKey: new Uint8Array(32).fill(1),
    secretKey: new Uint8Array(32).fill(2)
  },
  spendKeypair: {
    publicKey: new Uint8Array(32).fill(3),
    secretKey: new Uint8Array(32).fill(4)
  },
  shieldedAddress: "paraloom1mockaddress0"
}

const mockKeypair1: WalletKeyPair = {
  boxKeypair: {
    publicKey: new Uint8Array(32).fill(5),
    secretKey: new Uint8Array(32).fill(6)
  },
  spendKeypair: {
    publicKey: new Uint8Array(32).fill(7),
    secretKey: new Uint8Array(32).fill(8)
  },
  shieldedAddress: "paraloom1mockaddress1"
}

describe("useWalletStore (#257 regression tests)", () => {
  beforeEach(() => {
    useWalletStore.getState().clear()
  })

  it("synchronizes accounts[currentAccountIndex].balance when setBalance is called", () => {
    const store = useWalletStore.getState()
    const acc0: Account = {
      index: 0,
      name: "Account 0",
      keypair: mockKeypair0,
      balance: 0n
    }
    const acc1: Account = {
      index: 1,
      name: "Account 1",
      keypair: mockKeypair1,
      balance: 0n
    }

    store.addAccount(acc0)
    store.addAccount(acc1)
    store.switchAccount(0)

    // Update balance
    store.setBalance(5000n)
    expect(useWalletStore.getState().balance).toBe(5000n)
    expect(useWalletStore.getState().accounts[0].balance).toBe(5000n)
    expect(useWalletStore.getState().accounts[1].balance).toBe(0n)

    // Switching to Account 1 should load 0n balance
    store.switchAccount(1)
    expect(useWalletStore.getState().balance).toBe(0n)

    // Update Account 1 balance
    store.setBalance(9000n)
    expect(useWalletStore.getState().balance).toBe(9000n)
    expect(useWalletStore.getState().accounts[1].balance).toBe(9000n)

    // Switching back to Account 0 preserves the updated 5000n balance
    store.switchAccount(0)
    expect(useWalletStore.getState().balance).toBe(5000n)
  })

  it("upserts account in addAccount instead of silently dropping updates to existing accounts", () => {
    const store = useWalletStore.getState()
    const initialAcc: Account = {
      index: 0,
      name: "Initial Name",
      keypair: mockKeypair0,
      balance: 100n
    }
    store.addAccount(initialAcc)

    const updatedAcc: Account = {
      index: 0,
      name: "Updated Name",
      keypair: mockKeypair0,
      balance: 888n
    }
    store.addAccount(updatedAcc)

    const state = useWalletStore.getState()
    expect(state.accounts.length).toBe(1)
    expect(state.accounts[0].name).toBe("Updated Name")
    expect(state.accounts[0].balance).toBe(888n)
  })

  it("clears balance and accounts when lock() is called", () => {
    const store = useWalletStore.getState()
    store.unlock(mockKeypair0)
    store.setBalance(12345n)
    expect(useWalletStore.getState().balance).toBe(12345n)

    store.lock()
    const state = useWalletStore.getState()
    expect(state.locked).toBe(true)
    expect(state.balance).toBe(0n)
    expect(state.wallet).toBeNull()
    expect(state.accounts).toEqual([])
  })
})

describe("Popup account restoration and validation (#257 regression tests)", () => {
  it("restores Account 0 when currentAccountIndex is 0 (truthy check bug)", () => {
    const store = useWalletStore.getState()
    store.clear()

    const session = {
      wallet: mockKeypair0,
      accounts: [
        { index: 0, name: "Account 0", keypair: mockKeypair0, balance: 777n },
        { index: 1, name: "Account 1", keypair: mockKeypair1, balance: 333n }
      ],
      currentAccountIndex: 0,
      seedPhrase: null
    }

    store.unlock(session.wallet)
    session.accounts.forEach((a) => store.addAccount(a))

    // Mimic the fixed check in initWallet
    if (
      typeof session.currentAccountIndex === "number" &&
      Number.isInteger(session.currentAccountIndex) &&
      session.currentAccountIndex >= 0
    ) {
      store.switchAccount(session.currentAccountIndex)
    }

    const state = useWalletStore.getState()
    expect(state.currentAccountIndex).toBe(0)
    expect(state.balance).toBe(777n)
  })

  it("validates isValidPendingConnection correctly", () => {
    expect(isValidPendingConnection({ id: 1, origin: "https://dapp.io" })).toBe(true)
    expect(isValidPendingConnection({ id: NaN, origin: "https://dapp.io" })).toBe(false)
    expect(isValidPendingConnection({ id: 1, origin: "" })).toBe(false)
    expect(isValidPendingConnection({ id: 1, origin: "   " })).toBe(false)
    expect(isValidPendingConnection(null)).toBe(false)
    expect(isValidPendingConnection(undefined)).toBe(false)
    expect(isValidPendingConnection("invalid")).toBe(false)
  })

  it("validates isValidPendingSwap correctly", () => {
    const validSwap: PendingSwap = {
      id: 42,
      origin: "https://swap.io",
      params: {
        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amountLamports: "100000000"
      }
    }
    expect(isValidPendingSwap(validSwap)).toBe(true)
    expect(isValidPendingSwap({ ...validSwap, id: NaN })).toBe(false)
    expect(isValidPendingSwap({ ...validSwap, origin: "" })).toBe(false)
    expect(isValidPendingSwap({ ...validSwap, params: null })).toBe(false)
    expect(
      isValidPendingSwap({ ...validSwap, params: { outputMint: "", amountLamports: "100" } })
    ).toBe(false)
    expect(
      isValidPendingSwap({ ...validSwap, params: { outputMint: "MINT", amountLamports: "" } })
    ).toBe(false)
    expect(isValidPendingSwap(null)).toBe(false)
  })
})
