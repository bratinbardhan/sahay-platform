/**
 * MockDatabase — in-memory SQL-compatible database for web preview.
 *
 * expo-sqlite web driver (wa-sqlite + OPFS) cannot run inside Metro web preview.
 * This mock implements the subset of expo-sqlite surface used by the app.
 */

type SqlValue = string | number | boolean | null;
type Row = Record<string, SqlValue>;

interface TableSchema { columns: string[]; rows: Row[]; }

function parseSqlLiteral(raw: string): SqlValue {
  const v = raw.trim();
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v.toUpperCase() === 'NULL') return null;
  if (v.toUpperCase() === 'TRUE') return 1;
  if (v.toUpperCase() === 'FALSE') return 0;
  const num = Number(v);
  if (!Number.isNaN(num) && v !== '') return num;
  return v;
}

function literalize(value: SqlValue): string {
  if (value === null) return 'NULL';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return String(value);
}

interface Condition { column: string; op: string; value: SqlValue; }

function parseWhere(sql: string): Condition[] {
  const match = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/is);
  if (!match) return [];
  return match[1].trim().split(/\s+AND\s+/i).map(seg => {
    const parts = seg.trim().match(/^(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/);
    if (!parts) return { column: '', op: '=', value: null };
    return { column: parts[1], op: parts[2], value: parseSqlLiteral(parts[3]) };
  });
}

function evalCondition(row: Row, cond: Condition): boolean {
  if (!cond.column) return true;
  const l = row[cond.column];
  const r = cond.value;
  switch (cond.op) {
    case '=': return l === r;
    case '!=': case '<>': return l !== r;
    case '>': return (l as number) > (r as number);
    case '<': return (l as number) < (r as number);
    case '>=': return (l as number) >= (r as number);
    case '<=': return (l as number) <= (r as number);
    default: return false;
  }
}

function matchesWhere(row: Row, sql: string): boolean {
  return parseWhere(sql).every(c => evalCondition(row, c));
}

function evalSet(expr: string, row: Row): SqlValue {
  // Handle simple arithmetic: "col + N", "col - N", "col + ? (already substituted)"
  const addMatch = expr.match(/^(\w+)\s*\+\s*(\d+)$/);
  if (addMatch) return (Number(row[addMatch[1]]) || 0) + Number(addMatch[2]);
  const subMatch = expr.match(/^(\w+)\s*-\s*(\d+)$/);
  if (subMatch) return (Number(row[subMatch[1]]) || 0) - Number(subMatch[2]);
  // Handle plain literal
  const lit = parseSqlLiteral(expr);
  if (lit !== expr) return lit;
  // Handle column reference
  if (expr in row) return row[expr];
  return null;
}


interface SelectColumn { kind: 'star' | 'column' | 'aggregate'; expr: string; alias: string; aggFunc?: string; aggArg?: string; }

function parseSelectColumns(s: string): SelectColumn[] {
  if (s.trim() === '*') return [{ kind: 'star', expr: '*', alias: '' }];
  return s.split(',').map(raw => {
    const seg = raw.trim();
    const asM = seg.match(/^(.+?)\s+AS\s+(\w+)$/i);
    const expr = asM ? asM[1].trim() : seg;
    const alias = asM ? asM[2] : '';
    const aggM = expr.match(/^(\w+)\((.+)\)$/i);
    if (aggM) return { kind: 'aggregate', expr, alias: alias || aggM[1].toLowerCase(), aggFunc: aggM[1].toUpperCase(), aggArg: aggM[2].trim() };
    return { kind: 'column', expr, alias: alias || expr };
  });
}

function resolveRow(row: Row, cols: SelectColumn[]): Row {
  const out: Row = {};
  for (const c of cols) {
    if (c.kind === 'star') Object.assign(out, row);
    else if (c.kind === 'column') out[c.alias] = row[c.expr];
  }
  return out;
}

interface OrderSpec { column: string; desc: boolean; }
function parseOrderBy(sql: string): OrderSpec[] {
  const m = sql.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|$)/is);
  if (!m) return [];
  return m[1].split(',').map(p => {
    const t = p.trim().split(/\s+/);
    return { column: t[0], desc: (t[1] || '').toUpperCase() === 'DESC' };
  });
}

export class MockDatabase {
  private tables: Map<string, TableSchema> = new Map();

  async execAsync(sql: string): Promise<void> {
    for (const stmt of sql.split(';').map(s => s.trim()).filter(s => s.length > 0)) this.runStatement(stmt);
  }

  async runAsync(sql: string, ...params: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }> {
    return this.runWrite(this.substituteParams(sql, params));
  }

  async getAllAsync<T = Row>(sql: string, ...params: SqlValue[]): Promise<T[]> {
    return this.runSelect(this.substituteParams(sql, params)) as T[];
  }

