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

export async function loginUser(
  email: string,
  password: string
) {

  const normalizedEmail =
    email.trim().toLowerCase();

  // ---------- Find user ----------
  const result = await pool.query(
    `
    SELECT id, email, password_hash
    FROM users
    WHERE email = $1
    `,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user = result.rows[0];

  // ---------- Verify password ----------
  const passwordMatch =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!passwordMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return {
    id: user.id,
    email: user.email,
  };
}