import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getPost(id) {
  const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return rows[0];
}

export async function searchPosts(q) {
  const { rows } = await pool.query('SELECT * FROM posts WHERE title ILIKE $1', [`%${q}%`]);
  return rows;
}
