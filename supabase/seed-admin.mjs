/**
 * Script para crear un usuario administrador
 *
 * Uso:
 *   node supabase/seed-admin.mjs
 *
 * Variables de entorno requeridas:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_EMAIL (opcional, default: admin@shophub.com)
 *   ADMIN_PASSWORD (opcional, default: Admin123!)
 *   ADMIN_NAME (opcional, default: Administrador)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");

// Parse .env manually (no dotenv dependency needed)
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error("⚠️  No se encontró .env en", envPath);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@shophub.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigration() {
  console.log("🔄 Verificando columna 'role' en tabla customers...\n");

  // Use the Supabase Management API / SQL via REST to run the migration
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }).catch(() => null);

  // Try a simple query first to check if column exists
  const { data, error } = await supabase
    .from("customers")
    .select("role")
    .limit(1);

  if (error && error.message.includes("role")) {
    console.log("⚠️  La columna 'role' no existe. Ejecutando migración...");
    console.log("   Por favor ejecuta el siguiente SQL en el Supabase Dashboard (SQL Editor):\n");
    console.log("   ALTER TABLE public.customers");
    console.log("   ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer'");
    console.log("   CHECK (role IN ('customer', 'admin'));\n");
    console.log("   CREATE INDEX IF NOT EXISTS idx_customers_role ON public.customers(role);\n");
    console.log("   Luego vuelve a ejecutar este script.");
    process.exit(1);
  }

  console.log("✅ Columna 'role' verificada.\n");
}

async function seedAdmin() {
  await runMigration();
  console.log("🔧 Creando usuario administrador...\n");

  // 1. Verificar si ya existe un admin con ese email en customers
  const { data: existing } = await supabase
    .from("customers")
    .select("id, email, role")
    .eq("email", ADMIN_EMAIL)
    .maybeSingle();

  if (existing) {
    if (existing.role === "admin") {
      console.log(`✅ El usuario admin ya existe: ${ADMIN_EMAIL}`);
      return;
    }
    // Promover a admin
    const { error: updateErr } = await supabase
      .from("customers")
      .update({ role: "admin" })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("❌ Error al promover usuario a admin:", updateErr.message);
      process.exit(1);
    }
    console.log(`✅ Usuario existente promovido a admin: ${ADMIN_EMAIL}`);
    return;
  }

  // 2. Crear usuario en Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME, role: "admin" },
    });

  if (authError) {
    // Si el usuario auth ya existe pero no está en customers
    if (authError.message.includes("already been registered")) {
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingAuth = usersData?.users?.find(
        (u) => u.email === ADMIN_EMAIL,
      );
      if (existingAuth) {
        const { error: insertErr } = await supabase.from("customers").insert({
          id: existingAuth.id,
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          role: "admin",
        });
        if (insertErr) {
          console.error(
            "❌ Error al insertar customer admin:",
            insertErr.message,
          );
          process.exit(1);
        }
        console.log(`✅ Usuario auth existente vinculado como admin: ${ADMIN_EMAIL}`);
        return;
      }
    }
    console.error("❌ Error al crear usuario auth:", authError.message);
    process.exit(1);
  }

  // 3. Insertar en tabla customers con role=admin
  const { error: insertError } = await supabase.from("customers").insert({
    id: authData.user.id,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    role: "admin",
  });

  if (insertError) {
    console.error(
      "❌ Error al insertar customer admin:",
      insertError.message,
    );
    process.exit(1);
  }

  console.log("✅ Usuario administrador creado exitosamente:");
  console.log(`   📧 Email: ${ADMIN_EMAIL}`);
  console.log(`   🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`   👤 Nombre: ${ADMIN_NAME}`);
  console.log(`   🛡️  Rol: admin`);
  console.log(
    "\n⚠️  Cambia la contraseña después del primer inicio de sesión.",
  );
}

seedAdmin().catch((err) => {
  console.error("❌ Error inesperado:", err);
  process.exit(1);
});
