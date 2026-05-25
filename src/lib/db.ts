import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

interface Tables {
  users: any[];
  analyses: any[];
}

function loadData(): Tables {
  const file = path.join(DATA_DIR, 'db.json');
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return { users: [], analyses: [] };
}

function saveData(data: Tables) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(DATA_DIR, 'db.json'), JSON.stringify(data, null, 2));
}

function ensureTables(data: Tables): Tables {
  if (!data.users) data.users = [];
  if (!data.analyses) data.analyses = [];
  return data;
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const data = ensureTables(loadData());

  // SQL-like query parser for our simple use cases
  const selectMatch = sql.match(
    /SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+LIMIT\s+(\d+))?$/i
  );

  if (!selectMatch) return [];

  const [, columnsStr, table, whereClause, orderStr, limitStr] = selectMatch;
  const columns = columnsStr.split(',').map((c) => c.trim().replace(/^.*\./, ''));

  let rows = data[table as keyof Tables] || [];

  // WHERE clause
  if (whereClause) {
    const match = whereClause.match(/(\w+)\s*=\s*\?/i);
    if (match) {
      const field = match[1];
      const value = params[0];
      rows = rows.filter((row: any) => {
        if (value === undefined) return row[field] === null;
        return String(row[field]) === String(value);
      });
    }
  }

  // ORDER BY
  if (orderStr) {
    const parts = orderStr.trim().split(/\s+/);
    const orderField = parts[0];
    const orderDir = parts[1]?.toUpperCase() === 'ASC' ? 1 : -1;
    rows = [...rows].sort((a: any, b: any) => {
      if (a[orderField] < b[orderField]) return -1 * orderDir;
      if (a[orderField] > b[orderField]) return 1 * orderDir;
      return 0;
    });
  }

  // LIMIT
  if (limitStr) {
    rows = rows.slice(0, parseInt(limitStr));
  }

  // Select specific columns
  if (columnsStr.trim() !== '*') {
    rows = rows.map((row: any) => {
      const obj: any = {};
      columns.forEach((col) => {
        obj[col] = row[col];
      });
      return obj;
    });
  }

  return rows;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  const data = ensureTables(loadData());

  // INSERT
  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
  if (insertMatch) {
    const [, table, colsStr, valsStr] = insertMatch;
    const cols = colsStr.split(',').map((c) => c.trim());
    const row: any = {};

    cols.forEach((col, i) => {
      row[col] = params[i] !== undefined ? params[i] : valsStr.split(',').map((v) => v.trim().replace(/['"]/g, ''))[i];
    });

    // Default values for users table
    if (table === 'users') {
      if (row.plan === undefined) row.plan = 'free';
      if (row.analyses_used === undefined) row.analyses_used = 0;
      if (row.analyses_limit === undefined) row.analyses_limit = 3;
      if (row.subscription_status === undefined) row.subscription_status = 'inactive';
    }

    // Check UNIQUE constraints
    if (table === 'users' && row.email) {
      const existing = data.users.find((u: any) => u.email === row.email);
      if (existing) throw new Error('UNIQUE constraint failed: users.email');
    }

    data[table as keyof Tables].push(row);
    saveData(data);
    return;
  }

  // UPDATE
  const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
  if (updateMatch) {
    const [, table, setStr, whereStr] = updateMatch;
    const setPairs = setStr.split(',').map((s) => s.trim());
    const whereMatch = whereStr.match(/(\w+)\s*=\s*\?/i);

    const setObj: any = {};
    setPairs.forEach((pair, i) => {
      const [col] = pair.split('=').map((s) => s.trim());
      setObj[col] = params[i];
    });

    const rows = data[table as keyof Tables];
    const whereField = whereMatch ? whereMatch[1] : null;
    const whereValue = whereMatch ? params[setPairs.length] : null;

    let updated = 0;
    rows.forEach((row: any) => {
      if (!whereField || String(row[whereField]) === String(whereValue)) {
        Object.assign(row, setObj);
        updated++;
      }
    });

    if (updated > 0) saveData(data);
    return;
  }

  // DELETE
  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
  if (deleteMatch) {
    const [, table, whereStr] = deleteMatch;
    const whereMatch = whereStr ? whereStr.match(/(\w+)\s*=\s*\?/i) : null;

    if (whereMatch) {
      const whereField = whereMatch[1];
      const whereValue = params[0];
      data[table as keyof Tables] = data[table as keyof Tables].filter(
        (row: any) => String(row[whereField]) !== String(whereValue)
      );
    }

    saveData(data);
    return;
  }
}

export { saveData as saveDb };
