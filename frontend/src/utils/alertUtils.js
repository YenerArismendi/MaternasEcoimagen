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
  const controles = materna.controles || [];

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper para verificar si existe un evento REALIZADO coincidente
  const isEventRealizado = (keywords) => {
    return eventos.some(e => {
      if (e.estado !== 'REALIZADO') return false;
      const desc = (e.descripcion || '').toLowerCase();
      return keywords.some(kw => desc.includes(kw.toLowerCase()));
    });
  };

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
    else if ((e.tipo === 'CONSULTA' || e.tipo === 'CONTROL' || e.tipo === 'CITA' || e.esControl) && !e.estaAgendado) {
      consultasPendientes.push(e);
    }
  });

  // 2. Hitos Normativos Faltantes (Consultas Médicas, Interdisciplinarias, Vacunas y Paraclínicos)
  // IMPORTANTE: Permanece activo solo hasta que se registre el resultado en la ficha o un evento REALIZADO.
  const hitosFaltantes = [];

  // CONSULTA DE INGRESO CONTROL PRENATAL (Semana 0+)
  const hasCPN = ingreso.fechaInscripcionCPN || ingreso.fechaIngresoCPN || ingreso.fechaCPN1 || ingreso.fur || controles.length > 0 || isEventRealizado(['cpn', 'ingreso cpn', 'control prenatal']);
  if (!hasCPN) {
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
    const hasHemoclasificacion = par.hemoclasificacion || par.Hemoclasificacion || isEventRealizado(['hemoclasificac']);
    if (!hasHemoclasificacion) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Hemoclasificación no registrada', tipo: 'urgente', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }

    const hasEco1 = par.ecografia1Trimestre || par.eco1_Interpretacion || par.eco1Interpretacion || par.eco1 || isEventRealizado(['ecografía 1', 'ecografia 1', 'eco 1', 'ecografía de 1er', 'ecografia de 1er']);
    if (!hasEco1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Ecografía de 1er Trimestre pendiente', tipo: 'urgente', ref: 'Semana 11-13', categoria: 'EXAMEN' });
    }

    const hasUrocultivo1 = par.urocultivo || par.urocultivo1 || isEventRealizado(['urocultivo']);
    if (!hasUrocultivo1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Urocultivo 1er Trimestre no registrado', tipo: 'alerta', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }

    const hasVih1 = par.vih_Resultado || par.vihResultado || par.vih_Fecha || par.vihFecha || par.vih1 || par.vih || isEventRealizado(['vih']);
    if (!hasVih1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba VIH (1er Trimestre) no registrada', tipo: 'urgente', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }

    const hasSifilis1 = par.sifilis_Resultado || par.sifilisResultado || par.sifilis_Fecha || par.sifilisFecha || par.vdrl1 || par.sifilis || isEventRealizado(['sifilis', 'sífilis', 'vdrl']);
    if (!hasSifilis1) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba Sífilis/VDRL (1er Trimestre) no registrada', tipo: 'urgente', ref: '1er Trimestre (Sem 12+)', categoria: 'EXAMEN' });
    }
  }

  // CONSULTAS INTERDISCIPLINARIAS (Odontología, Nutrición, Psicología, Trabajo Social, Cursos)
  if (weeks >= 14) {
    const hasOdonto = egr.odontologia_Ctrl1 || egr.odontologiaCtrl1 || egr.odontologia_ctrl1 || egr.odontologia || isEventRealizado(['odontolog']);
    if (!hasOdonto) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Odontología (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 14+', categoria: 'CONSULTA' });
    }
  }

  if (weeks >= 16) {
    const hasNutri = egr.nutricion_Ctrl1 || egr.nutricionCtrl1 || egr.nutricion_ctrl1 || egr.nutricion || isEventRealizado(['nutric']);
    if (!hasNutri) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Nutrición (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 16+', categoria: 'CONSULTA' });
    }
  }

  if (weeks >= 18) {
    const hasPsico = egr.psicologia_Ctrl1 || egr.psicologiaCtrl1 || egr.psicologia_ctrl1 || egr.psicologia || isEventRealizado(['psicolog']);
    if (!hasPsico) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Psicología (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 18+', categoria: 'CONSULTA' });
    }
  }

  if (weeks >= 20) {
    const hasTrabajoSocial = egr.trabajoSocial_Ctrl1 || egr.trabajoSocialCtrl1 || egr.trabajoSocial_ctrl1 || egr.trabajoSocial || isEventRealizado(['trabajo social', 'social']);
    if (!hasTrabajoSocial) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta de Trabajo Social (Control 1) no registrada', tipo: 'alerta', ref: 'Semana 20+', categoria: 'CONSULTA' });
    }

    const hasCurso1 = egr.cursosMaternidad_F1 || egr.cursosMaternidadF1 || egr.asistenciaCursoMaternidad || egr.cursoMaternidad || isEventRealizado(['curso maternidad', 'curso de preparación', 'curso']);
    if (!hasCurso1) {
      hitosFaltantes.push({ id: 'ive_lactancia', titulo: 'Curso Maternidad y Paternidad (Sesión 1) no registrado', tipo: 'alerta', ref: 'Semana 20+', categoria: 'CONSULTA' });
    }
  }

  // 2do y 3er TRIMESTRE
  if (weeks >= 24) {
    const hasPtog = par.ptog_75gr || par.ptog75gr || par.ptog || isEventRealizado(['ptog', 'tolerancia a la glucosa']);
    if (!hasPtog) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba de Tolerancia a la Glucosa (PTOG 75g) pendiente', tipo: 'urgente', ref: 'Semana 24+', categoria: 'EXAMEN' });
    }

    const hasTdap = egr.fechaTdap || par.tdap || egr.tdap || isEventRealizado(['tdap', 'tosferina']);
    if (!hasTdap) {
      hitosFaltantes.push({ id: 'vacunas', titulo: 'Vacuna Tdap (Tosferina) pendiente', tipo: 'alerta', ref: 'Semana 26+', categoria: 'VACUNA' });
    }
  }

  if (weeks >= 28) {
    const hasGineco = controles.some(c => c.especialidad && (c.especialidad.toLowerCase().includes('ginec') || c.especialidad.toLowerCase().includes('obstet'))) || egr.consultaEspecialista || egr.ginecologia || isEventRealizado(['ginecolog', 'obstet', 'especialista']);
    if (!hasGineco) {
      hitosFaltantes.push({ id: 'interdisciplinario', titulo: 'Consulta por Ginecología / Obstetricia no registrada', tipo: 'alerta', ref: 'Semana 28+', categoria: 'CONSULTA' });
    }

    const hasAnticoncepcion = egr.fechaAsesoriaAnticoncepcion || egr.asesoriaAnticoncepcion || egr.anticoncepcion || isEventRealizado(['anticoncepción', 'anticoncepcion']);
    if (!hasAnticoncepcion) {
      hitosFaltantes.push({ id: 'ive_lactancia', titulo: 'Asesoría de Anticoncepción Pre-evento pendiente', tipo: 'alerta', ref: 'Semana 28+', categoria: 'CONSULTA' });
    }

    const hasVih3 = par.vih3_Resultado || par.vih3Resultado || par.vih3_Fecha || par.vih3Fecha || par.vih3 || isEventRealizado(['vih 3', 'tercer trimestre vih', 'vih (3er']);
    if (!hasVih3) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba VIH (3er Trimestre) no registrada', tipo: 'urgente', ref: '3er Trimestre (Sem 28+)', categoria: 'EXAMEN' });
    }

    const hasSifilis3 = par.sifilis3_Resultado || par.sifilis3Resultado || par.sifilis3_Fecha || par.sifilis3Fecha || par.sifilis3 || isEventRealizado(['sifilis 3', 'sífilis 3', 'tercer trimestre sifilis', 'vdrl 3']);
    if (!hasSifilis3) {
      hitosFaltantes.push({ id: 'paraclinicos', titulo: 'Prueba Sífilis/VDRL (3er Trimestre) no registrada', tipo: 'urgente', ref: '3er Trimestre (Sem 28+)', categoria: 'EXAMEN' });
    }
  }

  if (weeks >= 35) {
    const hasStgb = par.estreptococoB || par.stgb || isEventRealizado(['estreptococo', 'stgb']);
    if (!hasStgb) {
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

