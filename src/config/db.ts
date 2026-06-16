import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
pool
  .query("SELECT 1")
  .then(() => console.log("Database connected"))
  .catch((err) => {
    console.error("Database connection failed");
    console.error(err);
  });
console.log(
  "DATABASE URL:",
  process.env.DATABASE_URL?.replace(/:\/\/.*@/, "://***@"
  )
);

import dns from "dns";

dns.lookup(
  "aws-1-ap-south-1.pooler.supabase.com",
  { all: true },
  (err, addresses) => {
    console.log("DNS TEST");
    console.log(err);
    console.log(addresses);
  }
);

export default pool;