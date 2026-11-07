export interface PendingSwap {
  id: number
  origin: string
  params: {
    outputMint: string
    inputMint?: string
    amountLamports: string
    slippageBps?: number
    reshield?: boolean
  }
}

export function isValidPendingConnection(v: unknown): v is { id: number; origin: string } {
  if (!v || typeof v !== "object") return false
  const rec = v as { id?: unknown; origin?: unknown }
  return (
    typeof rec.id === "number" &&
    Number.isFinite(rec.id) &&
    typeof rec.origin === "string" &&
    rec.origin.trim().length > 0
  )
}

export function isValidPendingSwap(v: unknown): v is PendingSwap {
  if (!v || typeof v !== "object") return false
  const rec = v as { id?: unknown; origin?: unknown; params?: unknown }
  if (
    typeof rec.id !== "number" ||
    !Number.isFinite(rec.id) ||
    typeof rec.origin !== "string" ||
    rec.origin.trim().length === 0 ||
    !rec.params ||
    typeof rec.params !== "object"
  ) {
    return false
  }
  const params = rec.params as { outputMint?: unknown; amountLamports?: unknown }
  return (
    typeof params.outputMint === "string" &&
    params.outputMint.trim().length > 0 &&
    typeof params.amountLamports === "string" &&
    params.amountLamports.trim().length > 0
  )
}
