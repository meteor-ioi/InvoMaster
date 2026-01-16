import sqlite3
import json
import os
import datetime
from typing import List, Optional, Dict

DB_PATH = "data/metadata.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Templates table
    # mode: 'auto' | 'custom'
    # we store the Full JSON path or just filename for the detail definition
    c.execute('''
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            mode TEXT NOT NULL,
            name TEXT NOT NULL,
            fingerprint TEXT,
            fingerprint_text TEXT,
            tags TEXT,
            filename TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Indexes
    c.execute('CREATE INDEX IF NOT EXISTS idx_mode ON templates (mode)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_fingerprint ON templates (fingerprint)')
    
    conn.commit()
    conn.close()

class Database:
    def __init__(self):
        if not os.path.exists(DB_PATH):
            init_db()
            
    def save_template(self, 
                      t_id: str, 
                      mode: str, 
                      name: str, 
                      filename: str,
                      fingerprint: Optional[str] = None, 
                      fingerprint_text: Optional[str] = None,
                      tags: List[str] = None):
        if tags is None:
            tags = []
            
        conn = get_db_connection()
        c = conn.cursor()
        
        # Upsert
        c.execute('''
            INSERT OR REPLACE INTO templates (id, mode, name, fingerprint, fingerprint_text, tags, filename, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (t_id, mode, name, fingerprint, fingerprint_text, json.dumps(tags), filename))
        
        conn.commit()
        conn.close()

    def get_template(self, t_id: str):
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('SELECT * FROM templates WHERE id = ?', (t_id,))
        row = c.fetchone()
        conn.close()
        if row:
            d = dict(row)
            d['tags'] = json.loads(d['tags'] or '[]')
            
            # Load regions from JSON file if it exists
            if d.get('filename') and os.path.exists(d['filename']):
                try:
                    with open(d['filename'], 'r', encoding='utf-8') as f:
                        template_data = json.load(f)
                        d['regions'] = template_data.get('regions', [])
                except Exception as e:
                    print(f"Error loading regions from {d['filename']}: {e}")
                    d['regions'] = []
            else:
                d['regions'] = []
                
            return d
        return None

    def list_templates(self, mode: Optional[str] = None, tag: Optional[str] = None):
        conn = get_db_connection()
        c = conn.cursor()
        
        query = "SELECT * FROM templates WHERE 1=1"
        params = []
        
        if mode:
            query += " AND mode = ?"
            params.append(mode)
            
        # SQLite doesn't have great JSON support in older versions, 
        # but for list we can filter in python or use simple LIKE if needed.
        # Here we fetch and filter for simplicity if tag is provided
        
        c.execute(query + " ORDER BY updated_at DESC", params)
        rows = c.fetchall()
        conn.close()
        
        results = []
        for r in rows:
            d = dict(r)
            d['tags'] = json.loads(d['tags'] or '[]')
            
            # Load regions from JSON file if it exists
            if d.get('filename') and os.path.exists(d['filename']):
                try:
                    with open(d['filename'], 'r', encoding='utf-8') as f:
                        template_data = json.load(f)
                        d['regions'] = template_data.get('regions', [])
                except Exception as e:
                    # Non-critical error, just return empty regions
                    d['regions'] = []
            else:
                d['regions'] = []
                
            results.append(d)
        
        if tag:
            filtered = [r for r in results if tag in r['tags']]
            return filtered
            
        return results

    def get_all_auto_templates(self):
        """
        Get all auto templates for fuzzy matching.
        """
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT * FROM templates WHERE mode = 'auto'")
        rows = c.fetchall()
        conn.close()
        results = []
        for r in rows:
            d = dict(r)
            d['tags'] = json.loads(d['tags'] or '[]')
            results.append(d)
        return results

    def delete_template(self, t_id: str):
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM templates WHERE id = ?", (t_id,))
        conn.commit()
        conn.close()

# Global instance
db = Database()
