import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../database/database';
import { UsuarioRepository } from '../repositories/usuarioRepository';
import { EmpresaRepository } from '../repositories/empresaRepository';
import { ControlAccesoService } from './controlAccesoService';

const usuarioRepository = new UsuarioRepository();
const empresaRepository = new EmpresaRepository();
const controlAccesoService = new ControlAccesoService();

// Permisos base del sistema (sync con onboardingService)
const PERMISOS_SISTEMA = [
  { clave: 'crear_comandas', nombre: 'Crear Comandas', descripcion: 'Permite tomar pedidos' },
  { clave: 'gestionar_caja', nombre: 'Gestionar Caja', descripcion: 'Procesar pagos y cierres' },
  { clave: 'ver_reportes', nombre: 'Ver Reportes', descripcion: 'Acceso a estadísticas' },
  { clave: 'ver_historial', nombre: 'Ver Historial', descripcion: 'Ver comandas pasadas' },
  { clave: 'gestion_menu', nombre: 'Gestionar Menú', descripcion: 'Editar productos y precios' },
  { clave: 'gestion_espacios', nombre: 'Gestionar Espacios', descripcion: 'Administrar mesas y salones' },
  { clave: 'gestionar_sistema', nombre: 'Configuración Sistema', descripcion: 'Ajustes generales' },
  { clave: 'nomina.gestion', nombre: 'Gestión Nómina', descripcion: 'Administrar sueldos y contratos' }
];

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key';
const JWT_EXPIRES_IN = '12h';

export class AuthService {
  async login(email: string, password: string) {
    const usuario = await usuarioRepository.findByEmail(email);

    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new Error('Usuario desactivado');
    }

