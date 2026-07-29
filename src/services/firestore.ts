// Firestore data-access helpers for delivery batches.

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { DeliveryBatch } from "../types";

const BATCHES = "batches";

function fromSnapshot(snap: QueryDocumentSnapshot<DocumentData>): DeliveryBatch {
  const data = snap.data();
  return {
    id: snap.id,
    ownerId: data.ownerId,
    rows: data.rows ?? [],
    title: data.title,
    createdAt: data.createdAt,
  };
}

/** Create a new batch and return its generated id. */
export async function createBatch(batch: Omit<DeliveryBatch, "id">): Promise<string> {
  const ref = await addDoc(collection(db, BATCHES), batch);
  return ref.id;
}

/** Fetch a single batch by id, or null if it does not exist. */
export async function getBatch(id: string): Promise<DeliveryBatch | null> {
  const snap = await getDoc(doc(db, BATCHES, id));
  return snap.exists() ? fromSnapshot(snap as QueryDocumentSnapshot<DocumentData>) : null;
}

/** List all batches owned by a user, newest first. */
export async function listBatches(ownerId: string): Promise<DeliveryBatch[]> {
  const q = query(
    collection(db, BATCHES),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(fromSnapshot);
}

/** Update mutable fields of an existing batch. */
export function updateBatch(id: string, patch: Partial<DeliveryBatch>): Promise<void> {
  return updateDoc(doc(db, BATCHES, id), patch as DocumentData);
}

/** Delete a batch by id. */
export function deleteBatch(id: string): Promise<void> {
  return deleteDoc(doc(db, BATCHES, id));
}
