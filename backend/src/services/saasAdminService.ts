/**
 * Servicio para Administración SaaS
 * FASE 2.2 - Consolidación SaaS
 * FASE 2.3 - Panel Master Admin Avanzado
 * 
 * Maneja toda la lógica de negocio del Panel Master Admin:
 * - Creación de empresas (tenants)
 * - Gestión de licencias
 * - Estadísticas del dashboard
 * - Detalle de empresa
 * - Gestión de admin principal
 * - Auditoría
 * 
 * ✅ Lógica de negocio
 * ✅ Transacciones
 * ✅ Validaciones
 * ✅ Auditoría
 */

import { db } from '../database/database';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { sql } from 'kysely';
import { LicenciaRepository } from '../repositories/licenciaRepository';
import { EmpresaRepository } from '../repositories/empresaRepository';
import {
  CrearEmpresaDTO,
  TenantCreado,
  CrearLicenciaDTO,
  DashboardStats,
  EmpresaConDetalles,
  PlanType,
  EmpresaDetalleCompleto,
  MetricasEmpresa,
  SaludEmpresa,
  AlertaSaaS,
  AdminPrincipal,
  UsuarioResumenSaaS,
  LicenciaDetalle,
  LicenciaHistorial,
  AuditoriaAccion,
  CrearAuditoriaDTO,
  AuditoriaRegistro,
  OperacionConPassword,
  ExtenderLicenciaDTO,
  CambiarPlanDTO,
  EliminarEmpresaDTO,
  EmpresaEliminadaResponse
} from '../types/saas-admin.types';

export class SaasAdminService {
  private licenciaRepo = new LicenciaRepository();
  private empresaRepo = new EmpresaRepository();

  /**
   * Genera un password temporal seguro
   */
  private generarPasswordTemporal(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Genera un slug único para la empresa
   */
  private generarSlug(nombre: string): string {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-')     // Reemplazar caracteres especiales
      .replace(/^-|-$/g, '');          // Quitar guiones al inicio/final
  }

  /**
   * Crear un nuevo tenant (empresa + usuario admin + licencia)
   * Este es el flujo principal de onboarding controlado
   */
  async crearTenant(data: CrearEmpresaDTO): Promise<TenantCreado> {
    const { nombre, emailAdmin, nombreAdmin, telefono, direccion } = data;

    // Validaciones
    if (!nombre || nombre.trim().length < 3) {
      throw new Error('El nombre de la empresa debe tener al menos 3 caracteres');
    }

    if (!emailAdmin || !this.validarEmail(emailAdmin)) {
      throw new Error('Email del administrador inválido');
    }

    if (!nombreAdmin || nombreAdmin.trim().length < 2) {
      throw new Error('El nombre del administrador es requerido');
    }

    // Verificar email único
    const emailExiste = await db
      .selectFrom('usuarios')
      .select('id')
      .where('email', '=', emailAdmin.toLowerCase().trim())
      .executeTakeFirst();

    if (emailExiste) {
      throw new Error('El email ya está registrado en el sistema');
    }

    // Generar datos
    const empresaId = uuidv4();
    const usuarioId = uuidv4();
    const rolId = uuidv4();
    const passwordTemporal = this.generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);
    const slug = this.generarSlug(nombre);
    const ahora = new Date();

    // Permisos base del sistema
    const PERMISOS_SISTEMA = [
      'crear_comandas', 'gestionar_caja', 'ver_reportes', 'ver_historial',
      'gestion_menu', 'gestion_espacios', 'gestionar_sistema', 'nomina.gestion'
    ];

    return await db.transaction().execute(async (trx) => {
      // 1. Crear Empresa
      await trx
        .insertInto('empresas')
        .values({
          id: empresaId,
          nombre: nombre.trim(),
          slug,
          direccion: direccion || null,
          telefono: telefono || null,
          email_contacto: emailAdmin.toLowerCase().trim(),
          estado: 'activo',
          plan_actual: 'ninguno',
          max_usuarios: this.getMaxUsuariosPorPlan('basico'),
          origen: 'manual',
          licencia_activa: false
        } as any)
        .execute();

      // 2. Crear Rol Admin para la empresa
      await trx
        .insertInto('roles')
        .values({
          id: rolId,
          empresa_id: empresaId,
          nombre: 'Administrador',
          descripcion: 'Administrador principal de la empresa',
          es_superusuario: true
        })
        .execute();

      // 3. Asignar todos los permisos al rol
      const permisos = await trx
        .selectFrom('permisos')
        .select(['id', 'clave'])
        .where('clave', 'in', PERMISOS_SISTEMA)
        .execute();

      if (permisos.length > 0) {
        await trx
          .insertInto('permisos_rol')
          .values(permisos.map(p => ({
            rol_id: rolId,
            permiso_id: p.id,
            empresa_id: empresaId
          })))
          .execute();
      }

      // 4. Crear Usuario Admin
      // Generar nombre de usuario a partir del email (antes del @)
      const usuarioNombre = emailAdmin.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      await trx
        .insertInto('usuarios')
        .values({
          id: usuarioId,
          empresa_id: empresaId,
          rol_id: rolId,
          nombre: nombreAdmin.trim(),
          usuario: usuarioNombre,
          email: emailAdmin.toLowerCase().trim(),
          password_hash: passwordHash,
          activo: true,
          is_super_admin: false
        } as any)
        .execute();

      // 5. Crear categorías por defecto
      const categoriasDefault = ['Platos Fuertes', 'Bebidas', 'Entradas', 'Postres'];
      for (const [index, nombreCat] of categoriasDefault.entries()) {
        await trx
          .insertInto('categorias_productos')
          .values({
            id: uuidv4(),
            empresa_id: empresaId,
            nombre: nombreCat,
            orden: index,
            activo: true
          })
          .execute();
      }

      return {
        empresa: {
          id: empresaId,
          nombre: nombre.trim(),
          slug
        },
        usuarioAdmin: {
          id: usuarioId,
          nombre: nombreAdmin.trim(),
          usuario: usuarioNombre, // El nombre de usuario para login
          email: emailAdmin.toLowerCase().trim(),
          passwordTemporal // ¡IMPORTANTE: Mostrar esto al admin SaaS!
        },
        licencia: null
      };
    });
  }

