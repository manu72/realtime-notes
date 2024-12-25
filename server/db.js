import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'transcripts.db');

console.log('Database path:', dbPath);

// Database setup
export async function initializeDatabase() {
    console.log('Initializing database...');
    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        console.log('Creating transcripts table if not exists...');
        await db.exec(`
            CREATE TABLE IF NOT EXISTS transcripts (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            );
        `);

        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Get database instance
let dbInstance = null;
export async function getDb() {
    if (!dbInstance) {
        dbInstance = await initializeDatabase();
    }
    return dbInstance;
}