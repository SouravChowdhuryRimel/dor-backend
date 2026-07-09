const { Client } = require('pg');
const argon2 = require('argon2');
const crypto = require('crypto');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:password@localhost:5435/mydb?schema=public"
  });
  
  try {
    await client.connect();
    
    // Check if SUPER_ADMIN exists
    const res = await client.query("SELECT * FROM users WHERE 'SUPER_ADMIN' = ANY(roles);");
    if (res.rows.length > 0) {
      console.log("Super Admin Email: " + res.rows[0].email);
      console.log("Found existing super admin.");
    } else {
      console.log("Creating new SUPER_ADMIN...");
      
      const adminEmail = 'superadmin@example.com';
      const plainPassword = 'password123';
      
      const hash = await argon2.hash(plainPassword);
      const adminId = crypto.randomUUID();
      
      await client.query(`
        INSERT INTO users (id, email, password, name, roles, "updatedAt") 
        VALUES ($1, $2, $3, $4, ARRAY['SUPER_ADMIN'::"Role"], CURRENT_TIMESTAMP)
      `, [adminId, adminEmail, hash, 'Super Admin']);
      
      console.log("Super Admin created successfully:");
      console.log("Email: superadmin@example.com");
      console.log("Password: password123");
    }
  } catch (error) {
    console.error("Database connection or execution failed:");
    console.error(error);
  } finally {
    await client.end();
  }
}

main();