  /**
   * Listar todas las empresas con detalles
   * ⚠️ Filtra empresas eliminadas por defecto (deleted_at IS NULL)
   */
  async listarEmpresas(filtros?: { estado?: string }): Promise<EmpresaConDetalles[]> {
    let query = db
      .selectFrom('empresas')
      .leftJoin('licencias', (join) =>
        join
          .onRef('licencias.empresa_id', '=', 'empresas.id')
          // Incluir todos los estados de licencia válidos para mostrar en dashboard
          .on('licencias.estado', 'in', ['activo', 'prueba', 'pausado', 'expirado'])
      )
      .select([
        'empresas.id',
        'empresas.nombre',
        'empresas.slug',
        'empresas.estado',
        'empresas.plan_actual',
        'empresas.max_usuarios',
        'empresas.email_contacto',
        'empresas.telefono',
        'empresas.direccion',
        'empresas.created_at',
        'licencias.id as licencia_id',
        'licencias.plan as licencia_plan',
        'licencias.estado as licencia_estado',
        'licencias.fecha_inicio as licencia_fecha_inicio',
        'licencias.fecha_fin as licencia_fecha_fin'
      ])
      // ⚠️ CRÍTICO: Solo empresas NO eliminadas
      .where('empresas.deleted_at', 'is', null);

    if (filtros?.estado) {
      query = query.where('empresas.estado', '=', filtros.estado);
    }

    const empresas = await query.orderBy('empresas.created_at', 'desc').execute();

    // Obtener conteo de usuarios por empresa
    const usuariosCounts = await db
      .selectFrom('usuarios')
      .select(['empresa_id', sql<number>`count(*)::int`.as('count')])
      .where('activo', '=', true)
      .groupBy('empresa_id')
      .execute();

    const countsMap = new Map(usuariosCounts.map(u => [u.empresa_id, u.count]));

    return empresas.map(e => ({
      id: e.id,
      nombre: e.nombre,
      slug: e.slug,
      estado: e.estado,
      plan_actual: e.plan_actual || 'ninguno',
      max_usuarios: e.max_usuarios || 5,
      email_contacto: e.email_contacto,
      telefono: e.telefono,
      direccion: e.direccion,
      created_at: new Date(e.created_at as any),
      usuarios_count: countsMap.get(e.id) || 0,
      licencia_activa: e.licencia_id ? {
        id: e.licencia_id,
        plan: e.licencia_plan || 'basico',
        estado: e.licencia_estado || 'activo',
        fecha_inicio: new Date(e.licencia_fecha_inicio as any),
        fecha_fin: e.licencia_fecha_fin ? new Date(e.licencia_fecha_fin as any) : null,
        dias_restantes: e.licencia_fecha_fin 
          ? Math.ceil((new Date(e.licencia_fecha_fin as any).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
      } : null
    }));
  }

  /**
   * Obtener estadísticas del dashboard
   * ⚠️ Excluye empresas eliminadas de las estadísticas
   */
  async obtenerEstadisticas(): Promise<DashboardStats> {
    const [empresasStats, licenciasActivas, licenciasPorExpirar, licenciasExpiradas, totalUsuarios] = await Promise.all([
      // Estadísticas de empresas (solo NO eliminadas)
      db.selectFrom('empresas')
        .select([
          sql<number>`count(*)::int`.as('total'),
          sql<number>`count(*) filter (where estado = 'activo')::int`.as('activas'),
          sql<number>`count(*) filter (where estado = 'suspendido')::int`.as('suspendidas')
        ])
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),

      // Licencias activas
      db.selectFrom('licencias')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('estado', 'in', ['activo', 'prueba'])
        .executeTakeFirst(),

      // Licencias por expirar (30 días)
      this.licenciaRepo.countExpiringInDays(30),

      // Licencias expiradas
      this.licenciaRepo.countExpired(),

      // Total usuarios
      db.selectFrom('usuarios')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('is_super_admin', '=', false)
        .executeTakeFirst()
    ]);

    // Contar empresas en prueba
    const empresasEnPrueba = await db
      .selectFrom('licencias')
      .select(sql<number>`count(distinct empresa_id)::int`.as('count'))
      .where('estado', '=', 'prueba')
      .executeTakeFirst();

    return {
      empresas: {
        total: empresasStats?.total || 0,
        activas: empresasStats?.activas || 0,
        suspendidas: empresasStats?.suspendidas || 0,
        enPrueba: empresasEnPrueba?.count || 0
      },
      licencias: {
        activas: licenciasActivas?.count || 0,
        porExpirar: licenciasPorExpirar,
        expiradas: licenciasExpiradas
      },
      usuarios: {
        total: totalUsuarios?.count || 0
      }
    };
  }

  /**
   * Cambiar estado de una empresa
   */
  async cambiarEstadoEmpresa(empresaId: string, nuevoEstado: 'activo' | 'suspendido') {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    await db
      .updateTable('empresas')
      .set({ estado: nuevoEstado, updated_at: new Date().toISOString() } as any)
      .where('id', '=', empresaId)
      .execute();

    return { empresaId, estado: nuevoEstado };
  }

  /**
   * Crear nueva licencia para empresa existente
   */
  async crearLicencia(data: CrearLicenciaDTO) {
    const empresa = await this.empresaRepo.findById(data.empresaId);
    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // Desactivar licencia anterior si existe
    await db
      .updateTable('licencias')
      .set({ estado: 'reemplazada', updated_at: new Date().toISOString() } as any)
      .where('empresa_id', '=', data.empresaId)
      .where('estado', 'in', ['activo', 'prueba'])
      .execute();

    // Calcular fecha fin usando días (365 días = 1 año)
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + data.duracionDias);

    // Determinar estado según si es prueba o no
    const estadoLicencia = data.esPrueba ? 'prueba' : 'activo';

    const licencia = await this.licenciaRepo.create({
      empresa_id: data.empresaId,
      plan: data.plan,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: estadoLicencia,
      max_usuarios: data.maxUsuarios || this.getMaxUsuariosPorPlan(data.plan),
      max_mesas: data.maxMesas || this.getMaxMesasPorPlan(data.plan),
      features: data.features || this.getFeaturesPorPlan(data.plan),
      notas: data.notas
    });

    // Actualizar empresa
    await db
      .updateTable('empresas')
      .set({ 
        plan_actual: data.plan, 
        licencia_activa: true,
        max_usuarios: data.maxUsuarios || this.getMaxUsuariosPorPlan(data.plan),
        updated_at: new Date().toISOString() 
      } as any)
      .where('id', '=', data.empresaId)
      .execute();

    return licencia;
  }

  /**
   * Listar licencias
   */
  async listarLicencias(filtros?: { estado?: string; plan?: string }) {
    return await this.licenciaRepo.findAll(filtros);
  }

  // === Helpers ===

  private validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  private getMaxUsuariosPorPlan(plan: PlanType): number {
    // Usar configuración dinámica de planesConfig
    return this.planesConfig[plan]?.max_usuarios || 5;
  }

