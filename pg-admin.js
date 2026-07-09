const { Client } = require('pg');
const argon2 = require('argon2');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:password@localhost:5435/mydb?schema=public"
  });
  await client.connect();
  
  const res = await client.query("SELECT * FROM users WHERE 'SUPER_ADMIN' = ANY(roles);");
  if (res.rows.length > 0) {
    console.log("Super Admin Email: " + res.rows[0].email);
    console.log("Found existing super admin.");
  } else {
    console.log("Creating new SUPER_ADMIN...");
    const hash = await argon2.hash('password123');
    // Using string interpolation securely since this is an admin script
    const id = require('crypto').randomUUID();
    await client.query(`
      INSERT INTO users (id, email, password, name, roles, updated_at) 
      VALUES ($1, $2, $3, $4, ARRAY['SUPER_ADMIN'::"Role"], CURRENT_TIMESTAMP)
    `, [id, 'superadmin@example.com', hash, 'Super Admin']);
    
    console.log("Super Admin created:");
    console.log("Email: superadmin@example.com");
    console.log("Password: password123");
  }
  
  await client.end();
}

main().catch(console.error);
