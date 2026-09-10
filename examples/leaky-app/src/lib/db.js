import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function getPost(id) {
  const { rows } = await pool.query(`SELECT * FROM posts WHERE id = ${id}`);
  return rows[0];
}

export async function searchPosts(q) {
  const sql = "SELECT * FROM posts WHERE title LIKE '%" + q + "%'";
  const { rows } = await pool.query(sql);
  return rows;
}
