// Types dp-firebase-admin/firestore - sous-ensemble REST utilise par DataParl'
// (collection/doc/add/where/limit/get/create/update/set-merge/delete).

export type DocumentData = Record<string, unknown>;

export interface DocumentSnapshot {
  exists: boolean;
  id: string;
  ref: DocumentReference;
  data(): DocumentData | undefined;
}

export interface DocumentReference {
  id: string;
  get(): Promise<DocumentSnapshot>;
  create(donnees: DocumentData): Promise<unknown>;
  update(donnees: DocumentData): Promise<unknown>;
  set(donnees: DocumentData, options?: { merge?: boolean }): Promise<unknown>;
  delete(): Promise<unknown>;
}

export interface QuerySnapshot {
  empty: boolean;
  size: number;
  docs: DocumentSnapshot[];
}

export interface Query {
  where(champ: string, operateur: string, valeur: unknown): Query;
  limit(n: number): Query;
  get(): Promise<QuerySnapshot>;
}

export interface CollectionReference extends Query {
  doc(id: string): DocumentReference;
  add(donnees: DocumentData): Promise<unknown>;
}

export interface FirestoreSettings {
  preferRest?: boolean;
  [parametre: string]: unknown;
}

export interface Firestore {
  collection(chemin: string): CollectionReference;
}

export declare function initializeFirestore(app?: unknown, parametres?: FirestoreSettings): Firestore;
export declare function getFirestore(app?: unknown): Firestore;
