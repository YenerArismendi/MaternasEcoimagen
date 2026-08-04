/**
 * routes/fomag.js
 * Importación y exportación Excel FOMAG usando el nuevo esquema Gestante
 */
const express = require('express');
const multer  = require('multer');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const { generateFomagExcel } = require('../services/fomagExportService');

const router  = express.Router();
const prisma  = new PrismaClient();
const upload  = multer({ storage: multer.memoryStorage() });

// ─── Helpers avanzados ────────────────────────────────────────────────────────

function toDate(val) {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  if (typeof val === 'number' && val > 1000 && val < 100000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d;
  }
  if (typeof val === 'string') {
    const dmyMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const d = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`);
      return isNaN(d) ? null : d;
    }
    const d = new Date(val);
    return isNaN(d) ? null : d;
  }
  return null;
}

function str(val) {
  if (val == null) return null;
  const s = String(val).trim().replace(/\s+/g, ' ');
  return s === '' || s === '0' ? null : s;
}

function cellVal(row, col) {
  const c = row.getCell(col);
  if (!c.value) return null;
  if (typeof c.value === 'object') {
    if ('richText' in c.value) return c.value.richText.map(r => r.text).join('');
    if ('formula' in c.value) return c.value.result ?? null;
    if (c.value instanceof Date) return c.value;
  }
  return c.value;
}

function cleanDoc(val) {
  if (!val) return null;
  const s = String(val).trim().replace(/[^0-9]/g, '');
  return s || str(val);
}

function normalizeRiesgo(val) {
  if (!val) return 'BAJA';
  const v = String(val).toUpperCase().trim();
  if (v.includes('ALT')) return 'ALTA';
  if (v.includes('MED')) return 'MEDIANA';
  return 'BAJA';
}

function colToNum(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
  return n;
}

// ─── POST /api/fomag/import ───────────────────────────────────────────────────
router.post('/import', authMiddleware, upload.single('archivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    
    // Buscar la hoja correcta (por nombre o contenido)
    let ws = wb.getWorksheet('Cohorte Materno Perinatal') || wb.getWorksheet('COHORTE') || wb.worksheets[0];
    
    // Si la primera hoja parece ser de instrucciones, buscar CONSECUTIVO en las primeras 15 filas
    if (ws) {
        let found = false;
        for (let i = 1; i <= 15; i++) {
            if (ws.getRow(i).getCell(1).value === 'CONSECUTIVO') { found = true; break; }
        }
        if (!found) {
            ws = wb.worksheets.find(s => {
                for (let i = 1; i <= 15; i++) {
                    if (s.getRow(i).getCell(1).value === 'CONSECUTIVO') return true;
                }
                return false;
            }) || ws;
        }
    }

    if (!ws) return res.status(400).json({ error: 'No se encontró la hoja de Cohorte en el archivo' });

    const results = { creados: 0, actualizados: 0, errores: [] };

    for (let r = 12; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const val = (colStr) => cellVal(row, colToNum(colStr));
      const valStr = (colStr) => str(val(colStr));
      const valDate = (colStr) => toDate(val(colStr));
      const valDoc = (colStr) => cleanDoc(val(colStr));

      const numeroIdentificacion = valDoc('J');
      if (!numeroIdentificacion) continue;

      try {
        // 1. Encontrar o crear Gestante
        let gestante = await prisma.gestante.findUnique({ where: { numeroIdentificacion } });
        
        const dataGestante = {
            nombres: valStr('G') || 'SIN NOMBRE',
            apellidos: valStr('H') || 'SIN APELLIDO',
            tipoIdentificacion: valStr('I') || 'CC',
            numeroIdentificacion,
            region: valStr('B'),
            departamento: valStr('E'),
            municipio: valStr('F'),
            ipsAtencion: valStr('C'),
            fechaNacimiento: valDate('L') || new Date('1990-01-01'),
            escolaridad: valStr('N'),
            direccion: valStr('P'),
            telefonoCel1: valStr('R'),
            ocupacionOficio: valStr('T'),
            etnia: valStr('U'),
            identidadGenero: valStr('V'),
            discapacidad: valStr('W'),
            victimaViolencia: valStr('X'),
            tipoRiesgo: normalizeRiesgo(valStr('AU')),
            creadaPorId: req.user.id
        };

        if (!gestante) {
          gestante = await prisma.gestante.create({ data: dataGestante });
          results.creados++;
        } else {
          gestante = await prisma.gestante.update({
            where: { id: gestante.id },
            data: dataGestante
          });
          results.actualizados++;
        }

        // 2. Antecedentes
        await prisma.antecedenteClinico.upsert({
            where: { gestanteId: gestante.id },
            create: { gestanteId: gestante.id, antecedentesFamiliares: valStr('AW') },
            update: { antecedentesFamiliares: valStr('AW') }
        });

        // 3. Ingreso CPN
        await prisma.ingresoCPN.upsert({
            where: { gestanteId: gestante.id },
            create: { gestanteId: gestante.id, fur: valDate('AQ'), fpp: valDate('AT'), fechaInscripcionCPN: valDate('AD') },
            update: { fur: valDate('AQ'), fpp: valDate('AT'), fechaInscripcionCPN: valDate('AD') }
        });

        // 4. Controles (Los 11 controles oficiales)
        const controlesMap = [
          { n:1, f:'BU', ta:'BZ', p:'CF' }, { n:2, f:'DF', ta:'DI', p:'DM' },
          { n:3, f:'DV', ta:'DY', p:'EC' }, { n:4, f:'EK', ta:'EN', p:'ER' },
          { n:5, f:'FA', ta:'FD', p:'FH' }, { n:6, f:'GI', ta:'GL', p:'GQ' },
          { n:7, f:'GZ', ta:'HC', p:'HG' }, { n:8, f:'HO', ta:'HR', p:'HV' },
          { n:9, f:'IE', ta:'IH', p:'IL' }, { n:10, f:'IV', ta:'IY', p:'JC' },
          { n:11, f:'JK', ta:'JN', p:'JR' }
        ];

        for (const c of controlesMap) {
            const fecha = valDate(c.f);
            if (fecha) {
                await prisma.seguimientoControl.upsert({
                    where: { gestanteId_numeroControl: { gestanteId: gestante.id, numeroControl: c.n } },
                    create: {
                        gestanteId: gestante.id,
                        numeroControl: c.n,
                        fechaCPN: fecha,
                        tensionArterial: valStr(c.ta),
                        peso_kg: valStr(c.p),
                        riesgoObstetrico: valStr('AU')
                    },
                    update: {
                        fechaCPN: fecha,
                        tensionArterial: valStr(c.ta),
                        peso_kg: valStr(c.p)
                    }
                });
            }
        }

        // 5. Paraclínicos
        await prisma.paraclinico.upsert({
            where: { gestanteId: gestante.id },
            create: {
                gestanteId: gestante.id,
                hemoclasificacion: valStr('CM'),
                hemograma_HB: valStr('CN'),
                glicemia: valStr('CQ'),
                igg_Rubeola: valStr('CR'),
                igg_Toxoplasma: valStr('CS'),
                vih_Resultado: valStr('AL'),
                vih_Fecha: valDate('AM')
            },
            update: {
                hemoclasificacion: valStr('CM'),
                hemograma_HB: valStr('CN'),
                glicemia: valStr('CQ'),
                igg_Rubeola: valStr('CR'),
                igg_Toxoplasma: valStr('CS')
            }
        });

        // 6. Egreso
        await prisma.egresoYPosparto.upsert({
            where: { gestanteId: gestante.id },
            create: {
                gestanteId: gestante.id,
                fechaParto: valDate('LR'),
                institucionParto: valStr('LP'),
                pesoRN_gr: valStr('LW'),
                tallaRN_cm: valStr('LX'),
                estadoRecienNacido: valStr('LV'),
                fechaToxoideTetanico: valDate('BW'), 
            },
            update: {
                fechaParto: valDate('LR'),
                institucionParto: valStr('LP'),
                pesoRN_gr: valStr('LW')
            }
        });

      } catch (rowErr) {
        results.errores.push({ fila: r, documento: numeroIdentificacion, error: rowErr.message });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Exportación ─────────────────────────────────────────────────────────────
const GESTANTE_INCLUDE = {
    antecedentes: true,
    ingresoCPN: true,
    controles: true,
    paraclinicos: true,
    egresoYPosparto: true,
    seguimientosTelef: true,
    creadaPor: { select: { nombre: true } }
};

router.get('/export/excel', authMiddleware, async (req, res) => {
  try {
    const gestantes = await prisma.gestante.findMany({ include: GESTANTE_INCLUDE });
    const buffer = await generateFomagExcel(gestantes);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="FOMAG_Cohorte.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/excel/:gestanteId', authMiddleware, async (req, res) => {
  try {
    const gestante = await prisma.gestante.findUnique({
      where: { id: parseInt(req.params.gestanteId) },
      include: GESTANTE_INCLUDE
    });
    if (!gestante) return res.status(404).json({ error: 'Gestante no encontrada' });
    const buffer = await generateFomagExcel([gestante]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="FOMAG_${gestante.numeroIdentificacion}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
