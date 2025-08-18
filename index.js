// server.js (fragmento de reemplazo / mejora)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// VALIDAR ENV
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FALTAN ENV: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
  // no forzar exit en producción de render, solo logear para ver en logs
}

// Conexión a Supabase (service role key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- RECORDATORIOS ----------

// Insert (acepta keys en español o inglés)
app.post('/recordatorios', async (req, res) => {
  try {
    const titulo = req.body.titulo ?? req.body.title;
    const descripcion = req.body.descripcion ?? req.body.description;
    const fecha_limite = req.body.fecha_limite ?? req.body.date ?? null;

    const { data, error } = await supabase
      .from('recordatorios')
      .insert([{ titulo, descripcion, fecha_limite }]);

    if (error) {
      console.error('Supabase insert recordatorios error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Delete
app.delete('/recordatorios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recordatorios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete recordatorios error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET all OR buscar por fecha/otros. Además, soportamos GET /recordatorios
app.get('/recordatorios', async (req, res) => {
  try {
    const { data, error } = await supabase.from('recordatorios').select('*').order('fecha_limite', { ascending: true });
    if (error) {
      console.error('Supabase get recordatorios error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// ---------- PAQUETES ----------

// Insert paquete (acepta campos con varios nombres)
app.post('/paquetes', async (req, res) => {
  try {
    const nombre_cliente = req.body.nombre_cliente ?? req.body.cliente ?? req.body.nombre ?? null;
    const codigo_seguimiento = req.body.codigo_seguimiento ?? req.body.codigo ?? null;
    const telefono = req.body.telefono ?? req.body.phone ?? null;
    const tipo_envio_id = req.body.tipo_envio_id ?? (req.body.tipo === 'aereo' ? 1 : req.body.tipo === 'maritimo' ? 2 : req.body.tipo) ?? null;
    const peso_libras = req.body.peso_libras ?? req.body.peso ?? null;
    const tarifa_usd = req.body.tarifa_usd ?? req.body.tarifa ?? null;
    const fecha_estado = req.body.fecha_estado ?? req.body.fecha ?? null;

    const { data, error } = await supabase
      .from('paquetes')
      .insert([{
        nombre_cliente,
        codigo_seguimiento,
        telefono,
        tipo_envio_id,
        peso_libras,
        tarifa_usd,
        fecha_estado
      }]);

    if (error) {
      console.error('Supabase insert paquetes error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET paquetes (si ?codigo= entonces buscar por codigo_seguimiento)
app.get('/paquetes', async (req, res) => {
  try {
    const { codigo } = req.query;
    let query = supabase.from('paquetes').select('*');
    if (codigo) query = query.eq('codigo_seguimiento', codigo);
    const { data, error } = await query;
    if (error) {
      console.error('Supabase get paquetes error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// PATCH: actualizar solo peso, tarifa, fecha_estado basado en codigo
// PATCH: actualizar solo peso, tarifa, fecha_estado basado en codigo o nombre o telefono
app.patch('/paquetes/:codigo?', async (req, res) => {
  try {
    const codigo = req.params.codigo || req.body.codigo_seguimiento || req.body.codigo || null;
    const nombre = req.body.nombre_cliente ?? req.body.nombre ?? null;
    const telefono = req.body.telefono ?? req.body.phone ?? null;

    const peso_libras = req.body.peso_libras ?? req.body.peso ?? null;
    const tarifa_usd = req.body.tarifa_usd ?? req.body.tarifa ?? null;
    const fecha_estado = req.body.fecha_estado ?? req.body.fecha ?? null;

    // construir query dinámico
    let query = supabase.from('paquetes').update({
      peso_libras,
      tarifa_usd,
      fecha_estado
    });

    if (codigo) {
      query = query.eq('codigo_seguimiento', codigo);
    } else if (nombre) {
      query = query.eq('nombre_cliente', nombre);
    } else if (telefono) {
      query = query.eq('telefono', telefono);
    } else {
      return res.status(400).json({ error: 'Debes enviar codigo_seguimiento, nombre_cliente o telefono para actualizar' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase patch paquetes error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No se encontró paquete con los criterios dados' });
    }
    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
