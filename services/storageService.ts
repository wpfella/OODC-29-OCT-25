import { openDB, IDBPDatabase } from 'idb';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { AppState } from '../types';

const DB_NAME = 'OutOfDebtDB';
const STORE_SCENARIOS = 'scenarios';
const STORE_FOLDERS = 'folders';

export interface Scenario {
  id: string;
  name: string;
  data: AppState;
  tags: string[];
  folderId: string | null;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  ownerUid?: string;
  sharedWith?: string[];
  isFavorite?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  ownerUid?: string;
  createdAt: string;
}

class StorageService {
  private idb: Promise<IDBPDatabase>;

  constructor() {
    this.idb = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_SCENARIOS, { keyPath: 'id' });
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      },
    });
  }

  private isGoogleUser() {
    return auth.currentUser?.email?.endsWith('@crown.money') ?? false;
  }

  // --- Scenarios ---

  async saveScenario(scenario: Scenario) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/scenarios`;
      try {
        await setDoc(doc(db, path, scenario.id), {
          ...scenario,
          ownerUid: auth.currentUser!.uid,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const db = await this.idb;
      await db.put(STORE_SCENARIOS, {
        ...scenario,
        updatedAt: new Date().toISOString()
      });
    }
  }

  async getScenarios(): Promise<Scenario[]> {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/scenarios`;
      try {
        const q = query(collection(db, path));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Scenario);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const db = await this.idb;
      return db.getAll(STORE_SCENARIOS);
    }
  }

  async deleteScenario(id: string, permanent = false) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/scenarios`;
      try {
        if (permanent) {
          await deleteDoc(doc(db, path, id));
        } else {
          await updateDoc(doc(db, path, id), {
            isDeleted: true,
            deletedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const db = await this.idb;
      if (permanent) {
        await db.delete(STORE_SCENARIOS, id);
      } else {
        const scenario = await db.get(STORE_SCENARIOS, id);
        if (scenario) {
          scenario.isDeleted = true;
          scenario.deletedAt = new Date().toISOString();
          await db.put(STORE_SCENARIOS, scenario);
        }
      }
    }
  }

  async restoreScenario(id: string) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/scenarios`;
      try {
        await updateDoc(doc(db, path, id), {
          isDeleted: false,
          deletedAt: null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      const db = await this.idb;
      const scenario = await db.get(STORE_SCENARIOS, id);
      if (scenario) {
        scenario.isDeleted = false;
        scenario.deletedAt = undefined;
        await db.put(STORE_SCENARIOS, scenario);
      }
    }
  }

  // --- Folders ---

  async saveFolder(folder: Folder) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/folders`;
      try {
        await setDoc(doc(db, path, folder.id), {
          ...folder,
          ownerUid: auth.currentUser!.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const db = await this.idb;
      await db.put(STORE_FOLDERS, folder);
    }
  }

  async getFolders(): Promise<Folder[]> {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/folders`;
      try {
        const snapshot = await getDocs(collection(db, path));
        return snapshot.docs.map(doc => doc.data() as Folder);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const db = await this.idb;
      return db.getAll(STORE_FOLDERS);
    }
  }

  async deleteFolder(id: string) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/folders`;
      try {
        await deleteDoc(doc(db, path, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const db = await this.idb;
      await db.delete(STORE_FOLDERS, id);
    }
  }

  // --- Real-time Sync ---

  subscribeToScenarios(callback: (scenarios: Scenario[]) => void) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/scenarios`;
      return onSnapshot(collection(db, path), (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data() as Scenario));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    }
    return () => {};
  }

  subscribeToFolders(callback: (folders: Folder[]) => void) {
    if (this.isGoogleUser()) {
      const path = `users/${auth.currentUser!.uid}/folders`;
      return onSnapshot(collection(db, path), (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data() as Folder));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
    }
    return () => {};
  }
}

export const storageService = new StorageService();
