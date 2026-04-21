const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        "id"       TEXT PRIMARY KEY,
        "name"     TEXT NOT NULL,
        "email"    TEXT UNIQUE NOT NULL,
        "password" TEXT NOT NULL,
        "role"     TEXT NOT NULL CHECK ("role" IN ('admin', 'usuario')),
        "initials" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS records (
        "id"               TEXT PRIMARY KEY,
        "createdAt"        TIMESTAMPTZ NOT NULL,
        "usuario"          TEXT NOT NULL,
        "dataSolicitacao"  TEXT,
        "associacao"       TEXT,
        "status"           TEXT,
        "associado"        TEXT,
        "consultor"        TEXT,
        "cpfCnpj"          TEXT,
        "placaChassi"      TEXT,
        "cota"             TEXT,
        "tipoVeiculo"      TEXT,
        "rastreador"       TEXT,
        "placaTop"         TEXT,
        "motivoCategoria"  TEXT,
        "motivoDetalhe"    TEXT,
        "boleto"           TEXT,
        "solicitacao"      TEXT
      )
    `);

    const usersPath = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersPath)) {
      const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
      for (const u of users) {
        await client.query(
          `INSERT INTO users ("id","name","email","password","role","initials")
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("id") DO NOTHING`,
          [u.id, u.name, u.email, u.password, u.role, u.initials]
        );
      }
      console.log(`✓ ${users.length} usuários migrados`);
    }

    const dbPath = path.join(__dirname, 'database.json');
    if (fs.existsSync(dbPath)) {
      const records = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      for (const r of records) {
        await client.query(
          `INSERT INTO records
            ("id","createdAt","usuario","dataSolicitacao","associacao","status","associado",
             "consultor","cpfCnpj","placaChassi","cota","tipoVeiculo","rastreador","placaTop",
             "motivoCategoria","motivoDetalhe","boleto","solicitacao")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT ("id") DO NOTHING`,
          [
            r.id,
            r.createdAt,
            r.usuario,
            r.dataSolicitacao  || null,
            r.associacao       || null,
            r.status           || null,
            r.associado        || null,
            r.consultor        || null,
            r.cpfCnpj          || null,
            r.placaChassi      || null,
            r.cota != null ? String(r.cota) : null,
            r.tipoVeiculo      || null,
            r.rastreador       || null,
            r.placaTop         || null,
            r.motivoCategoria  || null,
            r.motivoDetalhe    || null,
            r.boleto           || null,
            r.solicitacao      || null,
          ]
        );
      }
      console.log(`✓ ${records.length} registros migrados`);
    }

    await client.query('COMMIT');
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migração falhou:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
