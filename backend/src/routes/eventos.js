const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/maternas/:id/eventos - obtener eventos de una gestante
router.get('/materna/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const eventos = await prisma.eventoMedico.findMany({
      where: { gestanteId: parseInt(id) },
      include: { prestadores: true },
      orderBy: { fechaProgramada: 'asc' },
    });
    res.json(eventos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener eventos médicos' });
  }
});

// POST /api/eventos - crear nuevo evento
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      tipo, 
      descripcion, 
      fechaProgramada, 
      esObligatorio, 
      maternaId, // Mantenemos el nombre del campo que envía el frontend por ahora
      notas,
      codigoCUPS,
      prestadoresIds,
      esControl,
      resultado,
      trimestre
    } = req.body;

    const gId = maternaId || req.body.gestanteId;

    if (!tipo || !descripcion || !fechaProgramada || !gId) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const evento = await prisma.eventoMedico.create({
      data: {
        tipo,
        descripcion,
        fechaProgramada: new Date(fechaProgramada),
        esObligatorio: !!esObligatorio,
        esControl: !!esControl,
        resultado,
        codigoCUPS,
        gestanteId: parseInt(gId),
        notas,
        trimestre,
        estado: 'PENDIENTE',
        estaAgendado: false,
        prestadores: (prestadoresIds && prestadoresIds.length > 0) ? {
          connect: prestadoresIds.map(id => ({ id: parseInt(id) }))
        } : undefined
      },
      include: { prestadores: true }
    });

    res.status(201).json(evento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear evento médico' });
  }
});

// PATCH /api/eventos/:id - actualizar evento
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      estado, fechaRealizada, notas, fechaProgramada, descripcion, codigoCUPS, 
      prestadoresIds, esControl, resultado, estaAgendado, fechaAgendamiento, 
      trimestre
    } = req.body;

    const data = {};
    if (estado) data.estado = estado;
    if (fechaRealizada) data.fechaRealizada = new Date(fechaRealizada);
    if (notas !== undefined) data.notas = notas;
    if (fechaProgramada) data.fechaProgramada = new Date(fechaProgramada);
    if (descripcion) data.descripcion = descripcion;
    if (codigoCUPS !== undefined) data.codigoCUPS = codigoCUPS;
    if (esControl !== undefined) data.esControl = !!esControl;
    if (resultado !== undefined) data.resultado = resultado;
    if (estaAgendado !== undefined) data.estaAgendado = !!estaAgendado;
    if (fechaAgendamiento !== undefined) {
      data.fechaAgendamiento = fechaAgendamiento ? new Date(fechaAgendamiento) : null;
    }
    if (trimestre !== undefined) data.trimestre = trimestre;

    if (prestadoresIds) {
      data.prestadores = {
        set: prestadoresIds.map(id => ({ id: parseInt(id) }))
      };
    }

    if (estado === 'REALIZADO' && !fechaRealizada) {
      data.fechaRealizada = new Date();
    }

    const evento = await prisma.eventoMedico.update({
      where: { id: parseInt(id) },
      data
    });

    // Lógica especial: Si es un control y se marca como realizado, podríamos crear un registro en SeguimientoControl
    // Pero por ahora dejaremos que el frontend o una ruta específica maneje los controles detallados.

    res.json(evento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar evento médico' });
  }
});

// DELETE /api/eventos/:id - eliminar evento
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.eventoMedico.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Evento eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

// POST /api/eventos/bulk-delete - eliminar múltiples eventos
router.post('/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Faltan IDs para eliminar' });
    }

    await prisma.eventoMedico.deleteMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      }
    });

    res.json({ message: 'Eventos eliminados correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar eventos en bloque' });
  }
});

// POST /api/eventos/materna/:id/generar-basicos - generar set básico de eventos
router.post('/materna/:id/generar-basicos', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const gestante = await prisma.gestante.findUnique({
      where: { id: parseInt(id) },
      include: { ingresoCPN: true }
    });

    if (!gestante) {
      return res.status(404).json({ error: 'Paciente no encontrada' });
    }

    const fur = gestante.ingresoCPN?.fur || gestante.createdAt;
    const startDate = new Date(fur);
    const basicEvents = [];

    for (let i = 1; i <= 10; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (i * 28)); 
        basicEvents.push({
            tipo: 'CITA',
            descripcion: i === 1 ? 'Primera Vez Control Prenatal' : `Control Prenatal #${i}`,
            fechaProgramada: date,
            esObligatorio: true,
            esControl: true,
            gestanteId: gestante.id,
            estado: 'PENDIENTE',
            estaAgendado: false
        });
    }

    const eco1 = new Date(startDate); eco1.setDate(eco1.getDate() + (12 * 7)); 
    const eco2 = new Date(startDate); eco2.setDate(eco2.getDate() + (22 * 7)); 
    const eco3 = new Date(startDate); eco3.setDate(eco3.getDate() + (32 * 7)); 

    basicEvents.push(
        { tipo: 'ESTUDIO', descripcion: 'Ecografía de Tamizaje (Sem 11-14)', fechaProgramada: eco1, esObligatorio: true, gestanteId: gestante.id, estaAgendado: false },
        { tipo: 'ESTUDIO', descripcion: 'Ecografía Detalle Anatómico (Sem 20-24)', fechaProgramada: eco2, esObligatorio: true, gestanteId: gestante.id, estaAgendado: false },
        { tipo: 'ESTUDIO', descripcion: 'Ecografía de Crecimiento (Sem 32+)', fechaProgramada: eco3, esObligatorio: true, gestanteId: gestante.id, estaAgendado: false }
    );

    const lab1 = new Date(startDate); lab1.setDate(lab1.getDate() + 7); 
    const lab2 = new Date(startDate); lab2.setDate(lab2.getDate() + (24 * 7)); 
    const lab3 = new Date(startDate); lab3.setDate(lab3.getDate() + (35 * 7)); 

    basicEvents.push(
        { tipo: 'LABORATORIO', descripcion: 'Laboratorios 1er Trimestre', fechaProgramada: lab1, esObligatorio: true, gestanteId: gestante.id, estado: 'PENDIENTE', estaAgendado: false, trimestre: '1er Trimestre' },
        { tipo: 'LABORATORIO', descripcion: 'Prueba de Tolerancia a la Glucosa', fechaProgramada: lab2, esObligatorio: true, gestanteId: gestante.id, estado: 'PENDIENTE', estaAgendado: false, trimestre: '2do Trimestre' },
        { tipo: 'LABORATORIO', descripcion: 'Laboratorios 3er Trimestre', fechaProgramada: lab3, esObligatorio: true, gestanteId: gestante.id, estado: 'PENDIENTE', estaAgendado: false, trimestre: '3er Trimestre' }
    );

    const created = await prisma.eventoMedico.createMany({
        data: basicEvents
    });

    res.json({ message: 'Eventos básicos generados', count: created.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar eventos básicos' });
  }
});

module.exports = router;
