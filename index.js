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

// Agregar recordatorio (adaptado a los nombres que envía el front)
app.post('/recordatorios', async (req, res) => {
  const { title, description, date } = req.body; // nombres del front
  const { data, error } = await supabase
    .from('recordatorios')
    .insert([{ titulo: title, descripcion: description, fecha_limite: date }]);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// Eliminar recordatorio
app.delete('/recordatorios/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('recordatorios')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// Obtener todos los recordatorios
app.get('/recordatorios', async (req, res) => {
  const { data, error } = await supabase.from('recordatorios').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// =========================
// Rutas de Paquetes
// =========================

// Agregar paquete (adaptado a los nombres que envía el front)
app.post('/paquetes', async (req, res) => {
  const { cliente, codigo, telefono, tipo, peso, tarifa, fecha } = req.body; // nombres del front
  const { data, error } = await supabase
    .from('paquetes')
    .insert([{
      nombre_cliente: cliente,
      codigo_seguimiento: codigo,
      telefono,
      tipo_envio_id: tipo,
      peso_libras: peso,
      tarifa_usd: tarifa,
      fecha_estado: fecha
    }]);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// Actualizar paquete (solo peso, tarifa y fecha, usando codigo del front)
app.patch('/paquetes/:codigo', async (req, res) => {
  const { codigo } = req.params;
  const { peso, tarifa, fecha } = req.body; // nombres del front

  const { data, error } = await supabase
    .from('paquetes')
    .update({
      peso_libras: peso,
      tarifa_usd: tarifa,
      fecha_estado: fecha
    })
    .eq('codigo_seguimiento', codigo);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// Obtener todos los paquetes
app.get('/paquetes', async (req, res) => {
  const { data, error } = await supabase.from('paquetes').select('*');
  if (error) return res.status(400).json({ error: error.message });
  res.json({ data });
});

// =========================
// Server
// =========================
const PORT = process.env.PORT || 10000; // render usa 1000
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
