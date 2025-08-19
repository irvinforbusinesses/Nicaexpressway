// server.js (archivo completo, listo para pegar)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// -------------------- CORS --------------------
const allowedOrigins = [
  'https://htmleditor.in',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'https://nicaexpressway.onrender.com',
  'https://irvinforbusinesses.github.io'
];

// Para pruebas puedes temporalmente usar origin: '*' pero no recomendado en prod
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.options('*', cors());

// -------------------- Supabase client --------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FALTAN ENV: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Notas:
 * - Rutas construidas para tus tablas: 'recordatorios', 'paquetes', 'historial'
 * - /stats implementada al final (usa latest estado por fila)
 */

// -------------------- HELPERS --------------------
async function ensureHistorialRow(codigo) {
  try {
    const { data, error } = await supabase
      .from('historial')
      .select('*')
      .eq('codigo_seguimiento', codigo)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const insertObj = {
        codigo_seguimiento: codigo,
        estado1: null, fecha1: null,
        estado2: null, fecha2: null,
        estado3: null, fecha3: null,
        estado4: null, fecha4: null
      };
      const insertRes = await supabase.from('historial').insert([insertObj]).select().maybeSingle();
      if (insertRes.error) throw insertRes.error;
      return insertRes.data;
    }
    return data;
  } catch (err) {
    console.error('ensureHistorialRow error:', err);
    throw err;
  }
}

async function pushEstadoToHistorial(codigo, estado, fecha) {
  try {
    if (!codigo) throw new Error('codigo_seguimiento requerido para actualizar historial');

    const histRes = await supabase
      .from('historial')
      .select('*')
      .eq('codigo_seguimiento', codigo)
      .limit(1)
      .maybeSingle();
    if (histRes.error) throw histRes.error;

    let hist = histRes.data;
    if (!hist) {
      const createRes = await supabase
        .from('historial')
        .insert([{
          codigo_seguimiento: codigo,
          estado1: null, fecha1: null,
          estado2: null, fecha2: null,
          estado3: null, fecha3: null,
          estado4: null, fecha4: null
        }])
        .select()
        .maybeSingle();
      if (createRes.error) throw createRes.error;
      hist = createRes.data;
    }

    const slots = [
      ['estado1', 'fecha1'],
      ['estado2', 'fecha2'],
      ['estado3', 'fecha3'],
      ['estado4', 'fecha4']
    ];

    let target = null;
    for (const [estadoKey, fechaKey] of slots) {
      if (hist[estadoKey] === null || hist[estadoKey] === '') {
        target = { estadoKey, fechaKey };
        break;
      }
    }
    if (!target) target = { estadoKey: 'estado4', fechaKey: 'fecha4' };

    const updateObj = {};
    updateObj[target.estadoKey] = estado;
    updateObj[target.fechaKey] = fecha || new Date().toISOString().split('T')[0];

    const { data: updated, error: updateErr } = await supabase
      .from('historial')
      .update(updateObj)
      .eq('codigo_seguimiento', codigo)
      .select();
    if (updateErr) throw updateErr;
    return updated;
  } catch (err) {
    console.error('pushEstadoToHistorial error:', err);
    throw err;
  }
}