    const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordMatch) {
      throw new Error('Credenciales inválidas');
    }

    const empresa = await empresaRepository.findById(usuario.empresa_id);
    if (!empresa || empresa.estado !== 'activo') {
      throw new Error('La empresa no está activa o no existe');
    }

    // Obtener nombre del rol
    const rol = await db
        .selectFrom('roles')
        .select('nombre')
        .where('id', '=', usuario.rol_id || '')
        .executeTakeFirst();

    // Obtener permisos para el token y respuesta inicial
    const permisosData = await db
        .selectFrom('permisos_rol')
        .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
        .select('permisos.clave')
        .where('permisos_rol.rol_id', '=', usuario.rol_id || '')
        .where('permisos_rol.empresa_id', '=', usuario.empresa_id)
        .execute();
    
    const permisosList = permisosData.map(p => p.clave);

    const payload = {
      userId: usuario.id,
      empresaId: usuario.empresa_id,
      rolId: usuario.rol_id,
      permisos: permisosList
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre,
        usuario: usuario.email, // El frontend usa 'usuario' para el label
        email: usuario.email,
        empresa_id: usuario.empresa_id,
        rol_id: usuario.rol_id,
        rol_nombre: rol?.nombre || 'Sin Rol'
      },
      permisos: permisosList,
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre
      }
    };
  }

  /**
   * Login multi-tenant: identifica la empresa por email del admin, 
   * luego busca al empleado por su email dentro de esa empresa
   */
  async loginMultiTenant(empresaEmail: string, usuarioEmail: string, password: string) {
    // 1. Buscar al administrador de la empresa por email para identificar el tenant
    const adminEmpresa = await usuarioRepository.findByEmail(empresaEmail);
    
    if (!adminEmpresa) {
      throw new Error('Empresa no encontrada. Verifica el correo del administrador.');
    }

    const empresaId = adminEmpresa.empresa_id;

    // 2. Buscar al usuario (empleado) por email dentro de esa empresa
    const empleado = await db
      .selectFrom('usuarios')
      .selectAll()
      .where('email', '=', usuarioEmail)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (!empleado) {
      throw new Error('Usuario no encontrado en esta empresa. Verifica tu email.');
    }

    if (!empleado.activo) {
      throw new Error('Usuario desactivado');
    }

    // 3. Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, empleado.password_hash);
    if (!passwordMatch) {
      throw new Error('Credenciales inválidas');
    }

    // 4. Verificar que la empresa esté activa
    const empresa = await empresaRepository.findById(empresaId);
    if (!empresa || empresa.estado !== 'activo') {
      throw new Error('La empresa no está activa');
    }

    // 4.5. Verificar estado de licencia
    const licencia = await db
      .selectFrom('licencias')
      .select(['estado', 'fecha_fin'])
      .where('empresa_id', '=', empresaId)
      .where('estado', 'in', ['activo', 'prueba', 'pausado', 'expirado'])
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!licencia) {
      const error = new Error('Sin licencia activa. Contacte al administrador.');
      (error as any).codigo = 'SIN_LICENCIA';
      throw error;
    }

    if (licencia.estado === 'pausado') {
      const error = new Error('Licencia pausada temporalmente. Contacte al administrador.');
      (error as any).codigo = 'LICENCIA_PAUSADA';
      throw error;
    }

    if (licencia.estado === 'expirado') {
      const error = new Error('Licencia expirada. Contacte al administrador para renovar.');
      (error as any).codigo = 'LICENCIA_EXPIRADA';
      throw error;
    }

    // Verificar si la licencia activa ha expirado por fecha
    if (licencia.fecha_fin) {
      const fechaFin = new Date(licencia.fecha_fin as any);
      if (fechaFin < new Date()) {
        const error = new Error('Licencia expirada. Contacte al administrador para renovar.');
        (error as any).codigo = 'LICENCIA_EXPIRADA';
        throw error;
      }
    }

    // 4.6. Verificar control de acceso (servicio cerrado / fuera de horario)
    // Determinar si el empleado es admin
    const rolEmpleado = await db
      .selectFrom('roles')
      .select(['nombre', 'es_superusuario'])
      .where('id', '=', empleado.rol_id || '')
      .executeTakeFirst();
    
    const rolesAdmin = ['Administrador', 'Super Admin', 'Admin', 'Master'];
    const esAdmin = rolEmpleado ? (rolesAdmin.includes(rolEmpleado.nombre) || rolEmpleado.es_superusuario) : false;

    const bloqueoAcceso = await controlAccesoService.verificarAccesoUsuario(
      empresaId,
      empleado.id,
      !!esAdmin
    );

    if (bloqueoAcceso) {
      const error = new Error(bloqueoAcceso.message);
      (error as any).codigo = bloqueoAcceso.code;
      throw error;
    }

    // 5. Obtener rol del empleado
    const rol = await db
      .selectFrom('roles')
      .select('nombre')
      .where('id', '=', empleado.rol_id || '')
      .executeTakeFirst();

    // 6. Obtener permisos
    let permisosData = await db
      .selectFrom('permisos_rol')
      .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
      .select('permisos.clave')
      .where('permisos_rol.rol_id', '=', empleado.rol_id || '')
      .where('permisos_rol.empresa_id', '=', empresaId)
      .execute();
    
    let permisosList = permisosData.map(p => p.clave);

    // 6.5. AUTO-REPARACIÓN: Si un Administrador no tiene permisos, asignarlos automáticamente
    if (permisosList.length === 0 && esAdmin && empleado.rol_id) {
      console.warn(`⚠️ [AUTH] Administrador sin permisos detectado: ${empleado.email}. Iniciando auto-reparación...`);
      
      try {
        // Verificar si la tabla permisos está vacía
        let todosLosPermisos = await db.selectFrom('permisos').select(['id', 'clave']).execute();
        
        // Si está vacía, crear permisos base
        if (todosLosPermisos.length === 0) {
          console.log('⚠️ [AUTH] Tabla permisos vacía. Creando permisos base...');
          for (const p of PERMISOS_SISTEMA) {
            await db.insertInto('permisos').values(p).execute();
          }
          todosLosPermisos = await db.selectFrom('permisos').select(['id', 'clave']).execute();
          console.log(`✅ [AUTH] Creados ${todosLosPermisos.length} permisos base`);
        }
        
        // Asignar todos los permisos al rol del administrador
        if (todosLosPermisos.length > 0) {
          const permisosRolData = todosLosPermisos.map(p => ({
            rol_id: empleado.rol_id!,
            permiso_id: p.id,
            empresa_id: empresaId
          }));
          
          await db.insertInto('permisos_rol').values(permisosRolData).execute();
          console.log(`✅ [AUTH] Asignados ${todosLosPermisos.length} permisos al rol ${rol?.nombre}`);
          
          // Recargar permisos
          permisosData = await db
            .selectFrom('permisos_rol')
            .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
            .select('permisos.clave')
            .where('permisos_rol.rol_id', '=', empleado.rol_id)
            .where('permisos_rol.empresa_id', '=', empresaId)
            .execute();
          
          permisosList = permisosData.map(p => p.clave);
        }
      } catch (error) {
        console.error('❌ [AUTH] Error al auto-reparar permisos:', error);
        // Continuar sin permisos (el usuario puede usar emergency-fix si es necesario)
      }
    }

    // 7. Generar token
    const payload = {
      userId: empleado.id,
      empresaId: empresaId,
      rolId: empleado.rol_id,
      permisos: permisosList
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 8. Actualizar ultimo_login del usuario
    await db
      .updateTable('usuarios')
      .set({ ultimo_login: new Date().toISOString() } as any)
      .where('id', '=', empleado.id)
      .execute();

    return {
      token,
      usuario: {
        id: empleado.id,
        nombre_completo: empleado.nombre,
        usuario: empleado.usuario,
        email: empleado.email,
        empresa_id: empresaId,
        rol_id: empleado.rol_id,
        rol_nombre: rol?.nombre || 'Sin Rol'
      },
      permisos: permisosList,
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre
      }
    };
  }

  verifyToken(token: string): any {
    return jwt.verify(token, JWT_SECRET);
  }

  generateToken(userId: string, empresaId: string): string {
    const payload = { userId, empresaId };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}
