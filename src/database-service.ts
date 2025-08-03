import { Database } from 'bun:sqlite';
import config from './config-server';

class DatabaseService {
    private db: Database;
    private readonly dbPath = config.sqlite_path;

    constructor() {
        this.db = new Database(this.dbPath);
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        // Create users table if it doesn't exist
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                spark_address TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create index on username if it doesn't exist
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_username 
            ON users(username)
        `);

        // Create index on spark_address if it doesn't exist
        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_spark_address 
            ON users(spark_address)
        `);

        console.log('Database initialized successfully');
    }

    /**
     * Lookup spark address by username
     * @param username - The username to lookup
     * @returns The spark address if found, null otherwise
     */
    public getSparkAddressByUsername(username: string): string | null {
        const stmt = this.db.prepare('SELECT spark_address FROM users WHERE username = ?');
        const result = stmt.get(username) as { spark_address: string } | undefined;

        return result ? result.spark_address : null;
    }

    /**
     * Lookup username by spark address
     * @param sparkAddress - The spark address to lookup
     * @returns The username if found, null otherwise
     */
    public getUsernameBySparkAddress(sparkAddress: string): string | null {
        const stmt = this.db.prepare('SELECT username FROM users WHERE spark_address = ?');
        const result = stmt.get(sparkAddress) as { username: string } | undefined;

        return result ? result.username : null;
    }

    /**
     * Insert or update a username-spark address pair
     * @param username - The username
     * @param sparkAddress - The spark address
     * @returns true if successful, false otherwise
     */
    public upsertUser(username: string, sparkAddress: string): boolean {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO users (username, spark_address, updated_at) 
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);

            stmt.run(username, sparkAddress);
            return true;
        } catch (error) {
            console.error('Error upserting user:', error);
            return false;
        }
    }

    /**
     * Close the database connection
     */
    public close(): void {
        this.db.close();
    }
}

// Export a singleton instance
export const databaseService = new DatabaseService();

// Export the class for testing purposes
export { DatabaseService };
