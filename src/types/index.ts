// Shared domain types.

/** A single parsed delivery/quotation row (mirrors the WhatsApp → Excel parser). */
export interface DeliveryRow {
  /** Period marker, e.g. "Manhã", "Noite", or "—" when unknown. */
  periodo: string;
  /** Quotation number (kept as string to preserve leading zeros) or a name. */
  cotacao: string;
  /** Neighbourhood / bairro. */
  bairro: string;
  /** Courier phone number, or "" when none. */
  telefone: string;
  /** Resolved day-of-week / date label, or "" when none. */
  dia: string;
}

/** A saved batch of rows, as persisted in Firestore. */
export interface DeliveryBatch {
  /** Firestore document id (present when read back, omitted on create). */
  id?: string;
  /** UID of the owner. */
  ownerId: string;
  /** The parsed rows in this batch. */
  rows: DeliveryRow[];
  /** Optional human-friendly label. */
  title?: string;
  /** Creation timestamp in epoch milliseconds. */
  createdAt: number;
}
