import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
console.log(
  "Database connected"
);

export default pool;