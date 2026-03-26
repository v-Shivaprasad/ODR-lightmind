import { open } from 'react-native-quick-sqlite';

export const db = open({ name: 'ragapp.db' });

export const initDB = () => {
  db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      chunk_text TEXT NOT NULL,
      embedding TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT,
      created_at INTEGER NOT NULL
    );
  `);
};

export const insertDocument = (name: string, type: string, size: number) => {
  const result = db.execute(
    'INSERT INTO documents (name, type, size, created_at) VALUES (?, ?, ?, ?)',
    [name, type, size, Date.now()]
  );
  return result.insertId;
};

export const insertChunk = (documentId: number, chunkText: string, embedding: number[]) => {
  db.execute(
    'INSERT INTO chunks (document_id, chunk_text, embedding) VALUES (?, ?, ?)',
    [documentId, chunkText, JSON.stringify(embedding)]
  );
};

export const getAllChunks = (): { id: number; chunk_text: string; embedding: number[] }[] => {
  const result = db.execute('SELECT id, chunk_text, embedding FROM chunks');
  return (result.rows?._array || []).map((row: any) => ({
    id: row.id,
    chunk_text: row.chunk_text,
    embedding: JSON.parse(row.embedding),
  }));
};

export const getAllDocuments = () => {
  const result = db.execute('SELECT * FROM documents ORDER BY created_at DESC');
  return result.rows?._array || [];
};

export const deleteDocument = (id: number) => {
  db.execute('DELETE FROM chunks WHERE document_id = ?', [id]);
  db.execute('DELETE FROM documents WHERE id = ?', [id]);
};

export const getStats = () => {
  const docs = db.execute('SELECT COUNT(*) as count FROM documents').rows?._array[0].count || 0;
  const chunks = db.execute('SELECT COUNT(*) as count FROM chunks').rows?._array[0].count || 0;
  return { docs, chunks };
};

export const saveMessage = (role: string, content: string, sources?: string) => {
  db.execute(
    'INSERT INTO messages (role, content, sources, created_at) VALUES (?, ?, ?, ?)',
    [role, content, sources || null, Date.now()]
  );
};

export const getMessages = () => {
  const result = db.execute('SELECT * FROM messages ORDER BY created_at ASC');
  return result.rows?._array || [];
};

export const clearAllData = () => {
  db.execute('DELETE FROM messages');
  db.execute('DELETE FROM chunks');
  db.execute('DELETE FROM documents');
};