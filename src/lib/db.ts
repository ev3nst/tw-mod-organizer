import Database from '@tauri-apps/plugin-sql';

const sqliteDbName = 'sqlite:modulus.db';
class DbWrapper {
	db!: Database;
	async initialize() {
		if (!this.db) {
			this.db = await Database.load(sqliteDbName);
			await this.db.execute('PRAGMA journal_mode = WAL;');
		}
	}
}

export const dbWrapper = new DbWrapper();
