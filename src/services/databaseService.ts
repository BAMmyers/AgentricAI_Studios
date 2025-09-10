

import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import type { DynamicNodeConfig, NodeData, Edge, SavedWorkflow, EventLog, BugReport } from '../core/types';

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
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(IDB_CONFIG.STORE_NAME)) {
                    db.createObjectStore(IDB_CONFIG.STORE_NAME);
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
        request.onsuccess = () => resolve((request.result as Uint8Array) || null);
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
                locateFile: file => `https://esm.sh/sql.js@1.10.3/dist/${file}`
            });

            const dbFile = await getFileFromIDB();
            if (dbFile) {
                console.log("AgentricAI Studios: Loading database from IndexedDB...");
                this.db = new SQL.Database(dbFile);
                this.verifyAndCreateSchema();
            } else {
                console.log("AgentricAI Studios: No existing database found. Creating a new one.");
                this.db = new SQL.Database();
                this.createSchema();
            }
            this.isInitialized = true;
            console.log("AgentricAI Studios: Database service initialized successfully.");
        } catch (e) {
            console.error("Failed to initialize database service. The application may not save data correctly.", e);
        }
    }
    
    private verifyAndCreateSchema(): void {
        if (!this.db) return;
        const tables = ['workflows', 'custom_agents', 'bug_reports', 'event_logs'];
        const existingTables = this.db.exec("SELECT name FROM sqlite_master WHERE type='table';")[0]?.values.flat() || [];
        
        if (!existingTables.includes('workflows')) {
            this.db.run(`CREATE TABLE workflows (name TEXT PRIMARY KEY, nodes TEXT, edges TEXT, lastSaved TEXT);`);
        }
        if (!existingTables.includes('custom_agents')) {
            this.db.run(`CREATE TABLE custom_agents (name TEXT PRIMARY KEY, config TEXT);`);
        }
        if (!existingTables.includes('bug_reports')) {
             this.db.run(`CREATE TABLE bug_reports (id TEXT PRIMARY KEY, report TEXT);`);
        }
        if (!existingTables.includes('event_logs')) {
             this.db.run(`CREATE TABLE event_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, agent TEXT, event TEXT, timestamp TEXT, details TEXT);`);
        }
    }

    private createSchema(): void {
        if (!this.db) return;
        this.db.run(`CREATE TABLE workflows (name TEXT PRIMARY KEY, nodes TEXT, edges TEXT, lastSaved TEXT);`);
        this.db.run(`CREATE TABLE custom_agents (name TEXT PRIMARY KEY, config TEXT);`);
        this.db.run(`CREATE TABLE bug_reports (id TEXT PRIMARY KEY, report TEXT);`);
        this.db.run(`CREATE TABLE event_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, agent TEXT, event TEXT, timestamp TEXT, details TEXT);`);
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
        if (!this.db) {
            console.warn("Database not initialized, skipping save.");
            return;
        }

        let nodesJson: string;
        let edgesJson: string;

        try {
            const nodesToSave = Array.isArray(nodes) ? nodes : [];
            nodesJson = JSON.stringify(nodesToSave);
        } catch (e) {
            console.error(`Failed to stringify nodes for workflow "${name}". Saving as empty array.`, e);
            nodesJson = "[]";
        }

        try {
            const edgesToSave = Array.isArray(edges) ? edges : [];
            edgesJson = JSON.stringify(edgesToSave);
        } catch (e) {
            console.error(`Failed to stringify edges for workflow "${name}". Saving as empty array.`, e);
            edgesJson = "[]";
        }

        if (typeof nodesJson !== 'string') {
            console.error(`Node data for "${name}" resulted in a non-string value after stringify. Saving as empty array.`);
            nodesJson = "[]";
        }
        if (typeof edgesJson !== 'string') {
            console.error(`Edge data for "${name}" resulted in a non-string value after stringify. Saving as empty array.`);
            edgesJson = "[]";
        }

        try {
            this.db.run("INSERT OR REPLACE INTO workflows (name, nodes, edges, lastSaved) VALUES (?, ?, ?, ?)", [
                name,
                nodesJson,
                edgesJson,
                new Date().toISOString()
            ]);
            await this.persistDatabase();
        } catch (e) {
            console.error(`Failed to save workflow "${name}" to SQL database:`, e);
        }
    }

    public async loadWorkflow(name: string): Promise<SavedWorkflow | null> {
        if (!this.db) return null;
        let stmt;
        try {
            stmt = this.db.prepare("SELECT * FROM workflows WHERE name = :name");
            const result = stmt.getAsObject({ ':name': name });
            if (Object.keys(result).length === 0) return null;

            const nodesStr = result.nodes as string | null;
            const edgesStr = result.edges as string | null;

            if (typeof nodesStr !== 'string' || typeof edgesStr !== 'string') {
                console.error(`Corrupted workflow data for "${name}": nodes or edges are not valid strings. Deleting entry.`);
                await this.deleteWorkflow(name);
                return null;
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
            await this.deleteWorkflow(name);
            return null;
        } finally {
            stmt?.free();
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
                        const nodesStr = row[1] as string | null;
                        const edgesStr = row[2] as string | null;
                        if (typeof nodesStr !== 'string' || typeof edgesStr !== 'string') {
                           console.error(`Skipping corrupted workflow "${name}": data is not a valid string.`);
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
        try {
            this.db.run("DELETE FROM workflows WHERE name = ?", [name]);
            await this.persistDatabase();
        } catch (e) {
            console.error(`Failed to delete workflow "${name}":`, e);
        }
    }

    public async saveCustomAgents(agents: DynamicNodeConfig[]): Promise<void> {
        if (!this.db) return;
        let stmt;
        const agentsToSave = Array.isArray(agents) ? agents : [];

        try {
            this.db.run("BEGIN TRANSACTION;");
            this.db.run("DELETE FROM custom_agents");
            stmt = this.db.prepare("INSERT INTO custom_agents (name, config) VALUES (?, ?)");
            
            agentsToSave.forEach(agent => {
                try {
                    const agentJson = JSON.stringify(agent);
                    if (typeof agentJson === 'string') {
                        stmt.run([agent.name, agentJson]);
                    } else {
                        console.error(`Failed to save custom agent "${agent.name}": stringify result was not a string.`);
                    }
                } catch (e) {
                    console.error(`Failed to stringify custom agent "${agent.name}". Skipping.`, e);
                }
            });

            this.db.run("COMMIT;");
            await this.persistDatabase();
        } catch(e) {
            console.error("Failed to save custom agents:", e);
            if(this.db) this.db.run("ROLLBACK;");
        } finally {
            stmt?.free();
        }
    }

    public async loadCustomAgents(): Promise<DynamicNodeConfig[]> {
        if (!this.db) return [];
        const agents: DynamicNodeConfig[] = [];
        try {
            const results = this.db.exec("SELECT config FROM custom_agents");
            if (results[0]) {
                for (const row of results[0].values) {
                    try {
                        const configStr = row[0] as string | null;
                        if(typeof configStr !== 'string') {
                            console.error(`Skipping corrupted custom agent: data is not a valid string.`);
                            continue;
                        }
                        const agentConfig = JSON.parse(configStr);
                        if(agentConfig && typeof agentConfig === 'object' && agentConfig.name) {
                            agents.push(agentConfig);
                        } else {
                            console.error(`Skipping corrupted custom agent: parsed data is not a valid agent object.`);
                        }
                    } catch (e) {
                        console.error(`Skipping corrupted custom agent due to parsing error:`, e);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to execute query to load custom agents:", e);
        }
        return agents;
    }

    public async saveBugReport(bug: BugReport): Promise<void> {
        if (!this.db) return;
        try {
            this.db.run("INSERT OR REPLACE INTO bug_reports (id, report) VALUES (?, ?)", [
                bug.id,
                JSON.stringify(bug)
            ]);
            await this.persistDatabase();
        } catch (e) {
            console.error(`Failed to save bug report "${bug.id}":`, e);
        }
    }

    public async loadBugReports(): Promise<BugReport[]> {
        if (!this.db) return [];
        const reports: BugReport[] = [];
        try {
            const results = this.db.exec("SELECT report FROM bug_reports");
            if (results[0]) {
                for (const row of results[0].values) {
                    try {
                        const reportStr = row[0] as string | null;
                        if (typeof reportStr === 'string') {
                            reports.push(JSON.parse(reportStr));
                        }
                    } catch (e) {
                         console.error("Skipping corrupted bug report due to parsing error:", e);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load bug reports:", e);
        }
        return reports;
    }

    public async logEvent(agent: string, event: string, details: Record<string, any>): Promise<void> {
        if (!this.db) return;
        try {
            this.db.run("INSERT INTO event_logs (agent, event, timestamp, details) VALUES (?, ?, ?, ?)", [
                agent,
                event,
                new Date().toISOString(),
                JSON.stringify(details)
            ]);
            await this.persistDatabase();
        } catch(e) {
            console.error(`Failed to log event for agent "${agent}":`, e);
        }
    }

    public async getEventLogs(): Promise<EventLog[]> {
        if (!this.db) return [];
        const logs: EventLog[] = [];
        try {
            const results = this.db.exec("SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT 100");
             if (results[0]) {
                for (const row of results[0].values) {
                    try {
                        logs.push({
                            id: row[0] as number,
                            agent: row[1] as string,
                            event: row[2] as string,
                            timestamp: row[3] as string,
                            details: JSON.parse(row[4] as string)
                        });
                    } catch (e) {
                        console.error("Skipping corrupted event log due to parsing error:", e);
                    }
                }
            }
        } catch(e) {
            console.error("Failed to load event logs:", e);
        }
        return logs;
    }
}

export const databaseService = new DatabaseService();