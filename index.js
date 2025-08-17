require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Solo en backend
);

// =========================
// Rutas de Recordatorios
// =========================

// Agregar recordatorio
app.post('/recordatorios', async (req, res) => {
  const { titulo, descripcion, fecha_limite } = req.body;
  const { data, error } = await supabase
    .from('recordatorios')
    .insert([{ titulo, descripcion, fecha_limite }]);
  if (error) return res.status(400).json({ error });
  res.json({ data });
});

// Eliminar recordatorio
app.delete('/recordatorios/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('recordatorios')
    .delete()
    .eq('id', id);
  if (error) return res.status(400).json({ error });
  res.json({ data });
});

// Obtener todos los recordatorios
app.get('/recordatorios', async (req, res) => {
  const { data, error } = await supabase.from('recordatorios').select('*');
  if (error) return res.status(400).json({ error });
  res.json({ data });
});

// =========================
// Rutas de Paquetes
// =========================

// Agregar paquete (todos los campos opcionales)
app.post('/paquetes', async (req, res) => {
  const { nombre_cliente, codigo_seguimiento, telefono, tipo_envio_id, peso_libras, tarifa_usd, fecha_estado } = req.body;
  const { data, error } = await supabase
    .from('paquetes')
    .insert([{ nombre_cliente, codigo_seguimiento, telefono, tipo_envio_id, peso_libras, tarifa_usd, fecha_estado }]);
  if (error) return res.status(400).json({ error });
  res.json({ data });
});

// Actualizar seguimiento (solo peso, tarifa y fecha_estado) usando codigo_seguimiento
app.patch('/paquetes/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const { peso_libras, tarifa_usd, fecha_estado } = req.body;

  const { data, error } = await supabase
    .from('paquetes')
    .update({ peso_libras, tarifa_usd, fecha_estado })
    .eq('codigo_seguimiento', codigo);

  if (error) return res.status(400).json({ error });
  res.json({ data });
});

// Obtener todos los paquetes
app.get('/paquetes', async (req, res) => {
  const { data, error } = await supabase.from('paquetes').select('*');
  if (error) return res.status(400).json({ error });
  res.json({ data });
});

// =========================
// Server
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
