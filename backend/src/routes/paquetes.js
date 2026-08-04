const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/paquetes - Listar todos los paquetes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const paquetes = await prisma.paqueteEventos.findMany({
      include: { plantillas: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(paquetes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener paquetes' });
  }
});

// POST /api/paquetes - Crear nuevo paquete
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, plantillas, trimestre } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const paquete = await prisma.paqueteEventos.create({
      data: {
        nombre,
        descripcion,
        trimestre,
        plantillas: {
          create: plantillas.map(p => ({
            tipo: p.tipo,
            descripcion: p.descripcion,
            semanasRelativas: parseInt(p.semanasRelativas) || 0,
            esObligatorio: !!p.esObligatorio,
            esControl: !!p.esControl,
            codigoCUPS: p.codigoCUPS,
            cantidad: parseInt(p.cantidad) || 1,
            trimestre: p.trimestre
          }))
        }
      },
      include: { plantillas: true }
    });

    res.status(201).json(paquete);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear paquete' });
  }
});

// UPDATE /api/paquetes/:id - Editar paquete
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, plantillas, trimestre } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const result = await prisma.$transaction(async (tx) => {
        const currentPaquete = await tx.paqueteEventos.findUnique({
            where: { id: parseInt(id) },
            include: { plantillas: true }
        });
        if (!currentPaquete) throw new Error('Paquete no encontrado');

        const incomingPlantillaIds = plantillas.filter(p => p.id).map(p => parseInt(p.id));
        const plantillasToRemove = currentPaquete.plantillas.filter(p => !incomingPlantillaIds.includes(p.id));

        const updatedPaquete = await tx.paqueteEventos.update({
            where: { id: parseInt(id) },
            data: { nombre, descripcion, trimestre },
        });

        for (const p of plantillasToRemove) {
            await tx.plantillaEvento.delete({ where: { id: p.id } });
        }

        const processedPlantillas = [];
        for (const pMap of plantillas) {
            const pData = {
                tipo: pMap.tipo,
                descripcion: pMap.descripcion || '',
                semanasRelativas: parseInt(pMap.semanasRelativas) || 0,
                esObligatorio: !!pMap.esObligatorio,
                esControl: !!pMap.esControl,
                codigoCUPS: pMap.codigoCUPS || null,
                cantidad: parseInt(pMap.cantidad) || 1,
                trimestre: pMap.trimestre || trimestre || null
            };

            if (pMap.id) {
                const updatedP = await tx.plantillaEvento.update({
                    where: { id: pMap.id },
                    data: pData
                });
                processedPlantillas.push(updatedP);
            } else {
                const newP = await tx.plantillaEvento.create({
                    data: { ...pData, paqueteId: parseInt(id) }
                });
                processedPlantillas.push(newP);
            }
        }

        return { ...updatedPaquete, plantillas: processedPlantillas };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar paquete' });
  }
});

