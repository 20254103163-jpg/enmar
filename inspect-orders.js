require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: true
    }
});

async function main() {
    let conn;

    try {
        conn = await pool.getConnection();

        console.log('\n✅ Connected to TiDB Cloud');
        console.log('Database:', process.env.DB_NAME);

        // 1. List all tables
        const [tables] = await conn.query('SHOW TABLES');

        console.log('\n================ TABLES ================\n');

        for (const row of tables) {
            console.log(Object.values(row)[0]);
        }

        // 2. Show structure of every table
        console.log('\n\n============= TABLE STRUCTURES =============\n');

        for (const row of tables) {
            const tableName = Object.values(row)[0];

            console.log(`\n----- ${tableName} -----`);

            const [columns] = await conn.query(
                `DESCRIBE \`${tableName}\``
            );

            console.table(columns);
        }

    } catch (error) {
        console.error('\n❌ DATABASE ERROR');
        console.error(error.message);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

main();