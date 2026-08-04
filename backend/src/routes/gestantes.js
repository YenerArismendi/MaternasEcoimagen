const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/maternas - listar todas las gestantes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const gestantes = await prisma.gestante.findMany({
      include: {
        creadaPor: {
          select: { nombre: true }
        },
        eventos: {
          where: { estado: 'PENDIENTE' },
          select: {
            id: true,
            tipo: true,
            descripcion: true,
            fechaProgramada: true,
            estado: true,
            estaAgendado: true,
            fechaAgendamiento: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const allEventsForPackages = await prisma.eventoMedico.findMany({
       where: { gestanteId: { in: gestantes.map(m => m.id) } },
       select: { gestanteId: true, paqueteId: true, tipo: true, esControl: true }
    });
    
    // Agrupar por gestante
    const pkgMap = {};
    allEventsForPackages.forEach(e => {
       if (!pkgMap[e.gestanteId]) pkgMap[e.gestanteId] = { s: new Set(), basico: false };
       if (e.paqueteId) pkgMap[e.gestanteId].s.add(e.paqueteId);
       if (e.tipo === 'CITA' && e.esControl && !e.paqueteId) pkgMap[e.gestanteId].basico = true;
    });

    const processedGestantes = gestantes.map(m => {
       const p = pkgMap[m.id] || { s: new Set(), basico: false };
       const arr = Array.from(p.s);
       if (p.basico) arr.push('basico');
       return { ...m, paquetesSeleccionados: arr };
    });

    res.json(processedGestantes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener registros de gestantes' });
  }
});

// POST /api/maternas - registrar nueva gestante
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      nombres,
      apellidos, 
      numeroIdentificacion, 
      tipoIdentificacion, 
      fechaNacimiento, 
      fechaEmbarazo, 
      // Campos opcionales del body (compatibilidad con frontend anterior si se envía 'nombre' como string único)
      nombre
    } = req.body;

    // Lógica para separar nombre si viene en un solo campo
    let finalNombres = nombres;
    let finalApellidos = apellidos;
    if (nombre && !nombres) {
       const partes = nombre.split(' ');
       finalApellidos = partes.length > 2 ? partes.slice(-2).join(' ') : (partes[1] || '');
       finalNombres = partes.length > 2 ? partes.slice(0, -2).join(' ') : (partes[0] || '');
    }

    if (!finalNombres || !numeroIdentificacion || !tipoIdentificacion || !fechaNacimiento || !fechaEmbarazo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const existing = await prisma.gestante.findUnique({ where: { numeroIdentificacion } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una paciente con ese número de documento' });
    }

    // Crear la gestante y sus tablas relacionadas por defecto (vacías)
    const gestante = await prisma.gestante.create({
      data: {
        nombres: finalNombres,
        apellidos: finalApellidos || '',
        numeroIdentificacion,
        tipoIdentificacion,
        fechaNacimiento: new Date(fechaNacimiento),
        departamento: req.body.departamento,
        municipio: req.body.municipio,
        telefonoCel1: req.body.telefono,
        direccion: req.body.direccion,
        etnia: req.body.etnia,
        identidadGenero: req.body.identidadGenero,
        discapacidad: req.body.discapacidad,
        victimaViolencia: req.body.victimaViolencia,
        creadaPorId: req.user.id,
        // Inicializar tablas relacionadas
        antecedentes: { create: {} },
        ingresoCPN: { 
            create: {
                fur: new Date(fechaEmbarazo)
            } 
        },
        paraclinicos: { create: {} },
        egresoYPosparto: { create: {} }
      },
      include: {
        creadaPor: { select: { nombre: true } },
        antecedentes: true,
        ingresoCPN: true
      }
    });

    res.status(201).json(gestante);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar paciente' });
  }
});

// PUT /api/maternas/:id - editar datos de gestante
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData = {};
    if (data.nombres) updateData.nombres = data.nombres;
    if (data.apellidos) updateData.apellidos = data.apellidos;
    if (data.numeroIdentificacion) updateData.numeroIdentificacion = data.numeroIdentificacion;
    if (data.tipoIdentificacion) updateData.tipoIdentificacion = data.tipoIdentificacion;
    if (data.fechaNacimiento) updateData.fechaNacimiento = new Date(data.fechaNacimiento);
    
    // Mapeo de campos adicionales
    if (data.departamento) updateData.departamento = data.departamento;
    if (data.municipio) updateData.municipio = data.municipio;
    if (data.telefono) updateData.telefonoCel1 = data.telefono;
    if (data.direccion) updateData.direccion = data.direccion;
    if (data.etnia) updateData.etnia = data.etnia;
    if (data.identidadGenero) updateData.identidadGenero = data.identidadGenero;
    if (data.discapacidad) updateData.discapacidad = data.discapacidad;
    if (data.victimaViolencia) updateData.victimaViolencia = data.victimaViolencia;
    if (data.carpetaEntregada !== undefined) updateData.carpetaEntregada = String(data.carpetaEntregada).toUpperCase();

    // Actualización de sub-tablas
    if (data.antecedentes) {
        updateData.antecedentes = { update: data.antecedentes };
    }
    if (data.ingresoCPN) {
        updateData.ingresoCPN = { update: data.ingresoCPN };
    }
    if (data.paraclinicos) {
        updateData.paraclinicos = { update: data.paraclinicos };
    }
    if (data.egresoYPosparto) {
        updateData.egresoYPosparto = { update: data.egresoYPosparto };
    }

    const gestante = await prisma.gestante.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        creadaPor: { select: { nombre: true } },
        antecedentes: true,
        ingresoCPN: true,
        paraclinicos: true,
        egresoYPosparto: true
      }
    });

    res.json(gestante);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar datos de paciente' });
  }
});

// DELETE /api/maternas/:id - eliminar registro (solo ADMIN)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await prisma.gestante.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar registro' });
  }
});

// GET /api/maternas/:id - obtener detalle de una gestante
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const gestanteId = parseInt(id);

    const gestante = await prisma.gestante.findUnique({
      where: { id: gestanteId },
      include: {
        creadaPor: { select: { nombre: true } },
        antecedentes: true,
        ingresoCPN: true,
        paraclinicos: true,
        egresoYPosparto: true,
        controles: { orderBy: { numeroControl: 'asc' } },
        seguimientosTelef: { orderBy: { numeroSeguimiento: 'asc' } },
        eventos: { 
            orderBy: { fechaProgramada: 'asc' },
            include: { prestadores: true } 
        }
      }
    });

    if (!gestante) {
      return res.status(404).json({ error: 'Paciente no encontrada' });
    }

    const paquetes = new Set();
    let hasBasico = false;
    gestante.eventos.forEach(e => {
       if (e.paqueteId) paquetes.add(e.paqueteId);
       if (e.tipo === 'CITA' && e.esControl && !e.paqueteId) hasBasico = true;
    });
    
    const paquetesSeleccionados = Array.from(paquetes);
    if (hasBasico) paquetesSeleccionados.push('basico');

    res.json({ ...gestante, paquetesSeleccionados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalle de gestante' });
  }
});

module.exports = router;