  private getMaxMesasPorPlan(plan: PlanType): number {
    // Usar configuración dinámica de planesConfig
    return this.planesConfig[plan]?.max_mesas || 20;
  }

  private getFeaturesPorPlan(plan: PlanType): Record<string, boolean> {
    // Usar configuración dinámica de planesConfig
    return this.planesConfig[plan]?.features || {
      comandas: true,
      mesas: true,
      facturacion_simple: true,
      reportes_basicos: true
    };
  }

  // ============================================
  // FASE 2.3 - FUNCIONALIDADES AVANZADAS
  // ============================================

  /**
   * Obtener detalle completo de una empresa (Tenant Detail)
   * Incluye verificación de estado de eliminación
   */
  async obtenerDetalleEmpresa(empresaId: string): Promise<EmpresaDetalleCompleto> {
    // Obtener datos básicos de la empresa
    const empresa = await db
      .selectFrom('empresas')
      .select([
        'id', 'nombre', 'slug', 'email_contacto', 'telefono', 'direccion',
        'plan_actual', 'estado', 'created_at', 'updated_at', 'deleted_at'
      ])
      .where('id', '=', empresaId)
      .executeTakeFirst();

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    // Verificar si está eliminada
    if (empresa.deleted_at) {
      throw new Error('Esta empresa ha sido eliminada y no puede ser consultada desde aquí');
    }

    // Obtener en paralelo toda la información
    const [licenciaActiva, historialLicencias, adminPrincipal, metricas, usuarios] = await Promise.all([
      this.obtenerLicenciaActiva(empresaId),
      this.obtenerHistorialLicencias(empresaId),
      this.obtenerAdminPrincipal(empresaId),
      this.obtenerMetricasEmpresa(empresaId),
      this.obtenerUsuariosResumen(empresaId)
    ]);

    // Calcular salud de la empresa
    const salud = await this.calcularSaludEmpresa(empresaId, metricas, licenciaActiva);

    return {
      id: empresa.id,
      nombre: empresa.nombre,
      slug: empresa.slug,
      email_contacto: empresa.email_contacto,
      telefono: empresa.telefono,
      direccion: empresa.direccion,
      plan_actual: empresa.plan_actual || 'ninguno',
      estado: empresa.estado as any,
      created_at: new Date(empresa.created_at as any),
      updated_at: empresa.updated_at ? new Date(empresa.updated_at as any) : null,
      licencia: licenciaActiva,
      historial_licencias: historialLicencias,
      admin_principal: adminPrincipal,
      metricas,
      salud,
      usuarios_resumen: usuarios
    };
  }

  /**
   * Obtener licencia activa de una empresa
   */
  private async obtenerLicenciaActiva(empresaId: string): Promise<LicenciaDetalle | null> {
    const licencia = await db
      .selectFrom('licencias')
      .select([
        'id', 'plan', 'estado', 'fecha_inicio', 'fecha_fin',
        'max_usuarios', 'max_mesas', 'features', 'notas', 'created_at'
      ])
      .where('empresa_id', '=', empresaId)
      // Incluir todos los estados que deben mostrarse como "licencia actual"
      .where('estado', 'in', ['activo', 'prueba', 'pausado', 'expirado'])
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!licencia) return null;

