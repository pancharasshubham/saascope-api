import bcrypt from "bcrypt";
import pool from "../config/db";

const SALT_ROUNDS = 10;

type RegisterInput = {
  email: string;
  password: string;
};

export async function registerUser(
  input: RegisterInput
) {
  const email = input.email.trim().toLowerCase();

  // ---------- Existing user check ----------
  const existingUser = await pool.query(
    `
    SELECT id
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  // ---------- Password hashing ----------
  const passwordHash = await bcrypt.hash(
    input.password,
    SALT_ROUNDS
  );

  // ---------- Create user ----------
  const result = await pool.query(
    `
    INSERT INTO users (
      email,
      password_hash
    )
    VALUES ($1, $2)
    RETURNING id, email, created_at
    `,
    [email, passwordHash]
  );

  return result.rows[0];
}