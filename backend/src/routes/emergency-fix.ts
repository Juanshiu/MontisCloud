import { Request, Response, Router } from 'express';
import { db } from '../database/database';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = Router();

/**
 * ENDPOINT DE EMERGENCIA - SOLO PARA SOLUCIONAR PERMISOS FALTANTES
 * Asigna todos los permisos al rol del usuario autenticado si no tiene ninguno
 */
router.post('/fix-permisos', verificarAutenticacion, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).usuario?.id;
        const empresaId = (req as any).usuario?.empresaId;

        if (!userId || !empresaId) {
            res.status(401).json({ error: 'Usuario no autenticado correctamente' });
            return;
        }

        // 1. Obtener información del usuario
        const usuario = await db
            .selectFrom('usuarios')
            .innerJoin('roles', 'roles.id', 'usuarios.rol_id')
            .select([
                'usuarios.id as usuario_id',
                'usuarios.nombre',
                'usuarios.email',
                'usuarios.rol_id',
                'usuarios.empresa_id',
                'roles.nombre as rol_nombre',
                'roles.es_superusuario as rol_es_superusuario'
            ])
            .where('usuarios.id', '=', userId)
            .where('usuarios.empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!usuario) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        // 2. Verificar cuántos permisos tiene actualmente
        const permisosActuales = await db
            .selectFrom('permisos_rol')
            .select(['permiso_id'])
            .where('rol_id', '=', usuario.rol_id!)
            .where('empresa_id', '=', empresaId)
            .execute();

        // 3. Obtener todos los permisos disponibles
        const todosLosPermisos = await db
            .selectFrom('permisos')
            .select(['id', 'clave', 'nombre'])
            .execute();

        // 4. Si el usuario NO tiene permisos, asignarlos todos
        if (permisosActuales.length === 0) {
            const permisosRolData = todosLosPermisos.map(p => ({
                rol_id: usuario.rol_id!,
                permiso_id: p.id,
                empresa_id: empresaId
            }));

            await db
                .insertInto('permisos_rol')
                .values(permisosRolData)
                .execute();

            console.log(`✅ [EMERGENCY FIX] Asignados ${todosLosPermisos.length} permisos al rol "${usuario.rol_nombre}" del usuario ${usuario.email}`);

            res.json({
                message: 'Permisos asignados exitosamente',
                usuario: {
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol_nombre
                },
                permisos_asignados: todosLosPermisos.length,
                permisos: todosLosPermisos.map(p => p.clave)
            });
        } else {
            // Ya tiene permisos, retornar información
            const permisosDetallados = await db
                .selectFrom('permisos_rol')
                .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
                .select(['permisos.clave', 'permisos.nombre'])
                .where('permisos_rol.rol_id', '=', usuario.rol_id!)
                .where('permisos_rol.empresa_id', '=', empresaId)
                .execute();

            res.json({
                message: 'El usuario ya tiene permisos asignados',
                usuario: {
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol_nombre
                },
                permisos_actuales: permisosDetallados.length,
                permisos: permisosDetallados.map(p => p.clave)
            });
        }
    } catch (error: any) {
        console.error('❌ [EMERGENCY FIX] Error al asignar permisos:', error);
        res.status(500).json({ 
            error: 'Error al procesar la solicitud',
            detalle: error.message 
        });
    }
});

/**
 * Verificar estado de permisos del usuario autenticado
 */
router.get('/check-permisos', verificarAutenticacion, async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).usuario?.id;
        const empresaId = (req as any).usuario?.empresaId;

        if (!userId || !empresaId) {
            res.status(401).json({ error: 'Usuario no autenticado correctamente' });
            return;
        }

        // Obtener información del usuario
        const usuario = await db
            .selectFrom('usuarios')
            .innerJoin('roles', 'roles.id', 'usuarios.rol_id')
            .select([
                'usuarios.id as usuario_id',
                'usuarios.nombre',
                'usuarios.email',
                'usuarios.is_super_admin',
                'usuarios.rol_id',
                'roles.nombre as rol_nombre',
                'roles.es_superusuario as rol_es_superusuario'
            ])
            .where('usuarios.id', '=', userId)
            .where('usuarios.empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!usuario) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        // Obtener permisos asignados
        const permisos = await db
            .selectFrom('permisos_rol')
            .innerJoin('permisos', 'permisos.id', 'permisos_rol.permiso_id')
            .select(['permisos.clave', 'permisos.nombre'])
            .where('permisos_rol.rol_id', '=', usuario.rol_id!)
            .where('permisos_rol.empresa_id', '=', empresaId)
            .execute();

        res.json({
            usuario: {
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol_nombre,
                es_superusuario: usuario.is_super_admin || usuario.rol_es_superusuario
            },
            total_permisos: permisos.length,
            permisos: permisos.map(p => ({ clave: p.clave, nombre: p.nombre })),
            requiere_fix: permisos.length === 0
        });
    } catch (error: any) {
        console.error('❌ [CHECK PERMISOS] Error:', error);
        res.status(500).json({ 
            error: 'Error al verificar permisos',
            detalle: error.message 
        });
    }
});

export default router;