// -------------------- RECORDATORIOS --------------------
// POST /recordatorios  -> crea y devuelve el objeto creado
app.post('/recordatorios', async (req, res) => {
  try {
    const titulo = req.body.titulo ?? req.body.title ?? null;
    const descripcion = req.body.descripcion ?? req.body.description ?? null;
    const fecha_limite = req.body.fecha_limite ?? req.body.date ?? null;

    const { data, error } = await supabase
      .from('recordatorios')
      .insert([{ titulo, descripcion, fecha_limite }])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase insert recordatorios error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /recordatorios error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /recordatorios -> array de recordatorios
app.get('/recordatorios', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recordatorios')
      .select('*')
      .order('fecha_limite', { ascending: true });
    if (error) {
      console.error('Supabase get recordatorios error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json(data || []);
  } catch (err) {
    console.error('GET /recordatorios error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /recordatorios/:id
app.get('/recordatorios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recordatorios')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Supabase get recordatorio by id error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    return res.json(data);
  } catch (err) {
    console.error('GET /recordatorios/:id error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// DELETE /recordatorios/:id
app.delete('/recordatorios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recordatorios')
      .delete()
      .eq('id', id)
      .select();
    if (error) {
      console.error('Supabase delete recordatorios error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /recordatorios/:id error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// -------------------- PAQUETES --------------------
// POST /paquetes -> crea paquete; si viene codigo_seguimiento inserta fila en historial
app.post('/paquetes', async (req, res) => {
  try {
    const nombre_cliente = req.body.nombre_cliente ?? req.body.cliente ?? req.body.nombre ?? null;
    const codigo_seguimiento = req.body.codigo_seguimiento ?? req.body.codigo ?? null;
    const telefono = req.body.telefono ?? req.body.phone ?? null;
    const tipo_envio_id = req.body.tipo_envio_id ?? (req.body.tipo === 'aereo' ? 1 : req.body.tipo === 'maritimo' ? 2 : req.body.tipo) ?? null;
    const peso_libras = req.body.peso_libras ?? req.body.peso ?? null;
    const tarifa_usd = req.body.tarifa_usd ?? req.body.tarifa ?? null;
    const fecha_estado = req.body.fecha_estado ?? req.body.fecha ?? null;

    const insertObj = {
      nombre_cliente,
      codigo_seguimiento,
      telefono,
      tipo_envio_id,
      peso_libras,
      tarifa_usd,
      fecha_estado
    };

    const { data, error } = await supabase
      .from('paquetes')
      .insert([insertObj])
      .select()
      .maybeSingle();

    if (error) {
      console.error('Supabase insert paquetes error:', error);
      return res.status(400).json({ error: error.message || error });
    }

    if (codigo_seguimiento) {
      try { await ensureHistorialRow(codigo_seguimiento); } catch (e) { console.error(e); }
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /paquetes error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /paquetes?codigo=... -> devuelve array (posible vacío)
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
    return res.json(data || []);
  } catch (err) {
    console.error('GET /paquetes error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /paquetes/:id -> por id
app.get('/paquetes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('paquetes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('Supabase get paquete by id error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    if (!data) return res.status(404).json({ error: 'No encontrado' });
    return res.json(data);
  } catch (err) {
    console.error('GET /paquetes/:id error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// PUT /paquetes/:codigo_seguimiento -> actualiza peso, tarifa, fecha, estado
app.put('/paquetes/:codigo_seguimiento', async (req, res) => {
  try {
    const { codigo_seguimiento } = req.params;
    const peso_libras = (req.body.peso_libras !== undefined) ? req.body.peso_libras : (req.body.peso !== undefined ? req.body.peso : undefined);
    const tarifa_usd = (req.body.tarifa_usd !== undefined) ? req.body.tarifa_usd : (req.body.tarifa !== undefined ? req.body.tarifa : undefined);
    const fecha_estado = (req.body.fecha_estado !== undefined) ? req.body.fecha_estado : (req.body.fecha !== undefined ? req.body.fecha : undefined);
    const estado = req.body.estado ?? null;
    const fecha_para_estado = req.body.fecha_estado ?? req.body.fecha ?? null;

    const updateObj = {};
    if (peso_libras !== undefined) updateObj.peso_libras = peso_libras;
    if (tarifa_usd !== undefined) updateObj.tarifa_usd = tarifa_usd;
    if (fecha_estado !== undefined) updateObj.fecha_estado = fecha_estado;

    if (Object.keys(updateObj).length === 0 && !estado) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const { data, error } = await supabase
      .from('paquetes')
      .update(updateObj)
      .eq('codigo_seguimiento', codigo_seguimiento)
      .select();

    if (error) {
      console.error('Supabase put paquetes error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No se encontró paquete con ese código de seguimiento' });
    }

    if (estado) {
      try { await pushEstadoToHistorial(codigo_seguimiento, estado, fecha_para_estado); } catch (e) { console.error(e); }
    }

    return res.json(data);
  } catch (err) {
    console.error('PUT /paquetes/:codigo_seguimiento error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// PATCH /paquetes/:identifier (compatibilidad -> llama a PUT handler)
app.patch('/paquetes/:identifier', async (req, res, next) => {
  // redirigimos a la misma lógica de PUT manejada arriba
  req.params.codigo_seguimiento = req.params.identifier;
  return app._router.handle(req, res, next);
});

// -------------------- HISTORIAL --------------------
// GET /historial?codigo=...  -> devuelve la fila de historial para un codigo_seguimiento (objeto o 404)
app.get('/historial', async (req, res) => {
  try {
    const { codigo } = req.query;
    if (!codigo) return res.status(400).json({ error: 'codigo query required' });

    const { data, error } = await supabase
      .from('historial')
      .select('*')
      .eq('codigo_seguimiento', codigo)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase get historial error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    if (!data) return res.status(404).json({ error: 'Historial no encontrado' });
    return res.json(data);
  } catch (err) {
    console.error('GET /historial error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// -------------------- SEARCH --------------------
// POST /paquetes/search -> busca paquetes por nombre (ilike) o telefono (eq).
app.post('/paquetes/search', async (req, res) => {
  try {
    const { nombre, telefono } = req.body ?? {};

    if (!nombre && !telefono) {
      return res.status(400).json({ error: 'Se requiere nombre o telefono para buscar' });
    }

    let query = supabase.from('paquetes').select('*');

    if (nombre && telefono) {
      const escapedName = nombre.replace(/%/g, '\\%').replace(/'/g, "''");
      query = query.or(`nombre_cliente.ilike.%${escapedName}%,telefono.eq.${telefono}`);
    } else if (nombre) {
      query = query.ilike('nombre_cliente', `%${nombre}%`);
    } else if (telefono) {
      query = query.eq('telefono', telefono);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase paquetes search error:', error);
      return res.status(400).json({ error: error.message || error });
    }
    return res.json(data || []);
  } catch (err) {
    console.error('POST /paquetes/search error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// -------------------- STATS --------------------
// GET /stats?filter=general|aereo|maritimo
app.get('/stats', async (req, res) => {
  try {
    const filter = (req.query.filter || 'general').toString().toLowerCase();
    const tipoMap = { 'aereo': 1, 'maritimo': 2 };
    const tipoId = tipoMap[filter] ?? null;

    // 1) traer paquetes (filtrando por tipo si aplica) -> necesitamos codigo_seguimiento, tarifa_usd, peso_libras
    let paquetesQuery = supabase.from('paquetes').select('codigo_seguimiento, tarifa_usd, peso_libras, tipo_envio_id');
    if (tipoId) paquetesQuery = paquetesQuery.eq('tipo_envio_id', tipoId);
    const paquetesFiltered = await paquetesQuery;
    if (paquetesFiltered.error) throw paquetesFiltered.error;
    const paquetesList = paquetesFiltered.data || [];

    // 2) extraer códigos válidos para limitar historial
    const codes = paquetesList.map(p => p.codigo_seguimiento).filter(Boolean);

    // 3) traer historial (solo filas relacionadas si hay codes)
    let historialRes;
    if (codes.length > 0) {
      historialRes = await supabase
        .from('historial')
        .select('codigo_seguimiento, estado1, estado2, estado3, estado4')
        .in('codigo_seguimiento', codes);
    } else {
      // si no hay códigos (pocos o ninguno) traemos todo (advertencia: datos grandes -> paginar)
      historialRes = await supabase
        .from('historial')
        .select('codigo_seguimiento, estado1, estado2, estado3, estado4');
    }
    if (historialRes.error) throw historialRes.error;
    const historialRows = historialRes.data || [];

    // normalizador y helper: estado mas reciente (estado4 -> estado1)
    function normalizeState(v){
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s === '' ? null : s.toLowerCase();
    }
    function latestEstadoFromRow(row){
      const e4 = normalizeState(row.estado4); if (e4) return e4;
      const e3 = normalizeState(row.estado3); if (e3) return e3;
      const e2 = normalizeState(row.estado2); if (e2) return e2;
      const e1 = normalizeState(row.estado1); if (e1) return e1;
      return null;
    }

    // 4) Contadores por estado (según latest state)
    let enviadosCount = 0;
    let bodegaCount = 0;
    let caminoCount = 0;
    let aduanaCount = 0;

    for (const row of historialRows) {
      const latest = latestEstadoFromRow(row);
      if (!latest) continue;
      if (latest.includes('listo')) {
        enviadosCount++;
      } else if (latest.includes('recib')) {
        bodegaCount++;
      } else if (latest.includes('transit') || latest.includes('en transito') || latest.includes('en_transito')) {
        caminoCount++;
      } else if (latest.includes('aduan')) {
        aduanaCount++;
      }
    }

    // 5) Ganancias: SUM(peso_libras * tarifa_usd) sobre paquetesList (aplica filtro tipo si se usó)
    let ganancias = 0;
    let total_pounds = 0;
    for (const p of paquetesList) {
      const peso = Number(p.peso_libras ?? 0);
      const tarifa = Number(p.tarifa_usd ?? 0);
      if (!Number.isNaN(peso)) total_pounds += peso;
      if (!Number.isNaN(peso) && !Number.isNaN(tarifa)) ganancias += (peso * tarifa);
    }

    // redondear a 2 decimales (opcional)
    ganancias = Math.round((ganancias + Number.EPSILON) * 100) / 100;
    total_pounds = Math.round((total_pounds + Number.EPSILON) * 100) / 100;

    const counts = {
      enviados: enviadosCount,
      bodega: bodegaCount,
      camino: caminoCount,
      aduana: aduanaCount
    };

    return res.json({
      counts,
      ganancias,       // number (USD)
      total_pounds,    // number (libras)
      total: (enviadosCount + bodegaCount + caminoCount + aduanaCount)
    });
  } catch (err) {
    console.error('GET /stats error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
