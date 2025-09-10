
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import type { DynamicNodeConfig, NodeData, Edge, SavedWorkflow } from '../core/types';

// Wrapper for IndexedDB to store the SQLite file
const IDB_CONFIG = {
    DB_NAME: 'AgentricAI_SQLite_DB',
    STORE_NAME: 'files',
    DB_FILE_KEY: 'sqlite_database_v1'
};

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
    if (!idbPromise) {
        idbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(IDB_CONFIG.DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(IDB_CONFIG.STORE_NAME)) {
                    request.result.createObjectStore(IDB_CONFIG.STORE_NAME);
                }
            };
        });
    }
    return idbPromise;
}

async function getFileFromIDB(): Promise<Uint8Array | null> {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IDB_CONFIG.STORE_NAME, 'readonly');
        const store = transaction.objectStore(IDB_CONFIG.STORE_NAME);
        const request = store.get(IDB_CONFIG.DB_FILE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function saveFileToIDB(data: Uint8Array): Promise<void> {
    const db = await getIDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(IDB_CONFIG.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IDB_CONFIG.STORE_NAME);
        const request = store.put(data, IDB_CONFIG.DB_FILE_KEY);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}


class DatabaseService {
    private db: Database | null = null;
    private isInitialized = false;

    async init(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
            });

            const dbFile = await getFileFromIDB();
            if (dbFile) {
                console.log("AgentricAI Studios: Loading database from IndexedDB...");
                this.db = new SQL.Database(dbFile);
            } else {
                console.log("AgentricAI Studios: No existing database found. Creating a new one.");
                this.db = new SQL.Database();
                this.createSchema();
            }
            this.isInitialized = true;
            console.log("AgentricAI Studios: Database service initialized successfully.");
        } catch (e) {
            console.error("Failed to initialize database service:", e);
            throw e; // Re-throw to allow the caller to handle critical init failure
        }
    }
    
    private createSchema(): void {
        if (!this.db) return;
        this.db.run(`
            CREATE TABLE workflows (
                name TEXT PRIMARY KEY,
                nodes TEXT NOT NULL,
                edges TEXT NOT NULL,
                lastSaved TEXT NOT NULL
            );
        `);
        this.db.run(`
            CREATE TABLE custom_agents (
                name TEXT PRIMARY KEY,
                config TEXT NOT NULL
            );
        `);
        this.persistDatabase();
    }

    private async persistDatabase(): Promise<void> {
        if (!this.db) return;
        try {
            const data = this.db.export();
            await saveFileToIDB(data);
        } catch (e) {
            console.error("Failed to persist database:", e);
        }
    }
    
    public async saveWorkflow(name: string, nodes: NodeData[], edges: Edge[]): Promise<void> {
        if (!this.db) return;
        this.db.run("INSERT OR REPLACE INTO workflows (name, nodes, edges, lastSaved) VALUES (?, ?, ?, ?)", [
            name,
            JSON.stringify(nodes),
            JSON.stringify(edges),
            new Date().toISOString()
        ]);
        await this.persistDatabase();
    }

    public async loadWorkflow(name: string): Promise<SavedWorkflow | null> {
        if (!this.db) return null;
        try {
            const stmt = this.db.prepare("SELECT * FROM workflows WHERE name = :name");
            const result = stmt.getAsObject({ ':name': name });
            stmt.free();
            if (Object.keys(result).length === 0) return null;

            const nodesStr = result.nodes as string;
            const edgesStr = result.edges as string;

            if (typeof nodesStr !== 'string' || typeof edgesStr !== 'string') {
                throw new Error("Corrupted workflow data: nodes or edges are not strings.");
            }

            const nodes = JSON.parse(nodesStr);
            const edges = JSON.parse(edgesStr);
    
            return {
                name: result.name as string,
                nodes: Array.isArray(nodes) ? nodes : [],
                edges: Array.isArray(edges) ? edges : [],
                lastSaved: result.lastSaved as string,
            };
        } catch (e) {
            console.error(`Failed to load or parse workflow "${name}":`, e);
            // If parsing fails, it's safer to treat it as not found and delete the corrupted entry
            this.deleteWorkflow(name).catch(delErr => console.error(`Failed to delete corrupted workflow "${name}":`, delErr));
            return null;
        }
    }

    public async loadWorkflows(): Promise<Record<string, SavedWorkflow>> {
        if (!this.db) return {};
        const workflows: Record<string, SavedWorkflow> = {};
        try {
            const results = this.db.exec("SELECT * FROM workflows WHERE name != '__autosave'");
            if (results[0]) {
                for (const row of results[0].values) {
                    const name = row[0] as string;
                    try {
                        const nodesStr = row[1] as string;
                        const edgesStr = row[2] as string;
                        if (typeof nodesStr !== 'string' || typeof edgesStr !== 'string') {
                           console.error(`Skipping corrupted workflow "${name}": data is not a string.`);
                           continue;
                        }
                        const nodes = JSON.parse(nodesStr);
                        const edges = JSON.parse(edgesStr);

                        workflows[name] = {
                            name,
                            nodes: Array.isArray(nodes) ? nodes : [],
                            edges: Array.isArray(edges) ? edges : [],
                            lastSaved: row[3] as string,
                        };
                    } catch (e) {
                        console.error(`Skipping corrupted workflow "${name}" due to parsing error:`, e);
                    }
                }
            }
        } catch(e) {
            console.error("Failed to execute query to load all workflows:", e);
        }
        return workflows;
    }

    public async deleteWorkflow(name: string): Promise<void> {
        if (!this.db) return;
        this.db.run("DELETE FROM workflows WHERE name = ?", [name]);
        await this.persistDatabase();
    }

    public async saveCustomAgents(agents: DynamicNodeConfig[]): Promise<void> {
        if (!this.db) return;
        this.db.run("DELETE FROM custom_agents");
        const stmt = this.db.prepare("INSERT INTO custom_agents (name, config) VALUES (?, ?)");
        agents.forEach(agent => {
            stmt.run([agent.name, JSON.stringify(agent)]);
        });
        stmt.free();
        await this.persistDatabase();
    }

    public async loadCustomAgents(): Promise<DynamicNodeConfig[]> {
        if (!this.db) return [];
        const agents: DynamicNodeConfig[] = [];
        try {
            const results = this.db.exec("SELECT config FROM custom_agents");
            if (results[0]) {
                for (const row of results[0].values) {
                    try {
                        const configStr = row[0] as string;
                        if(typeof configStr !== 'string') {
                            console.error(`Skipping corrupted custom agent: data is not a string.`, `Raw data: ${row[0]}`);
                            continue;
                        }
                        agents.push(JSON.parse(configStr));
                    } catch (e) {
                        console.error(`Skipping corrupted custom agent due to parsing error:`, e, `Raw data: ${row[0]}`);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to execute query to load custom agents:", e);
        }
        return agents;
    }
}

export const databaseService = new DatabaseService();