    return {
      id: licencia.id,
      plan: licencia.plan as PlanType,
      estado: licencia.estado as any,
      fecha_inicio: new Date(licencia.fecha_inicio as any),
      fecha_fin: licencia.fecha_fin ? new Date(licencia.fecha_fin as any) : null,
      dias_restantes: licencia.fecha_fin 
        ? Math.ceil((new Date(licencia.fecha_fin as any).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
      max_usuarios: licencia.max_usuarios || 5,
      max_mesas: licencia.max_mesas || 20,
      features: (licencia.features as Record<string, boolean>) || {},
      notas: licencia.notas,
      created_at: new Date(licencia.created_at as any)
    };
  }

  /**
   * Obtener historial de licencias
   */
  private async obtenerHistorialLicencias(empresaId: string): Promise<LicenciaHistorial[]> {
    const licencias = await db
      .selectFrom('licencias')
      .select(['id', 'plan', 'estado', 'fecha_inicio', 'fecha_fin', 'notas'])
      .where('empresa_id', '=', empresaId)
      .orderBy('created_at', 'desc')
      .limit(10)
      .execute();

    return licencias.map(l => ({
      id: l.id,
      plan: l.plan as PlanType,
      estado: l.estado as any,
      fecha_inicio: new Date(l.fecha_inicio as any),
      fecha_fin: l.fecha_fin ? new Date(l.fecha_fin as any) : null,
      notas: l.notas
    }));
  }

  /**
   * Obtener admin principal de la empresa
   */
  private async obtenerAdminPrincipal(empresaId: string): Promise<AdminPrincipal | null> {
    // El admin principal es el primer usuario creado o el que tiene rol Admin
    const admin = await db
      .selectFrom('usuarios')
      .leftJoin('roles', 'roles.id', 'usuarios.rol_id')
      .select([
        'usuarios.id',
        'usuarios.nombre',
        'usuarios.email',
        'usuarios.activo',
        'usuarios.ultimo_login',
        'usuarios.bloqueado'
      ])
      .where('usuarios.empresa_id', '=', empresaId)
      .where('usuarios.is_super_admin', '=', false)
      .orderBy('usuarios.created_at', 'asc')
      .executeTakeFirst();

    if (!admin) return null;

    return {
      id: admin.id,
      nombre: admin.nombre,
      email: admin.email,
      activo: admin.activo,
      ultimo_login: admin.ultimo_login ? new Date(admin.ultimo_login as any) : null,
      bloqueado: admin.bloqueado || false
    };
  }

  /**
   * Obtener métricas de una empresa
   */
  async obtenerMetricasEmpresa(empresaId: string): Promise<MetricasEmpresa> {
    const [usuarios, comandas, facturas, ultimoLogin] = await Promise.all([
      // Conteo de usuarios
      db.selectFrom('usuarios')
        .select([
          sql<number>`count(*)::int`.as('total'),
          sql<number>`count(*) filter (where activo = true)::int`.as('activos')
        ])
        .where('empresa_id', '=', empresaId)
        .where('is_super_admin', '=', false)
        .executeTakeFirst(),

      // Conteo de comandas
      db.selectFrom('comandas')
        .select([
          sql<number>`count(*)::int`.as('total'),
          sql<number>`count(*) filter (where fecha_apertura >= now() - interval '30 days')::int`.as('ultimo_mes')
        ])
        .where('empresa_id', '=', empresaId)
        .executeTakeFirst(),

      // Conteo de facturas
      db.selectFrom('facturas')
        .select(sql<number>`count(*)::int`.as('total'))
        .where('empresa_id', '=', empresaId)
        .executeTakeFirst(),

      // Último login de cualquier usuario de la empresa
      db.selectFrom('usuarios')
        .select('ultimo_login')
        .where('empresa_id', '=', empresaId)
        .where('ultimo_login', 'is not', null)
        .orderBy('ultimo_login', 'desc')
        .executeTakeFirst()
    ]);

    // Última comanda y factura
    const [ultimaComanda, ultimaFactura] = await Promise.all([
      db.selectFrom('comandas')
        .select('fecha_apertura')
        .where('empresa_id', '=', empresaId)
        .orderBy('fecha_apertura', 'desc')
        .executeTakeFirst(),
      db.selectFrom('facturas')
        .select('fecha_emision')
        .where('empresa_id', '=', empresaId)
        .orderBy('fecha_emision', 'desc')
        .executeTakeFirst()
    ]);

    return {
      total_usuarios: usuarios?.total || 0,
      usuarios_activos: usuarios?.activos || 0,
      ultimo_login_empresa: ultimoLogin?.ultimo_login ? new Date(ultimoLogin.ultimo_login as any) : null,
      total_comandas: comandas?.total || 0,
      comandas_ultimo_mes: comandas?.ultimo_mes || 0,
      total_facturas: facturas?.total || 0,
      ultima_comanda: ultimaComanda?.fecha_apertura ? new Date(ultimaComanda.fecha_apertura as any) : null,
      ultima_factura: ultimaFactura?.fecha_emision ? new Date(ultimaFactura.fecha_emision as any) : null
    };
  }

  /**
   * Obtener usuarios resumen para vista SaaS
   */
  private async obtenerUsuariosResumen(empresaId: string): Promise<UsuarioResumenSaaS[]> {
    const usuarios = await db
      .selectFrom('usuarios')
      .leftJoin('roles', 'roles.id', 'usuarios.rol_id')
      .select([
        'usuarios.id',
        'usuarios.nombre',
        'usuarios.email',
        'usuarios.activo',
        'usuarios.ultimo_login',
        'roles.nombre as rol_nombre'
      ])
      .where('usuarios.empresa_id', '=', empresaId)
      .where('usuarios.is_super_admin', '=', false)
      .orderBy('usuarios.created_at', 'asc')
      .execute();

    return usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol_nombre: u.rol_nombre,
      activo: u.activo,
      ultimo_login: u.ultimo_login ? new Date(u.ultimo_login as any) : null
    }));
  }

  /**
   * Calcular estado de salud de la empresa
   */
  private async calcularSaludEmpresa(
    empresaId: string, 
    metricas: MetricasEmpresa,
    licencia: LicenciaDetalle | null
  ): Promise<SaludEmpresa> {
    const alertas: AlertaSaaS[] = [];
    
    // Calcular días sin acceso
    const diasSinAcceso = metricas.ultimo_login_empresa 
      ? Math.floor((Date.now() - metricas.ultimo_login_empresa.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Alerta: Sin actividad reciente
    if (diasSinAcceso !== null && diasSinAcceso > 14) {
      alertas.push({
        tipo: 'sin_actividad',
        mensaje: `Sin actividad hace ${diasSinAcceso} días`,
        severidad: diasSinAcceso > 30 ? 'danger' : 'warning',
        fecha: new Date()
      });
    }

    // Alerta: Licencia por expirar
    if (licencia && licencia.dias_restantes !== null && licencia.dias_restantes <= 7) {
      alertas.push({
        tipo: 'licencia_expira',
        mensaje: `Licencia expira en ${licencia.dias_restantes} días`,
        severidad: licencia.dias_restantes <= 3 ? 'danger' : 'warning',
        fecha: new Date()
      });
    }

    // Verificar límite de usuarios
    if (licencia && metricas.total_usuarios >= licencia.max_usuarios) {
      alertas.push({
        tipo: 'limite_usuarios',
        mensaje: `Límite de usuarios alcanzado (${metricas.total_usuarios}/${licencia.max_usuarios})`,
        severidad: 'warning',
        fecha: new Date()
      });
    }

    return {
      ultimo_acceso: metricas.ultimo_login_empresa,
      dias_sin_acceso: diasSinAcceso,
      estado_inventario: 'no_usa', // TODO: Implementar verificación real
      alertas_activas: alertas,
      errores_recientes: 0 // TODO: Implementar log de errores
    };
  }

  // ============================================
  // GESTIÓN ADMIN PRINCIPAL (OWNER)
  // ============================================

  /**
   * Resetear contraseña del admin principal
   */
  async resetearPasswordAdmin(
    empresaId: string, 
    adminContext: { id: string; email: string }
  ): Promise<OperacionConPassword> {
    const admin = await this.obtenerAdminPrincipal(empresaId);
    if (!admin) {
      throw new Error('Admin principal no encontrado');
    }

    const passwordTemporal = this.generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    await db
      .updateTable('usuarios')
      .set({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', admin.id)
      .execute();

    // Registrar en auditoría
    await this.registrarAuditoria({
      accion: 'admin_password_reset',
      empresa_id: empresaId,
      usuario_afectado_id: admin.id,
      detalles: { admin_email: admin.email },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return {
      success: true,
      mensaje: 'Contraseña reseteada exitosamente',
      passwordTemporal
    };
  }

  /**
   * Cambiar email del admin principal
   */
  async cambiarEmailAdmin(
    empresaId: string, 
    nuevoEmail: string,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean; mensaje: string }> {
    if (!this.validarEmail(nuevoEmail)) {
      throw new Error('Email inválido');
    }

    // Verificar que el email no esté en uso
    const emailExiste = await db
      .selectFrom('usuarios')
      .select('id')
      .where('email', '=', nuevoEmail.toLowerCase())
      .executeTakeFirst();

    if (emailExiste) {
      throw new Error('El email ya está registrado');
    }

    const admin = await this.obtenerAdminPrincipal(empresaId);
    if (!admin) {
      throw new Error('Admin principal no encontrado');
    }

    const emailAnterior = admin.email;

    await db
      .updateTable('usuarios')
      .set({ 
        email: nuevoEmail.toLowerCase(),
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', admin.id)
      .execute();

    // Registrar en auditoría
    await this.registrarAuditoria({
      accion: 'admin_email_cambiado',
      empresa_id: empresaId,
      usuario_afectado_id: admin.id,
      detalles: { email_anterior: emailAnterior, email_nuevo: nuevoEmail },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { success: true, mensaje: 'Email actualizado exitosamente' };
  }

  /**
   * Bloquear/Desbloquear admin (sin suspender empresa)
   */
  async toggleBloqueoAdmin(
    empresaId: string, 
    bloquear: boolean,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean; mensaje: string }> {
    const admin = await this.obtenerAdminPrincipal(empresaId);
    if (!admin) {
      throw new Error('Admin principal no encontrado');
    }

    await db
      .updateTable('usuarios')
      .set({ 
        bloqueado: bloquear,
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', admin.id)
      .execute();

    await this.registrarAuditoria({
      accion: bloquear ? 'admin_bloqueado' : 'admin_desbloqueado',
      empresa_id: empresaId,
      usuario_afectado_id: admin.id,
      detalles: {},
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { 
      success: true, 
      mensaje: bloquear ? 'Admin bloqueado' : 'Admin desbloqueado' 
    };
  }

  /**
   * Forzar cierre de sesiones de una empresa
   */
  async forzarCierreSesiones(
    empresaId: string,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean; sesiones_cerradas: number }> {
    const result = await db
      .deleteFrom('sesiones')
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    await this.registrarAuditoria({
      accion: 'sesiones_forzadas_cierre',
      empresa_id: empresaId,
      detalles: { sesiones_cerradas: Number(result.numDeletedRows) },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { 
      success: true, 
      sesiones_cerradas: Number(result.numDeletedRows) 
    };
  }

  // ============================================
  // GESTIÓN DE LICENCIAS AVANZADA
  // ============================================

  /**
   * Extender licencia manualmente
   */
  async extenderLicencia(
    data: ExtenderLicenciaDTO,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean; nueva_fecha_fin: Date }> {
    const licencia = await db
      .selectFrom('licencias')
      .select(['id', 'empresa_id', 'fecha_fin', 'estado'])
      .where('id', '=', data.licenciaId)
      .executeTakeFirst();

    if (!licencia) {
      throw new Error('Licencia no encontrada');
    }

    const fechaBase = licencia.fecha_fin ? new Date(licencia.fecha_fin as any) : new Date();
    const nuevaFechaFin = new Date(fechaBase);
    nuevaFechaFin.setDate(nuevaFechaFin.getDate() + data.dias);

    await db
      .updateTable('licencias')
      .set({
        fecha_fin: nuevaFechaFin,
        motivo_cambio: data.motivo || `Extensión manual de ${data.dias} días`,
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', data.licenciaId)
      .execute();

    await this.registrarAuditoria({
      accion: 'licencia_extendida',
      empresa_id: licencia.empresa_id,
      detalles: { 
        licencia_id: data.licenciaId, 
        dias: data.dias, 
        nueva_fecha_fin: nuevaFechaFin,
        motivo: data.motivo 
      },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { success: true, nueva_fecha_fin: nuevaFechaFin };
  }

  /**
   * Pausar licencia
   */
  async pausarLicencia(
    licenciaId: string,
    motivo: string,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean }> {
    const licencia = await db
      .selectFrom('licencias')
      .select(['id', 'empresa_id', 'estado'])
      .where('id', '=', licenciaId)
      .executeTakeFirst();

    if (!licencia) {
      throw new Error('Licencia no encontrada');
    }

    if (licencia.estado === 'pausado') {
      throw new Error('La licencia ya está pausada');
    }

    await db
      .updateTable('licencias')
      .set({
        estado: 'pausado',
        fecha_pausa: new Date(),
        motivo_cambio: motivo,
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', licenciaId)
      .execute();

    await this.registrarAuditoria({
      accion: 'licencia_pausada',
      empresa_id: licencia.empresa_id,
      detalles: { licencia_id: licenciaId, motivo },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { success: true };
  }

  /**
   * Reanudar licencia
   */
  async reanudarLicencia(
    licenciaId: string,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean; nueva_fecha_fin: Date | null }> {
    const licencia = await db
      .selectFrom('licencias')
      .select(['id', 'empresa_id', 'estado', 'fecha_pausa', 'fecha_fin', 'dias_pausados'])
      .where('id', '=', licenciaId)
      .executeTakeFirst();

    if (!licencia) {
      throw new Error('Licencia no encontrada');
    }

    if (licencia.estado !== 'pausado') {
      throw new Error('La licencia no está pausada');
    }

    // Calcular días pausados y extender fecha fin
    let nuevaFechaFin = licencia.fecha_fin ? new Date(licencia.fecha_fin as any) : null;
    let diasPausadosAdicionales = 0;

    if (licencia.fecha_pausa) {
      diasPausadosAdicionales = Math.ceil(
        (Date.now() - new Date(licencia.fecha_pausa as any).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (nuevaFechaFin) {
        nuevaFechaFin.setDate(nuevaFechaFin.getDate() + diasPausadosAdicionales);
      }
    }

    await db
      .updateTable('licencias')
      .set({
        estado: 'activo',
        fecha_pausa: null,
        fecha_fin: nuevaFechaFin,
        dias_pausados: (licencia.dias_pausados || 0) + diasPausadosAdicionales,
        motivo_cambio: 'Licencia reanudada',
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', licenciaId)
      .execute();

    await this.registrarAuditoria({
      accion: 'licencia_reanudada',
      empresa_id: licencia.empresa_id,
      detalles: { 
        licencia_id: licenciaId, 
        dias_pausados: diasPausadosAdicionales,
        nueva_fecha_fin: nuevaFechaFin 
      },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { success: true, nueva_fecha_fin: nuevaFechaFin };
  }

  /**
   * Cambiar plan de empresa
   */
  async cambiarPlan(
    data: CambiarPlanDTO,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean }> {
    const empresa = await this.empresaRepo.findById(data.empresaId);
    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    const planAnterior = empresa.plan_actual;

    // Actualizar empresa
    await db
      .updateTable('empresas')
      .set({
        plan_actual: data.nuevoPlan,
        max_usuarios: this.getMaxUsuariosPorPlan(data.nuevoPlan),
        updated_at: new Date().toISOString()
      } as any)
      .where('id', '=', data.empresaId)
      .execute();

    // Actualizar licencia activa
    await db
      .updateTable('licencias')
      .set({
        plan: data.nuevoPlan,
        max_usuarios: this.getMaxUsuariosPorPlan(data.nuevoPlan),
        max_mesas: this.getMaxMesasPorPlan(data.nuevoPlan),
        features: JSON.stringify(this.getFeaturesPorPlan(data.nuevoPlan)),
        motivo_cambio: data.motivo || `Cambio de plan: ${planAnterior} → ${data.nuevoPlan}`,
        updated_at: new Date().toISOString()
      } as any)
      .where('empresa_id', '=', data.empresaId)
      .where('estado', 'in', ['activo', 'prueba', 'pausado'])
      .execute();

    await this.registrarAuditoria({
      accion: 'licencia_plan_cambiado',
      empresa_id: data.empresaId,
      detalles: { 
        plan_anterior: planAnterior, 
        plan_nuevo: data.nuevoPlan,
        motivo: data.motivo 
      },
      admin_id: adminContext.id,
      admin_email: adminContext.email
    });

    return { success: true };
  }

  // ============================================
  // AUDITORÍA
  // ============================================

  /**
   * Registrar acción en auditoría
   */
  async registrarAuditoria(data: CrearAuditoriaDTO): Promise<void> {
    await db
      .insertInto('auditoria_saas')
      .values({
        id: uuidv4(),
        accion: data.accion,
        empresa_id: data.empresa_id || null,
        usuario_afectado_id: data.usuario_afectado_id || null,
        detalles: JSON.stringify(data.detalles),
        admin_id: data.admin_id,
        admin_email: data.admin_email
      } as any)
      .execute();
  }

  /**
   * Obtener auditoría de una empresa
   */
  async obtenerAuditoriaEmpresa(
    empresaId: string, 
    limite: number = 50
  ): Promise<AuditoriaRegistro[]> {
    // 1. Obtener auditoría general de la empresa
    const registrosSaas = await db
      .selectFrom('auditoria_saas')
      .leftJoin('empresas', 'empresas.id', 'auditoria_saas.empresa_id')
      .select([
        'auditoria_saas.id',
        'auditoria_saas.accion',
        'auditoria_saas.empresa_id',
        'empresas.nombre as empresa_nombre',
        'auditoria_saas.usuario_afectado_id',
        'auditoria_saas.detalles',
        'auditoria_saas.admin_id',
        'auditoria_saas.admin_email',
        'auditoria_saas.created_at'
      ])
      .where('auditoria_saas.empresa_id', '=', empresaId)
      .orderBy('auditoria_saas.created_at', 'desc')
      .limit(limite)
      .execute();

    // 2. Obtener auditoría de impersonaciones de la empresa
    const registrosImpersonacion = await (db
      .selectFrom('auditoria_impersonacion' as any) as any)
      .leftJoin('empresas', 'empresas.id', 'auditoria_impersonacion.empresa_id')
      .leftJoin('usuarios as usuario_impersonado', 'usuario_impersonado.id', 'auditoria_impersonacion.usuario_impersonado_id')
      .leftJoin('usuarios as super_admin', 'super_admin.id', 'auditoria_impersonacion.super_admin_id')
      .select([
        'auditoria_impersonacion.id',
        'auditoria_impersonacion.tipo_evento',
        'auditoria_impersonacion.empresa_id',
        'empresas.nombre as empresa_nombre',
        'usuario_impersonado.nombre as usuario_nombre',
        'usuario_impersonado.email as usuario_email',
        'super_admin.nombre as admin_nombre',
        'super_admin.email as admin_email',
        'auditoria_impersonacion.ip_address',
        'auditoria_impersonacion.metadata',
        'auditoria_impersonacion.fecha_inicio as created_at'
      ])
      .where('auditoria_impersonacion.empresa_id', '=', empresaId)
      .orderBy('auditoria_impersonacion.fecha_inicio', 'desc')
      .limit(limite)
      .execute();

    // 3. Mapear registros de auditoría SaaS
    const auditoriasSaas = registrosSaas.map(r => ({
      id: r.id,
      accion: r.accion as AuditoriaAccion,
      empresa_id: r.empresa_id,
      empresa_nombre: r.empresa_nombre,
      usuario_afectado_id: r.usuario_afectado_id,
      detalles: typeof r.detalles === 'string' ? JSON.parse(r.detalles) : r.detalles,
      admin_id: r.admin_id,
      admin_email: r.admin_email,
      created_at: new Date(r.created_at as any)
    }));

    // 4. Mapear registros de impersonación como auditoría
    const auditoriasImpersonacion = registrosImpersonacion.map((r: any) => {
      const metadata = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
      return {
        id: r.id,
        accion: r.tipo_evento === 'INICIADA' ? 'impersonacion_iniciada' : 'impersonacion_finalizada',
        empresa_id: r.empresa_id,
        empresa_nombre: r.empresa_nombre,
        usuario_afectado_id: null,
        detalles: {
          usuario_impersonado: r.usuario_nombre,
          usuario_email: r.usuario_email,
          super_admin: r.admin_nombre,
          ip_address: r.ip_address,
          ...metadata
        },
        admin_id: null,
        admin_email: r.admin_email,
        created_at: new Date(r.created_at as any)
      };
    });

    // 5. Combinar y ordenar por fecha
    const todosLosRegistros = [...auditoriasSaas, ...auditoriasImpersonacion]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, limite);

    return todosLosRegistros;
  }

  /**
   * Obtener toda la auditoría (para vista global)
   */
  async obtenerAuditoriaGlobal(limite: number = 100): Promise<AuditoriaRegistro[]> {
    const registros = await db
      .selectFrom('auditoria_saas')
      .leftJoin('empresas', 'empresas.id', 'auditoria_saas.empresa_id')
      .select([
        'auditoria_saas.id',
        'auditoria_saas.accion',
        'auditoria_saas.empresa_id',
        'empresas.nombre as empresa_nombre',
        'auditoria_saas.usuario_afectado_id',
        'auditoria_saas.detalles',
        'auditoria_saas.admin_id',
        'auditoria_saas.admin_email',
        'auditoria_saas.created_at'
      ])
      .orderBy('auditoria_saas.created_at', 'desc')
      .limit(limite)
      .execute();

    return registros.map(r => ({
      id: r.id,
      accion: r.accion as AuditoriaAccion,
      empresa_id: r.empresa_id,
      empresa_nombre: r.empresa_nombre,
      usuario_afectado_id: r.usuario_afectado_id,
      detalles: typeof r.detalles === 'string' ? JSON.parse(r.detalles) : r.detalles,
      admin_id: r.admin_id,
      admin_email: r.admin_email,
      created_at: new Date(r.created_at as any)
    }));
  }

  // ============================================
  // ELIMINACIÓN SEGURA DE EMPRESA (SOFT DELETE)
  // ============================================

  /**
   * Eliminar empresa de forma segura (soft delete)
   * 
   * Esta operación:
   * 1. Valida credenciales del super admin
   * 2. Verifica confirmación textual exacta
   * 3. Marca empresa como eliminada (deleted_at, deleted_by, delete_reason)
   * 4. Desactiva todos los usuarios de la empresa
   * 5. Invalida todas las sesiones
   * 6. Cancela la licencia activa
   * 7. Registra todo en auditoría
   * 
   * ⚠️ NO elimina datos físicamente - solo marca como eliminada
   */
  async eliminarEmpresa(
    data: EliminarEmpresaDTO,
    adminContext: { id: string; email: string },
    requestInfo?: { ip?: string; userAgent?: string }
  ): Promise<EmpresaEliminadaResponse> {
    const { empresaId, motivo, motivoDetalle, confirmacionTexto, passwordAdmin } = data;

    // 1. Obtener y validar empresa
    const empresa = await db
      .selectFrom('empresas')
      .select(['id', 'nombre', 'deleted_at'])
      .where('id', '=', empresaId)
      .executeTakeFirst();

    if (!empresa) {
      throw new Error('Empresa no encontrada');
    }

    if (empresa.deleted_at) {
      throw new Error('La empresa ya ha sido eliminada previamente');
    }

    // 2. Validar confirmación textual exacta
    const confirmacionEsperada = `ELIMINAR ${empresa.nombre}`;
    if (confirmacionTexto !== confirmacionEsperada) {
      throw new Error(`Confirmación incorrecta. Debe escribir exactamente: "${confirmacionEsperada}"`);
    }

    // 3. Validar motivo
    const motivosValidos = [
      'solicitud_cliente',
      'incumplimiento_pago',
      'violacion_terminos',
      'fraude_detectado',
      'empresa_duplicada',
      'cierre_negocio',
      'otro'
    ];
    if (!motivosValidos.includes(motivo)) {
      throw new Error('Motivo de eliminación inválido');
    }

    if (motivo === 'otro' && (!motivoDetalle || motivoDetalle.trim().length < 10)) {
      throw new Error('Debe proporcionar un detalle del motivo de al menos 10 caracteres');
    }

    // 4. Revalidar contraseña del super admin
    const superAdmin = await db
      .selectFrom('usuarios')
      .select(['id', 'password_hash'])
      .where('id', '=', adminContext.id)
      .where('is_super_admin', '=', true)
      .executeTakeFirst();

    if (!superAdmin) {
      throw new Error('Super admin no encontrado');
    }

    const passwordValido = await bcrypt.compare(passwordAdmin, superAdmin.password_hash);
    if (!passwordValido) {
      throw new Error('Contraseña incorrecta');
    }

    // 5. Construir motivo completo
    const motivoCompleto = motivo === 'otro' 
      ? `${motivo}: ${motivoDetalle}`
      : this.getMotivoDescripcion(motivo);

    // 6. Iniciar transacción de eliminación
    const fechaEliminacion = new Date();
    let usuariosDesactivados = 0;
    let sesionesInvalidadas = 0;
    let licenciaCancelada = false;

    try {
      // 6.1. Marcar empresa como eliminada
      await db
        .updateTable('empresas')
        .set({
          deleted_at: fechaEliminacion.toISOString(),
          deleted_by: adminContext.id,
          delete_reason: motivoCompleto,
          estado: 'eliminado',
          updated_at: new Date().toISOString()
        } as any)
        .where('id', '=', empresaId)
        .execute();

      // 6.2. Desactivar TODOS los usuarios de la empresa
      const updateUsuarios = await db
        .updateTable('usuarios')
        .set({
          activo: false,
          updated_at: new Date().toISOString()
        } as any)
        .where('empresa_id', '=', empresaId)
        .execute();
      
      usuariosDesactivados = Number(updateUsuarios[0]?.numUpdatedRows || 0);

      // 6.3. Invalidar todas las sesiones de la empresa
      const deleteSesiones = await db
        .deleteFrom('sesiones')
        .where('empresa_id', '=', empresaId)
        .execute();
      
      sesionesInvalidadas = Number(deleteSesiones[0]?.numDeletedRows || 0);

      // 6.4. Cancelar licencia activa
      const updateLicencia = await db
        .updateTable('licencias')
        .set({
          estado: 'cancelada',
          motivo_cambio: `Empresa eliminada: ${motivoCompleto}`,
          updated_at: new Date().toISOString()
        } as any)
        .where('empresa_id', '=', empresaId)
        .where('estado', 'in', ['activo', 'prueba', 'pausado'])
        .execute();
      
      licenciaCancelada = Number(updateLicencia[0]?.numUpdatedRows || 0) > 0;

      // 7. Registrar en auditoría con todos los detalles
      await db
        .insertInto('auditoria_saas')
        .values({
          id: uuidv4(),
          accion: 'empresa_eliminada',
          empresa_id: empresaId,
          detalles: JSON.stringify({
            empresa_nombre: empresa.nombre,
            motivo: motivo,
            motivo_completo: motivoCompleto,
            usuarios_desactivados: usuariosDesactivados,
            sesiones_invalidadas: sesionesInvalidadas,
            licencia_cancelada: licenciaCancelada,
            confirmacion_texto: confirmacionTexto,
            ip: requestInfo?.ip || 'no_disponible',
            user_agent: requestInfo?.userAgent || 'no_disponible'
          }),
          admin_id: adminContext.id,
          admin_email: adminContext.email,
          ip_address: requestInfo?.ip || null,
          user_agent: requestInfo?.userAgent || null
        } as any)
        .execute();

      // Log de consola para seguimiento
      console.log(`[ELIMINACIÓN EMPRESA] ${empresa.nombre} eliminada por ${adminContext.email}`);
      console.log(`  - Usuarios desactivados: ${usuariosDesactivados}`);
      console.log(`  - Sesiones invalidadas: ${sesionesInvalidadas}`);
      console.log(`  - Licencia cancelada: ${licenciaCancelada}`);
      console.log(`  - Motivo: ${motivoCompleto}`);

      return {
        success: true,
        mensaje: `Empresa "${empresa.nombre}" eliminada exitosamente`,
        empresaId,
        empresaNombre: empresa.nombre,
        fechaEliminacion,
        usuariosDesactivados,
        sesionesInvalidadas,
        licenciaCancelada
      };

    } catch (error: any) {
      // Si algo falla, registrar el intento fallido
      await this.registrarAuditoria({
        accion: 'empresa_eliminada',
        empresa_id: empresaId,
        detalles: {
          error: true,
          mensaje: error.message,
          empresa_nombre: empresa.nombre
        },
        admin_id: adminContext.id,
        admin_email: adminContext.email
      });
      
      throw new Error(`Error al eliminar empresa: ${error.message}`);
    }
  }

  /**
   * Obtener descripción legible del motivo de eliminación
   */
  private getMotivoDescripcion(motivo: string): string {
    const descripciones: Record<string, string> = {
      'solicitud_cliente': 'Solicitud del cliente',
      'incumplimiento_pago': 'Incumplimiento de pago',
      'violacion_terminos': 'Violación de términos de servicio',
      'fraude_detectado': 'Fraude detectado',
      'empresa_duplicada': 'Empresa duplicada',
      'cierre_negocio': 'Cierre del negocio'
    };
    return descripciones[motivo] || motivo;
  }

  /**
   * Listar empresas eliminadas (solo para Panel Admin SaaS)
   */
  async listarEmpresasEliminadas(): Promise<EmpresaConDetalles[]> {
    const empresas = await db
      .selectFrom('empresas')
      .leftJoin('licencias', (join) =>
        join
          .onRef('licencias.empresa_id', '=', 'empresas.id')
          .on('licencias.estado', '=', 'cancelada')
      )
      .select([
        'empresas.id',
        'empresas.nombre',
        'empresas.slug',
        'empresas.estado',
        'empresas.plan_actual',
        'empresas.max_usuarios',
        'empresas.email_contacto',
        'empresas.telefono',
        'empresas.direccion',
        'empresas.created_at',
        'empresas.deleted_at',
        'empresas.delete_reason',
        'licencias.id as licencia_id',
        'licencias.plan as licencia_plan',
        'licencias.estado as licencia_estado',
        'licencias.fecha_inicio as licencia_inicio',
        'licencias.fecha_fin as licencia_fin'
      ])
      .where('empresas.deleted_at', 'is not', null)
      .orderBy('empresas.deleted_at', 'desc')
      .execute();

    // Si no hay empresas eliminadas, retornar array vacío
    if (empresas.length === 0) {
      return [];
    }

    // Contar usuarios por empresa
    const usuariosCount = await db
      .selectFrom('usuarios')
      .select([
        'empresa_id',
        sql<number>`COUNT(*)`.as('count')
      ])
      .where('empresa_id', 'in', empresas.map(e => e.id))
      .groupBy('empresa_id')
      .execute();

    const countMap = new Map(usuariosCount.map(u => [u.empresa_id, Number(u.count)]));

    return empresas.map(e => ({
      id: e.id,
      nombre: e.nombre,
      slug: e.slug,
      estado: e.estado,
      plan_actual: e.plan_actual || 'basico',
      max_usuarios: e.max_usuarios || 5,
      email_contacto: e.email_contacto,
      telefono: e.telefono,
      direccion: e.direccion,
      created_at: new Date(e.created_at as any),
      deleted_at: e.deleted_at ? new Date(e.deleted_at as any) : null,
      delete_reason: e.delete_reason,
      licencia_activa: e.licencia_id ? {
        id: e.licencia_id,
        plan: e.licencia_plan || 'basico',
        estado: e.licencia_estado || 'cancelada',
        fecha_inicio: new Date(e.licencia_inicio as any),
        fecha_fin: e.licencia_fin ? new Date(e.licencia_fin as any) : null,
        dias_restantes: null
      } : null,
      usuarios_count: countMap.get(e.id) || 0
    } as any));
  }

  // ============================================
  // CONFIGURACIÓN DE PLANES
  // ============================================

  /**
   * Configuración de planes en memoria (puede migrarse a BD en el futuro)
   * Precios en COP - Licencias anuales por defecto
   */
  private planesConfig: Record<PlanType, {
    id: PlanType;
    nombre: string;
    descripcion: string;
    precio_anual: number;
    max_usuarios: number;
    max_mesas: number;
    duracion_dias: number;
    features: Record<string, boolean>;
    activo: boolean;
  }> = {
    basico: {
      id: 'basico',
      nombre: 'Básico',
      descripcion: 'Ideal para restaurantes pequeños',
      precio_anual: 500000,
      max_usuarios: 5,
      max_mesas: 20,
      duracion_dias: 365,
      features: {
        comandas: true,
        mesas: true,
        facturacion_simple: true,
        reportes_basicos: true
      },
      activo: true
    },
    profesional: {
      id: 'profesional',
      nombre: 'Profesional',
      descripcion: 'Para restaurantes medianos con más necesidades',
      precio_anual: 600000,
      max_usuarios: 15,
      max_mesas: 50,
      duracion_dias: 365,
      features: {
        comandas: true,
        mesas: true,
        facturacion_simple: true,
        facturacion_electronica: true,
        reportes_basicos: true,
        reportes_avanzados: true,
        inventario: true,
        nomina: true,
        control_acceso: true
      },
      activo: true
    },
    enterprise: {
      id: 'enterprise',
      nombre: 'Enterprise',
      descripcion: 'Solución completa para cadenas y grandes establecimientos',
      precio_anual: 1200000,
      max_usuarios: 100,
      max_mesas: 500,
      duracion_dias: 365,
      features: {
        comandas: true,
        mesas: true,
        facturacion_simple: true,
        facturacion_electronica: true,
        reportes_basicos: true,
        reportes_avanzados: true,
        inventario: true,
        inventario_avanzado: true,
        nomina: true,
        control_acceso: true,
        multi_sucursal: true,
        api_acceso: true
      },
      activo: true
    }
  };

  /**
   * Obtener configuración de todos los planes
   */
  obtenerConfiguracionPlanes(): typeof this.planesConfig {
    return this.planesConfig;
  }

  /**
   * Obtener configuración de un plan específico
   */
  obtenerPlan(planId: PlanType) {
    return this.planesConfig[planId] || null;
  }

  /**
   * Actualizar configuración de un plan
   */
  async actualizarConfiguracionPlan(
    planId: PlanType,
    data: Partial<{
      precio_anual: number;
      max_usuarios: number;
      max_mesas: number;
      duracion_dias: number;
      descripcion: string;
      activo: boolean;
    }>,
    adminContext: { id: string; email: string }
  ): Promise<{ success: boolean }> {
    if (!this.planesConfig[planId]) {
      throw new Error('Plan no encontrado');
    }

    // Actualizar solo los campos proporcionados
    if (data.precio_anual !== undefined) {
      this.planesConfig[planId].precio_anual = data.precio_anual;
    }
    if (data.max_usuarios !== undefined) {
      this.planesConfig[planId].max_usuarios = data.max_usuarios;
    }
    if (data.max_mesas !== undefined) {
      this.planesConfig[planId].max_mesas = data.max_mesas;
    }
    if (data.duracion_dias !== undefined) {
      this.planesConfig[planId].duracion_dias = data.duracion_dias;
    }
    if (data.descripcion !== undefined) {
      this.planesConfig[planId].descripcion = data.descripcion;
    }
    if (data.activo !== undefined) {
      this.planesConfig[planId].activo = data.activo;
    }

    console.log(`[ADMIN] Plan ${planId} actualizado por ${adminContext.email}:`, data);

    return { success: true };
  }
}
