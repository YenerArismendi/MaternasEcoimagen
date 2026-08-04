/**
 * Utility functions for calculating gestational alerts, required consultations and paraclínicos/exams
 */

export const calculateMaternaAlerts = (materna) => {
  if (!materna) return { citasVencidas: [], consultasPendientes: [], hitosFaltantes: [], total: 0, weeks: 0 };

  const now = new Date();
  const fur = materna.ingresoCPN?.fur || materna.createdAt;
  const start = fur ? new Date(fur) : now;
  const validStart = start && !isNaN(start.getTime()) ? start : now;
  const diffDays = Math.max(0, Math.ceil((now - validStart) / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(diffDays / 7);

  const eventos = materna.eventos || [];
  const par = materna.paraclinicos || {};
  const egr = materna.egresoYPosparto || {};
  const ingreso = materna.ingresoCPN || {};

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Eventos y Citas en estado PENDIENTE
  const citasVencidas = [];
  const consultasPendientes = [];

  eventos.forEach(e => {
    if (e.estado !== 'PENDIENTE') return;

    const targetDate = e.fechaAgendamiento ? new Date(e.fechaAgendamiento) : (e.fechaProgramada ? new Date(e.fechaProgramada) : null);
    
    // Si la fecha agendada o programada ya venció
    if (targetDate && targetDate < todayStart) {
      citasVencidas.push(e);
    } 
    // Si es una consulta médica/control pendiente de agendar o realizar
    else if (e.tipo === 'CONSULTA' || e.tipo === 'CONTROL' || e.tipo === 'CITA' || e.esControl || !e.estaAgendado) {
      consultasPendientes.push(e);
    }
  });

  // 2. Hitos Normativos Faltantes (Consultas Médicas, Interdisciplinarias, Vacunas y Paraclínicos)
  // IMPORTANTE: Permanece activo hasta que se registre el resultado o la atención en la ficha.
  const hitosFaltantes = [];

  // CONSULTA DE INGRESO CONTROL PRENATAL (Semana 0+)
  if (!ingreso.fechaIngresoCPN && !ingreso.fechaCPN1 && !ingreso.fur) {
    hitosFaltantes.push({ 
      id: 'cpn', 
      titulo: 'Consulta de Ingreso a Control Prenatal (CPN) pendiente', 
      tipo: 'urgente', 
      ref: 'Ingreso CPN (Semana 1-12)',
      categoria: 'CONSULTA'
    });
  }

  // 1er TRIMESTRE (Semana 12+)
  if (weeks >= 12) {
    if (!par.hemoclasificacion) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Hemoclasificación no registrada', tipo: 'urgente', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }
    if (!par.eco1_Interpretacion && !par.ecografia1Trimestre && !par.eco1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Ecografía de 1er Trimestre pendiente', tipo: 'urgente', ref: 'Semana 11-13', categoria: 'EXAMEN' });
    }
    if (!par.urocultivo && !par.urocultivo1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Urocultivo 1er Trimestre no registrado', tipo: 'alerta', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }
    if (!par.vih1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba VIH (1er Trimestre) no registrada', tipo: 'urgente', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }
    if (!par.vdrl1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba Sífilis/VDRL (1er Trimestre) no registrada', tipo: 'urgente', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }
  }

  // CONSULTAS INTERDISCIPLINARIAS (Odontología, Nutrición, Psicología, Trabajo Social, Cursos)
  if (weeks >= 14) {
    if (!egr.odontologia_Ctrl1 && !egr.odontologia) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Odontología (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 14+', categoria: 'CONSULTA' });
    }
  }

  if (weeks >= 16) {
    if (!egr.nutricion_Ctrl1 && !egr.nutricion) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Nutrición (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 16+', categoria: 'CONSULTA' });
    }
  }

  if (weeks >= 18) {
    if (!egr.psicologia_Ctrl1 && !egr.psicologia) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Psicología (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 18+', categoria: 'CONSULTA' });
    }
  }

  if (weeks >= 20) {
    if (!egr.trabajoSocial_Ctrl1 && !egr.trabajoSocial) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Trabajo Social (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 20+', categoria: 'CONSULTA' });
    }
    if (!egr.cursosMaternidad_F1 && !egr.cursoMaternidad) {
      hitosFaltantes.push({ id: 'ive_lactancia', titulo: 'Curso Maternidad y Paternidad (Sesión 1) no registrado', tipo: 'alerta', ref: 'Semana 20+', categoria: 'CONSULTA' });
    }
  }

  // 2do y 3er TRIMESTRE
  if (weeks >= 24) {
    if (!par.ptog_75gr && !par.ptog) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba de Tolerancia a la Glucosa (PTOG 75g) pendiente', tipo: 'urgente', ref: 'Semana 24+', categoria: 'EXAMEN' });
    }
    if (!egr.fechaTdap && !par.tdap && !egr.tdap) {
      hitosFaltantes.push({ id: 'vacunas', titulo: 'Vacuna Tdap (Tosferina) pendiente', tipo: 'alerta', ref: 'Semana 26+', categoria: 'VACUNA' });
    }
  }

  if (weeks >= 28) {
    if (!egr.consultaEspecialista && !egr.ginecologia) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta por Ginecología / Obstetricia no registrada', tipo: 'alerta', ref: 'Semana 28+', categoria: 'CONSULTA' });
    }
    if (!egr.fechaAsesoriaAnticoncepcion && !egr.anticoncepcion) {
      hitosFaltantes.push({ id: 'ive_lactancia', titulo: 'Asesoría de Anticoncepción Pre-evento pendiente', tipo: 'alerta', ref: 'Semana 28+', categoria: 'CONSULTA' });
    }
    if (!par.vih2) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba VIH (3er Trimestre) no registrada', tipo: 'urgente', ref: '3er Trimestre (Sem 28+)', categoria: 'EXAMEN' });
    }
    if (!par.vdrl2) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba Sífilis/VDRL (3er Trimestre) no registrada', tipo: 'urgente', ref: '3er Trimestre (Sem 28+)', categoria: 'EXAMEN' });
    }
  }

  if (weeks >= 35) {
    if (!par.estreptococoB && !par.stgb) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Tamizaje Estreptococo Grupo B (STGB) pendiente', tipo: 'urgente', ref: 'Semana 35+', categoria: 'EXAMEN' });
    }
  }

  return {
    citasVencidas,
    consultasPendientes,
    hitosFaltantes,
    total: citasVencidas.length + consultasPendientes.length + hitosFaltantes.length,
    weeks
  };
};