// GET /api/paquetes/check-sync/:gestanteId
router.get('/check-sync/:gestanteId', authMiddleware, async (req, res) => {
  try {
    const { gestanteId } = req.params;
    const mid = parseInt(gestanteId);

    const eventos = await prisma.eventoMedico.findMany({
      where: { gestanteId: mid, paqueteId: { not: null } },
      select: { paqueteId: true, createdAt: true }
    });

    if (eventos.length === 0) return res.json({ desactualizados: [] });

    const mapaFechas = {};
    eventos.forEach(ev => {
      const pid = ev.paqueteId;
      if (!mapaFechas[pid] || ev.createdAt > mapaFechas[pid]) {
        mapaFechas[pid] = ev.createdAt;
      }
    });

    const paqueteIds = Object.keys(mapaFechas).map(Number);
    const paquetes = await prisma.paqueteEventos.findMany({
      where: { id: { in: paqueteIds } },
      select: { id: true, updatedAt: true }
    });

    const desactualizados = paquetes
      .filter(pq => new Date(pq.updatedAt) > new Date(mapaFechas[pq.id]))
      .map(pq => pq.id);

    res.json({ desactualizados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar sincronización' });
  }
});

// POST /api/paquetes/:paqueteId/sincronizar-materna/:gestanteId
router.post('/:paqueteId/sincronizar-materna/:gestanteId', authMiddleware, async (req, res) => {
  try {
    const { paqueteId, gestanteId } = req.params;

    const gestante = await prisma.gestante.findUnique({ 
        where: { id: parseInt(gestanteId) },
        include: { ingresoCPN: true }
    });
    const paquete = await prisma.paqueteEventos.findUnique({
      where: { id: parseInt(paqueteId) },
      include: { plantillas: true }
    });

    if (!gestante || !paquete) {
      return res.status(404).json({ error: 'Paciente o paquete no encontrado' });
    }

    const fur = gestante.ingresoCPN?.fur || gestante.createdAt;
    const startDate = new Date(fur);

    await prisma.$transaction(async (tx) => {
      const eventosNoPendientes = await tx.eventoMedico.findMany({
        where: {
          gestanteId: parseInt(gestanteId),
          paqueteId: parseInt(paqueteId),
          estado: { not: 'PENDIENTE' },
          plantillaId: { not: null }
        },
        select: { plantillaId: true }
      });
      const plantillasCompletadasIds = eventosNoPendientes.map(e => e.plantillaId);

      await tx.eventoMedico.deleteMany({
        where: {
          gestanteId: parseInt(gestanteId),
          paqueteId: parseInt(paqueteId),
          estado: 'PENDIENTE'
        }
      });

      const plantillasPendientes = paquete.plantillas.filter(p => !plantillasCompletadasIds.includes(p.id));

      const eventosParaCrear = plantillasPendientes.map(p => {
        const fechaProgramada = new Date(startDate);
        fechaProgramada.setDate(fechaProgramada.getDate() + (p.semanasRelativas * 7));
        return {
          tipo: p.tipo,
          descripcion: p.descripcion || '',
          fechaProgramada,
          esObligatorio: !!p.esObligatorio,
          esControl: !!p.esControl,
          codigoCUPS: p.codigoCUPS || null,
          cantidad: p.cantidad || 1,
          trimestre: p.trimestre || paquete.trimestre || null,
          paqueteId: paquete.id,
          plantillaId: p.id,
          gestanteId: gestante.id,
          estado: 'PENDIENTE',
          estaAgendado: false
        };
      });

      await tx.eventoMedico.createMany({ data: eventosParaCrear });
    });

    res.json({ message: 'Paquete sincronizado correctamente', paquete: paquete.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al sincronizar paquete' });
  }
});

// DELETE /api/paquetes/:id - Eliminar paquete
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.paqueteEventos.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Paquete eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar paquete' });
  }
});

// POST /api/paquetes/aplicar/:paqueteId/materna/:gestanteId
router.post('/aplicar/:paqueteId/materna/:gestanteId', authMiddleware, async (req, res) => {
  try {
    const { gestanteId, paqueteId } = req.params;

    const gestante = await prisma.gestante.findUnique({ 
        where: { id: parseInt(gestanteId) },
        include: { ingresoCPN: true }
    });
    const paquete = await prisma.paqueteEventos.findUnique({
      where: { id: parseInt(paqueteId) },
      include: { plantillas: true }
    });

    if (!gestante || !paquete) {
      return res.status(404).json({ error: 'Paciente o paquete no encontrado' });
    }

    const eventosExistentes = await prisma.eventoMedico.findMany({
      where: {
        gestanteId: parseInt(gestanteId),
        paqueteId: parseInt(paqueteId),
        plantillaId: { not: null },
        estado: { not: 'PENDIENTE' }
      },
      select: { plantillaId: true }
    });
    const plantillasExistentesIds = eventosExistentes.map(e => e.plantillaId);

    const fur = gestante.ingresoCPN?.fur || gestante.createdAt;
    const startDate = new Date(fur);
    const plantillasNuevas = paquete.plantillas.filter(p => !plantillasExistentesIds.includes(p.id));

    const eventosParaCrear = plantillasNuevas.map(p => {
      const fechaProgramada = new Date(startDate);
      fechaProgramada.setDate(fechaProgramada.getDate() + (p.semanasRelativas * 7));
      
      return {
        tipo: p.tipo,
        descripcion: p.descripcion,
        fechaProgramada,
        esObligatorio: !!p.esObligatorio,
        esControl: !!p.esControl,
        codigoCUPS: p.codigoCUPS,
        cantidad: p.cantidad || 1,
        trimestre: p.trimestre || paquete.trimestre,
        paqueteId: paquete.id,
        plantillaId: p.id,
        gestanteId: gestante.id,
        estado: 'PENDIENTE',
        estaAgendado: false
      };
    });

    const created = await prisma.eventoMedico.createMany({
      data: eventosParaCrear
    });

    res.json({ message: 'Paquete aplicado correctamente', count: created.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al aplicar paquete' });
  }
});

module.exports = router;
