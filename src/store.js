import pg from 'pg';import crypto from 'node:crypto';
let pool;
export function db(){if(!pool){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL wajib');pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false},max:5});}return pool;}
export async function init(){await db().query(`CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT NOT NULL);CREATE TABLE IF NOT EXISTS audits(id BIGSERIAL PRIMARY KEY,created_at TIMESTAMPTZ DEFAULT now(),user_id TEXT NOT NULL,kind TEXT NOT NULL,report JSONB NOT NULL);CREATE TABLE IF NOT EXISTS telegram_updates(update_id BIGINT PRIMARY KEY,created_at TIMESTAMPTZ DEFAULT now());`)}
const key=()=>crypto.scryptSync(process.env.ENCRYPTION_KEY||'', 'omtogel-audit-v1',32);
export function encrypt(s){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv);const ct=Buffer.concat([c.update(s,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),ct]).toString('base64')}
export function decrypt(s){const b=Buffer.from(s,'base64'),c=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8')}
export async function setting(k){const r=await db().query('SELECT v FROM settings WHERE k=$1',[k]);return r.rows[0]?.v||null}
export async function save(k,v){await db().query('INSERT INTO settings(k,v) VALUES($1,$2) ON CONFLICT(k) DO UPDATE SET v=EXCLUDED.v',[k,v])}
export async function audit(user,kind,report){await db().query('INSERT INTO audits(user_id,kind,report) VALUES($1,$2,$3)',[user,kind,JSON.stringify(report)])}
export async function logs(){return (await db().query('SELECT id,created_at,user_id,kind,report->>\'status\' AS status FROM audits ORDER BY id DESC LIMIT 50')).rows}
export async function claimUpdate(id){return (await db().query('INSERT INTO telegram_updates(update_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING update_id',[id])).rowCount>0}