  async getFirstAsync<T = Row>(sql: string, ...params: SqlValue[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows.length > 0 ? rows[0] : null;
  }

  async withTransactionAsync(cb: () => Promise<void>): Promise<void> { await cb(); }
  async closeAsync(): Promise<void> { this.tables.clear(); }

  private substituteParams(sql: string, params: SqlValue[]): string {
    let i = 0;
    return sql.replace(/\?/g, () => literalize(params[i++] ?? null));
  }

  private runStatement(sql: string): void {
    const u = sql.toUpperCase();
    if (u.startsWith('CREATE TABLE')) this.createTable(sql);
    else if (u.startsWith('CREATE INDEX') || u.startsWith('PRAGMA')) { /* no-op */ }
    else if (u.startsWith('INSERT') || u.startsWith('UPDATE') || u.startsWith('DELETE')) this.runWrite(sql);
  }

  private createTable(sql: string): void {
    const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\((.+)\)/is);
    if (!m) return;
    const name = m[1];
    if (this.tables.has(name)) return;
    const cols = m[2].split(',').map(c => c.trim().split(/\s+/)[0]).filter(n => n && !n.toUpperCase().startsWith('FOREIGN') && !n.toUpperCase().startsWith('PRIMARY') && !n.toUpperCase().startsWith('CHECK') && !n.toUpperCase().startsWith('UNIQUE') && !n.toUpperCase().startsWith('CONSTRAINT'));
    this.tables.set(name, { columns: cols, rows: [] });
  }

  private runWrite(sql: string): { changes: number; lastInsertRowId: number } {
    const u = sql.toUpperCase();
    if (u.startsWith('INSERT')) return this.insert(sql);
    if (u.startsWith('UPDATE')) return this.update(sql);
    if (u.startsWith('DELETE')) return this.remove(sql);
    return { changes: 0, lastInsertRowId: 0 };
  }

  private insert(sql: string): { changes: number; lastInsertRowId: number } {
    const m = sql.match(/INSERT\s+(?:\w+\s+)*INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)/is);
    if (!m) return { changes: 0, lastInsertRowId: 0 };
    const t = this.tables.get(m[1]); if (!t) return { changes: 0, lastInsertRowId: 0 };
    const cols = m[2].split(',').map(c => c.trim());
    const vals = m[3].split(',').map(v => parseSqlLiteral(v));
    const row: Row = {}; for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i] ?? null;
    t.rows.push(row);
    return { changes: 1, lastInsertRowId: t.rows.length };
  }

  private update(sql: string): { changes: number; lastInsertRowId: number } {
    const m = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+.+)?$/is);
    if (!m) return { changes: 0, lastInsertRowId: 0 };
    const t = this.tables.get(m[1]); if (!t) return { changes: 0, lastInsertRowId: 0 };
    const pairs = m[2].split(',').map(p => { const ei = p.indexOf('='); return { col: p.slice(0, ei).trim(), expr: p.slice(ei + 1).trim() }; });
    let ch = 0;
    for (const row of t.rows) { if (!matchesWhere(row, sql)) continue; for (const { col, expr } of pairs) row[col] = evalSet(expr, row); ch++; }
    return { changes: ch, lastInsertRowId: 0 };
  }

  private remove(sql: string): { changes: number; lastInsertRowId: number } {
    const m = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+.+)?$/is);
    if (!m) return { changes: 0, lastInsertRowId: 0 };
    const t = this.tables.get(m[1]); if (!t) return { changes: 0, lastInsertRowId: 0 };
    const before = t.rows.length;
    t.rows = t.rows.filter(r => !matchesWhere(r, sql));
    return { changes: before - t.rows.length, lastInsertRowId: 0 };
  }

  private runSelect(sql: string): Row[] {
    const m = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+.+?)?(?:\s+ORDER\s+BY\s+.+?)?(?:\s+LIMIT\s+\d+)?$/is);
    if (!m) return [];
    const t = this.tables.get(m[2]); if (!t) return [];
    const cols = parseSelectColumns(m[1]);
    const hasAgg = cols.some(c => c.kind === 'aggregate');
    let rows = t.rows.filter(r => matchesWhere(r, sql));
    const ord = parseOrderBy(sql);
    if (ord.length > 0) {
      rows = [...rows].sort((a, b) => {
        for (const s of ord) {
          const av = a[s.column] as number | string;
          const bv = b[s.column] as number | string;
          if (av < bv) return s.desc ? 1 : -1;
          if (av > bv) return s.desc ? -1 : 1;
        }
        return 0;
      });
    }
    const lm = sql.match(/LIMIT\s+(\d+)/i);
    if (lm) rows = rows.slice(0, parseInt(lm[1], 10));
    if (hasAgg) {
      const res: Row = {};
      for (const c of cols) if (c.kind === 'aggregate') res[c.alias] = this.computeAgg(c, t.rows, sql);
      return [res];
    }
    return rows.map(r => resolveRow(r, cols));
  }

  private computeAgg(col: SelectColumn, allRows: Row[], sql: string): SqlValue {
    const fr = allRows.filter(r => matchesWhere(r, sql));
    if (col.aggFunc === 'COUNT') return fr.length;
    if (col.aggFunc === 'SUM') return fr.reduce((a, r) => a + (Number(r[col.aggArg!]) || 0), 0);
    if (col.aggFunc === 'COALESCE') {
      const im = col.aggArg!.match(/^(\w+)\((\*|\w+)\)(?:\s*,\s*(.+))?$/i);
      if (im) {
        const f = im[1].toUpperCase(), arg = im[2], fb = im[3] ? parseSqlLiteral(im[3]) : null;
        let v: SqlValue;
        if (f === 'SUM') v = fr.reduce((a, r) => a + (Number(r[arg]) || 0), 0);
        else if (f === 'COUNT') v = fr.length;
        else v = null;
        return v ?? fb;
      }
    }
    return null;
  }
}

export default MockDatabase;
