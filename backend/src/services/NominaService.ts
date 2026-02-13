import { NominaRepository } from '../repositories/nominaRepository';
import { EmpresaRepository } from '../repositories/empresaRepository';
import { ConfigFacturacionRepository } from '../repositories/configFacturacionRepository';
import { ConfiguracionNominaTable, EmpleadosTable, NominasTable, NominaDetallesTable } from '../database/types';
import { Insertable } from 'kysely';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class NominaService {
    private repo = new NominaRepository();
    private empresaRepo = new EmpresaRepository();
    private configFactRepo = new ConfigFacturacionRepository();

    // Empleados
    async listarEmpleados(empresaId: string) {
        return await this.repo.listarEmpleados(empresaId);
    }

    async crearEmpleado(empresaId: string, data: any) {
        return await this.repo.crearEmpleado({
            ...data,
            empresa_id: empresaId,
            id: undefined // Dejar que la DB genere UUID
        });
    }

    async actualizarEmpleado(id: string, empresaId: string, data: any) {
        return await this.repo.actualizarEmpleado(id, empresaId, data);
    }

    // Configuración
    async obtenerConfiguracion(empresaId: string) {
        let config = await this.repo.getConfiguracionVigente(empresaId);
        
        // Si no existe configuración, crear una por defecto
        if (!config) {
            console.log(`📋 Creando configuración de nómina por defecto para empresa ${empresaId}`);
            const anioActual = new Date().getFullYear();
            
            config = await this.repo.guardarConfiguracion({
                empresa_id: empresaId,
                anio: anioActual,
                salario_minimo: 1750905,
                auxilio_transporte: 249095,
                uvt: 52374,
                porc_salud_empleado: 4,
                porc_pension_empleado: 4,
                fondo_solidaridad_limite: 4,
                porc_salud_employer: 8.5,
                porc_pension_employer: 12,
                porc_caja_comp: 4,
                porc_sena: 2,
                porc_icbf: 3,
                porc_cesantias: 8.33,
                porc_intereses_cesantias: 12,
                porc_prima: 8.33,
                porc_vacaciones: 4.17,
                porc_recargo_dominical: 80,
                porc_recargo_festivo: 80,
                porc_extra_diurna_dominical: 105,
                porc_recargo_diurno: 25,
                horas_mensuales: 220,
                vigente: true
            });
        }
        
        // Mapear nombres de campos para el frontend
        return {
            ...config,
            porc_salud_empleador: config.porc_salud_employer,
            porc_pension_empleador: config.porc_pension_employer
        };
    }

    async guardarConfiguracion(empresaId: string, data: any) {
        await this.repo.desactivarConfiguraciones(empresaId);
        
        // Mapear nombres del frontend al backend
        const { porc_salud_empleador, porc_pension_empleador, ...rest } = data;
        
        return await this.repo.guardarConfiguracion({
            ...rest,
            porc_salud_employer: porc_salud_empleador ?? data.porc_salud_employer,
            porc_pension_employer: porc_pension_empleador ?? data.porc_pension_employer,
            empresa_id: empresaId,
            vigente: true
        });
    }

    // Cálculo y Generación
    async calcularNominaEmpleado(empresaId: string, data: {
        empleado_id: string;
        dias_trabajados: number;
        horas_diurnas?: number;
        horas_dominicales_diurnas?: number;
        horas_festivas_diurnas?: number;
        horas_extra_diurna_dominical?: number;
        comisiones?: number;
        otras_deducciones?: number;
        periodo_mes?: string;
        periodo_anio?: number;
        usuario_nombre?: string;
    }) {
        const config = await this.repo.getConfiguracionVigente(empresaId);
        if (!config) throw new Error('No hay configuración de nómina vigente. Configure los parámetros primero.');

        const empleado = await this.repo.obtenerEmpleado(data.empleado_id, empresaId);
        if (!empleado) throw new Error('Empleado no encontrado');

        const diasTrabajados = data.dias_trabajados || 30;
        const sueldoBase = Number(empleado.salario_base || config.salario_minimo);
        
        // Cálculo proporcional del sueldo
        const sueldoBasico = Math.round((sueldoBase / 30) * diasTrabajados);
        
        // Auxilio de transporte (solo si el empleado tiene derecho Y gana menos de 2 SMLV)
        const tieneDerechoAuxTransporte = empleado.auxilio_transporte === true;
        const auxTransp = (tieneDerechoAuxTransporte && sueldoBase < (config.salario_minimo * 2))
            ? Math.round((config.auxilio_transporte / 30) * diasTrabajados) 
            : 0;
        
        // Valor hora para extras
        const valorHora = sueldoBase / config.horas_mensuales;
        
        // Horas extras diurnas (recargo 25%)
        const horasDiurnas = data.horas_diurnas || 0;
        const valorExtrasDiurnas = Math.round(valorHora * (1 + config.porc_recargo_diurno / 100) * horasDiurnas);
        
        // Horas dominicales diurnas (recargo dominical)
        const horasDomDiurnas = data.horas_dominicales_diurnas || 0;
        const valorDomDiurnas = Math.round(valorHora * (1 + config.porc_recargo_dominical / 100) * horasDomDiurnas);
        
        // Horas festivas diurnas (recargo festivo)
        const horasFestDiurnas = data.horas_festivas_diurnas || 0;
        const valorFestDiurnas = Math.round(valorHora * (1 + config.porc_recargo_festivo / 100) * horasFestDiurnas);
        
        // Horas extras dominicales (extra diurna dominical)
        const horasExtraDom = data.horas_extra_diurna_dominical || 0;
        const valorExtraDom = Math.round(valorHora * (1 + config.porc_extra_diurna_dominical / 100) * horasExtraDom);
        
        // Comisiones
        const comisiones = data.comisiones || 0;
        
        // Total devengado (base para deducciones)
        const totalDevengado = sueldoBasico + auxTransp + valorExtrasDiurnas + valorDomDiurnas + valorFestDiurnas + valorExtraDom + comisiones;
        
        // Base para aportes (sin auxilio de transporte)
        const baseAportes = totalDevengado - auxTransp;
        
        // Deducciones empleado
        const salud = Math.round(baseAportes * (config.porc_salud_empleado / 100));
        const pension = Math.round(baseAportes * (config.porc_pension_empleado / 100));
        
        // Fondo de solidaridad (solo si gana más de 4 SMLV)
        const fondoSolidaridad = baseAportes > (config.salario_minimo * 4)
            ? Math.round(baseAportes * (config.fondo_solidaridad_limite / 100))
            : 0;
        
        // Retención en la fuente (simplificada - solo para salarios altos)
        const retencionFuente = 0; // Se puede implementar tabla de retención
        
        // Otras deducciones
        const otrasDeducciones = data.otras_deducciones || 0;
        
        const totalDeducciones = salud + pension + fondoSolidaridad + retencionFuente + otrasDeducciones;
        const netoPagado = totalDevengado - totalDeducciones;

        return {
            empleado_id: empleado.id,
            empleado_nombre: `${empleado.nombres || ''} ${empleado.apellidos || ''}`.trim(),
            empleado_documento: empleado.numero_documento || '',
            periodo_mes: data.periodo_mes || new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase(),
            periodo_anio: data.periodo_anio || new Date().getFullYear(),
            usuario_nombre: data.usuario_nombre || 'Sistema',
            dias_trabajados: diasTrabajados,
            sueldo_basico: sueldoBasico,
            auxilio_transporte: auxTransp,
            horas_extras_diurnas: valorExtrasDiurnas,
            horas_extras_nocturnas: 0, // No implementado
            valor_festivas_diurnas: valorFestDiurnas,
            recargo_nocturno: 0, // No implementado
            horas_diurnas: horasDiurnas,
            horas_dominicales_diurnas: horasDomDiurnas,
            horas_festivas_diurnas: horasFestDiurnas,
            horas_extra_diurna_dominical: horasExtraDom,
            valor_dominicales_diurnas: valorDomDiurnas,
            valor_extra_diurna_dominical: valorExtraDom,
            comisiones: comisiones,
            total_devengado: totalDevengado,
            salud: salud,
            salud_empleado: salud,
            pension: pension,
            pension_empleado: pension,
            fondo_solidaridad: fondoSolidaridad,
            retencion_fuente: retencionFuente,
            otras_deducciones: otrasDeducciones,
            total_deducciones: totalDeducciones,
            neto_pagado: netoPagado
        };
    }

    async generarNominaMes(empresaId: string, mes: number, anio: number) {
        const config = await this.repo.getConfiguracionVigente(empresaId);
        if (!config) throw new Error('No hay configuraci�n de n�mina vigente');

        const empleados = await this.repo.listarEmpleados(empresaId);
        const resultados = [];

        for (const emp of empleados) {
            const nomina = await this.calcularYGuardar(emp, config, mes, anio);
            resultados.push(nomina);
        }

        return resultados;
    }

    private async calcularYGuardar(empleado: any, config: any, mes: number, anio: number) {
        const sueldoBase = Number(empleado.salario_base || 0);
        const auxTransp = sueldoBase < (config.salario_minimo * 2) ? config.auxilio_transporte : 0;
        
        const salud = Math.round(sueldoBase * (Number(config.porc_salud_empleado) / 100));
        const pension = Math.round(sueldoBase * (Number(config.porc_pension_empleado) / 100));
        
        const neto = sueldoBase + auxTransp - salud - pension;

        const nomina = await this.repo.crearNomina({
            empresa_id: empleado.empresa_id,
            empleado_id: empleado.id,
            mes,
            anio,
            fecha: new Date(),
            monto_total: neto,
            estado: 'GENERADA'
        });

        const detalles: Insertable<NominaDetallesTable>[] = [
            { empresa_id: empleado.empresa_id, nomina_id: nomina.id, tipo: 'SUELDO_BASE', descripcion: 'Sueldo Base', monto: sueldoBase },
            { empresa_id: empleado.empresa_id, nomina_id: nomina.id, tipo: 'AUX_TRANSPORTE', descripcion: 'Auxilio Transporte', monto: auxTransp },
            { empresa_id: empleado.empresa_id, nomina_id: nomina.id, tipo: 'DEDUCCION_SALUD', descripcion: 'Salud', monto: -salud },
            { empresa_id: empleado.empresa_id, nomina_id: nomina.id, tipo: 'DEDUCCION_PENSION', descripcion: 'Pensi�n', monto: -pension }
        ];

        for (const d of detalles) {
            await this.repo.agregarDetalle(d);
        }

        return { ...nomina, detalles };
    }

    async obtenerNominaCompleta(id: string, empresaId: string) {
        return await this.repo.obtenerNominaCompleta(id, empresaId);
    }

    // Guardar detalle de nómina con historial
    async guardarNominaDetalle(empresaId: string, data: any) {
        const calculo = await this.calcularNominaEmpleado(empresaId, data);
        
        const mesNumero = this.getMesNumero(data.periodo_mes);
        const versionesPeriodo = await this.repo.listarNominasPeriodoEmpleado(
            empresaId, 
            data.empleado_id, 
            mesNumero, 
            data.periodo_anio
        );
        const version = versionesPeriodo.length + 1;

        await this.repo.cerrarNominasAbiertasPeriodo(
            empresaId,
            data.empleado_id,
            mesNumero,
            data.periodo_anio
        );

        const nomina = await this.repo.crearNomina({
            empresa_id: empresaId,
            empleado_id: data.empleado_id,
            mes: mesNumero,
            anio: data.periodo_anio,
            fecha: new Date(),
            monto_total: calculo.neto_pagado,
            estado: 'ABIERTA'
        });
        
        const detalles = [
            { tipo: 'META_DIAS_TRABAJADOS', descripcion: 'Días Trabajados', monto: calculo.dias_trabajados || 30 },
            { tipo: 'META_VERSION', descripcion: 'Versión Nómina', monto: version },
            { tipo: 'SUELDO_BASE', descripcion: 'Sueldo Básico', monto: calculo.sueldo_basico },
            { tipo: 'AUX_TRANSPORTE', descripcion: 'Auxilio Transporte', monto: calculo.auxilio_transporte },
            { tipo: 'HORAS_EXTRAS', descripcion: 'Horas Extras Diurnas', monto: calculo.horas_extras_diurnas },
            { tipo: 'RECARGO_DOMINICAL', descripcion: 'Recargo Dominical', monto: calculo.valor_dominicales_diurnas || 0 },
            { tipo: 'RECARGO_FESTIVO', descripcion: 'Recargo Festivo', monto: calculo.valor_festivas_diurnas || 0 },
            { tipo: 'HORAS_EXTRA_DOM', descripcion: 'H. Extra Dominical', monto: calculo.valor_extra_diurna_dominical || 0 },
            { tipo: 'COMISIONES', descripcion: 'Comisiones', monto: calculo.comisiones },
            { tipo: 'SALUD', descripcion: 'Aporte Salud', monto: -calculo.salud },
            { tipo: 'PENSION', descripcion: 'Aporte Pensión', monto: -calculo.pension },
            { tipo: 'OTRAS_DEDUCCIONES', descripcion: 'Otras Deducciones', monto: -calculo.otras_deducciones },
        ];

        for (const det of detalles.filter(d => d.monto !== 0)) {
            await this.repo.agregarDetalle({
                empresa_id: empresaId,
                nomina_id: nomina.id,
                tipo: det.tipo,
                descripcion: det.descripcion,
                monto: det.monto
            });
        }

        // Obtener pagos registrados
        const pagos = await this.repo.obtenerPagosNomina(nomina.id, empresaId);
        const totalPagado = pagos.reduce((sum, p) => sum + Number(p.valor), 0);
        const saldoPendiente = calculo.neto_pagado - totalPagado;

        return {
            detalle: {
                ...calculo,
                id: nomina.id,
                estado: nomina.estado,
                version,
                pdf_version: version
            },
            pagos,
            saldo_pendiente: saldoPendiente,
            info: version > 1 ? `Nómina recalculada y guardada como versión ${version}` : 'Nómina guardada correctamente'
        };
    }

    private getMesNumero(mesNombre: string): number {
        const meses: { [key: string]: number } = {
            'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
            'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
            'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
        };
        return meses[mesNombre?.toUpperCase()] || new Date().getMonth() + 1;
    }

    // Obtener historial de nómina
    async obtenerHistorialNomina(empresaId: string, empleadoId: string, periodoMes?: string, periodoAnio?: number) {
        const mesNumero = periodoMes ? this.getMesNumero(periodoMes) : undefined;
        
        const nominas = await this.repo.buscarNominasEmpleado(empresaId, empleadoId, mesNumero, periodoAnio);
        const versionesPorNomina = this.construirMapaVersionesNomina(nominas as any[]);
        const diasPorNomina = new Map<string, number>();
        const netoPorNomina = new Map<string, number>();
        
        const nominasConDetalles = await Promise.all(
            nominas.map(async (n) => {
                const detalles = await this.repo.obtenerDetallesNomina(n.id, empresaId);
                const pagos = await this.repo.obtenerPagosNomina(n.id, empresaId);
                const empleado = await this.repo.obtenerEmpleado(n.empleado_id, empresaId);
                const version = versionesPorNomina.get(n.id) || 1;
                
                let total_devengado = 0;
                let total_deducciones = 0;
                
                for (const det of detalles) {
                    if (this.esDetalleMetadata(det.tipo)) {
                        continue;
                    }

                    const monto = Number(det.monto) || 0;
                    if (monto >= 0) {
                        total_devengado += monto;
                    } else {
                        total_deducciones += Math.abs(monto);
                    }
                }
                
                const neto_pagado = total_devengado - total_deducciones;
                const dias_trabajados = this.obtenerDiasTrabajadosDesdeDetalles(detalles as any[]);

                diasPorNomina.set(n.id, dias_trabajados);
                netoPorNomina.set(n.id, neto_pagado);
                
                const historialNomina: any[] = [];
                historialNomina.push({
                    id: `${n.id}-creacion`,
                    nomina_detalle_id: n.id,
                    periodo_mes: this.getNombreMes(n.mes),
                    periodo_anio: n.anio,
                    version,
                    fecha: n.fecha,
                    cambio: version > 1 ? `Recalculo de nómina (versión ${version})` : 'Creación de nómina mensual',
                    usuario: 'Sistema'
                });
                
                for (const pago of pagos) {
                    historialNomina.push({
                        id: `${n.id}-pago-${pago.id}`,
                        nomina_detalle_id: n.id,
                        periodo_mes: this.getNombreMes(n.mes),
                        periodo_anio: n.anio,
                        version,
                        fecha: pago.fecha,
                        cambio: `Pago registrado: $${Number(pago.valor).toLocaleString('es-CO')} (${pago.tipo || 'QUINCENA'})`,
                        usuario: 'Sistema'
                    });
                }
                
                return {
                    ...n,
                    empleado_nombre: empleado ? `${empleado.nombres} ${empleado.apellidos}` : '',
                    empleado_documento: empleado?.numero_documento || '',
                    periodo_mes: this.getNombreMes(n.mes),
                    periodo_anio: n.anio,
                    dias_trabajados,
                    total_devengado,
                    total_deducciones,
                    neto_pagado,
                    pdf_path: 'dynamic',
                    pdf_version: version,
                    version,
                    detalles: detalles.filter((d) => !this.esDetalleMetadata(d.tipo)),
                    pagos_registrados: pagos,
                    historial_cambios: historialNomina
                };
            })
        );

        const historialRecalculos: any[] = [];
        for (const nomina of nominasConDetalles) {
            if ((nomina.version || 1) <= 1) {
                continue;
            }

            const versionAnteriorId = this.buscarNominaIdPorVersion(
                nominas as any[],
                nomina.empleado_id,
                nomina.mes,
                nomina.anio,
                (nomina.version || 1) - 1,
                versionesPorNomina
            );

            let cambio = `Recalculo de nómina a versión ${nomina.version}`;
            if (versionAnteriorId) {
                const diasPrevios = diasPorNomina.get(versionAnteriorId) || 30;
                const netoPrevio = netoPorNomina.get(versionAnteriorId) || 0;
                const diasActuales = diasPorNomina.get(nomina.id || '') || 30;
                const netoActual = netoPorNomina.get(nomina.id || '') || 0;
                cambio = `Recalculo v${nomina.version}: días ${diasPrevios}→${diasActuales}, neto $${Math.round(netoPrevio).toLocaleString('es-CO')}→$${Math.round(netoActual).toLocaleString('es-CO')}`;
            }

            historialRecalculos.push({
                id: `${nomina.id}-recalculo-v${nomina.version}`,
                nomina_detalle_id: nomina.id,
                periodo_mes: nomina.periodo_mes,
                periodo_anio: nomina.periodo_anio,
                version: nomina.version,
                fecha: nomina.fecha,
                cambio,
                usuario: 'Sistema'
            });
        }

        const todosHistoriales = [
            ...historialRecalculos,
            ...nominasConDetalles.flatMap(n => n.historial_cambios || [])
        ].sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

        return {
            nominas: nominasConDetalles,
            pagos: [],
            historial: todosHistoriales
        };
    }

    private getNombreMes(mes: number): string {
        const meses = ['', 'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 
                       'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        return meses[mes] || '';
    }

    // Registrar pago
    async registrarPago(empresaId: string, nominaId: string, data: { valor: number; fecha?: string; tipo?: string; observaciones?: string }) {
        const pago = await this.repo.registrarPago({
            empresa_id: empresaId,
            nomina_id: nominaId,
            valor: data.valor,
            fecha: data.fecha ? new Date(data.fecha) : new Date(),
            tipo: data.tipo || 'QUINCENA',
            observaciones: data.observaciones || null
        });
        return pago;
    }

    // Generar PDF de nómina guardada
    async generarPDFNomina(empresaId: string, nominaId: string): Promise<Buffer> {
        const nomina = await this.repo.obtenerNominaCompleta(nominaId, empresaId);
        if (!nomina) throw new Error('Nómina no encontrada');

        const empleado = await this.repo.obtenerEmpleado(nomina.empleado_id, empresaId);
        const empresa = await this.configFactRepo.findByEmpresaId(empresaId);

        // Reconstruir los valores desde los detalles guardados
        const detallesMap: { [key: string]: number } = {};
        let total_devengado = 0;
        let total_deducciones = 0;
        let dias_trabajados = 30;

        for (const det of nomina.detalles || []) {
            if (det.tipo === 'META_DIAS_TRABAJADOS') {
                dias_trabajados = Number(det.monto) || 30;
                continue;
            }

            if (this.esDetalleMetadata(det.tipo)) {
                continue;
            }

            const monto = Number(det.monto) || 0;
            detallesMap[det.tipo] = Math.abs(monto);
            if (monto >= 0) {
                total_devengado += monto;
            } else {
                total_deducciones += Math.abs(monto);
            }
        }

        return this.generarPDFBuffer({
            empleado_nombre: empleado ? `${empleado.nombres} ${empleado.apellidos}` : '',
            empleado_documento: empleado?.numero_documento || '',
            periodo_mes: this.getNombreMes(nomina.mes),
            periodo_anio: nomina.anio,
            dias_trabajados,
            sueldo_basico: detallesMap['SUELDO_BASE'] || 0,
            auxilio_transporte: detallesMap['AUX_TRANSPORTE'] || 0,
            horas_extras_diurnas: detallesMap['HORAS_EXTRAS'] || 0,
            valor_dominicales_diurnas: detallesMap['RECARGO_DOMINICAL'] || 0,
            valor_festivas_diurnas: detallesMap['RECARGO_FESTIVO'] || 0,
            valor_extra_diurna_dominical: detallesMap['HORAS_EXTRA_DOM'] || 0,
            comisiones: detallesMap['COMISIONES'] || 0,
            salud: detallesMap['SALUD'] || 0,
            pension: detallesMap['PENSION'] || 0,
            fondo_solidaridad: detallesMap['FONDO_SOLIDARIDAD'] || 0,
            otras_deducciones: detallesMap['OTRAS_DEDUCCIONES'] || 0,
            total_devengado,
            total_deducciones,
            neto_pagado: total_devengado - total_deducciones
        }, empresa);
    }

    private esDetalleMetadata(tipo: string) {
        return (tipo || '').startsWith('META_');
    }

    private obtenerDiasTrabajadosDesdeDetalles(detalles: Array<{ tipo: string; monto: number }>) {
        const metaDias = detalles.find((d) => d.tipo === 'META_DIAS_TRABAJADOS');
        return Number(metaDias?.monto) || 30;
    }

    private construirMapaVersionesNomina(nominas: any[]) {
        const mapa = new Map<string, number>();
        const agrupado = new Map<string, any[]>();

        for (const nomina of nominas) {
            const key = `${nomina.empleado_id}-${nomina.mes}-${nomina.anio}`;
            if (!agrupado.has(key)) {
                agrupado.set(key, []);
            }
            agrupado.get(key)!.push(nomina);
        }

        for (const lista of agrupado.values()) {
            lista
                .sort((a, b) => {
                    const fechaA = new Date(a.fecha || 0).getTime();
                    const fechaB = new Date(b.fecha || 0).getTime();
                    if (fechaA !== fechaB) return fechaA - fechaB;
                    return String(a.id).localeCompare(String(b.id));
                })
                .forEach((nomina, index) => {
                    mapa.set(nomina.id, index + 1);
                });
        }

        return mapa;
    }

    private buscarNominaIdPorVersion(
        nominas: any[],
        empleadoId: string,
        mes: number,
        anio: number,
        versionObjetivo: number,
        mapaVersiones: Map<string, number>
    ) {
        return nominas.find((n) =>
            n.empleado_id === empleadoId &&
            n.mes === mes &&
            n.anio === anio &&
            mapaVersiones.get(n.id) === versionObjetivo
        )?.id;
    }

    // Generar PDF preview (sin guardar)
    async generarPDFPreview(empresaId: string, nominaDetalle: any): Promise<Buffer> {
        const empresa = await this.configFactRepo.findByEmpresaId(empresaId);
        return this.generarPDFBuffer(nominaDetalle, empresa);
    }

    private generarPDFBuffer(nominaDetalle: any, empresa: any): Buffer {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = new PDFDocument({ margin: 50 });

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Encabezado con datos de la empresa
            const nombreEmpresa = (empresa as any)?.nombre_empresa || empresa?.razon_social || 'Empresa';
            const nitEmpresa = (empresa as any)?.nit || empresa?.rut || 'N/A';
            const direccionEmpresa = empresa?.direccion || '';
            const ciudadEmpresa = (empresa as any)?.ciudad || empresa?.giro || '';
            const deptoEmpresa = (empresa as any)?.departamento || '';
            const emailEmpresa = (empresa as any)?.correo_electronico || empresa?.email || '';
            
            // Construir lista de teléfonos desde telefonos[] y telefono2
            const telefonosArray = (empresa as any)?.telefonos || [];
            const telefono2 = (empresa as any)?.telefono2 || '';
            const todosLosTelefonos = [...(Array.isArray(telefonosArray) ? telefonosArray : []), telefono2].filter(Boolean);
            const telefonoStr = todosLosTelefonos.join(' - ');
            
            doc.fontSize(18).font('Helvetica-Bold').text(nombreEmpresa.toUpperCase(), { align: 'center' });
            doc.fontSize(11).font('Helvetica').text(`NIT: ${nitEmpresa}`, { align: 'center' });
            if (direccionEmpresa) {
                doc.text(direccionEmpresa, { align: 'center' });
            }
            if (ciudadEmpresa || deptoEmpresa) {
                doc.text(`${ciudadEmpresa}${ciudadEmpresa && deptoEmpresa ? ' - ' : ''}${deptoEmpresa}`, { align: 'center' });
            }
            if (emailEmpresa) {
                doc.text(`Email: ${emailEmpresa}`, { align: 'center' });
            }
            if (telefonoStr) {
                doc.text(`Tel: ${telefonoStr}`, { align: 'center' });
            }
            doc.moveDown();
            doc.fontSize(16).font('Helvetica-Bold').text('COMPROBANTE DE NÓMINA', { align: 'center' });
            doc.font('Helvetica');
            doc.moveDown();

            // Información del empleado
            doc.fontSize(12);
            doc.text(`Empleado: ${nominaDetalle.empleado_nombre || 'N/A'}`);
            doc.text(`Documento: ${nominaDetalle.empleado_documento || 'N/A'}`);
            doc.text(`Período: ${nominaDetalle.periodo_mes} ${nominaDetalle.periodo_anio}`);
            doc.text(`Días Trabajados: ${nominaDetalle.dias_trabajados || 30}`);
            doc.moveDown();

            // Devengados
            doc.fontSize(14).text('DEVENGADOS', { underline: true });
            doc.fontSize(11);
            doc.text(`Sueldo Básico: $${(nominaDetalle.sueldo_basico || 0).toLocaleString('es-CO')}`);
            if (nominaDetalle.auxilio_transporte > 0) {
                doc.text(`Auxilio Transporte: $${nominaDetalle.auxilio_transporte.toLocaleString('es-CO')}`);
            }
            if (nominaDetalle.horas_extras_diurnas > 0) {
                doc.text(`Horas Extras Diurnas: $${nominaDetalle.horas_extras_diurnas.toLocaleString('es-CO')}`);
            }
            if (nominaDetalle.valor_dominicales_diurnas > 0) {
                doc.text(`Recargo Dominical: $${nominaDetalle.valor_dominicales_diurnas.toLocaleString('es-CO')}`);
            }
            if (nominaDetalle.valor_festivas_diurnas > 0) {
                doc.text(`Recargo Festivo: $${nominaDetalle.valor_festivas_diurnas.toLocaleString('es-CO')}`);
            }
            if (nominaDetalle.valor_extra_diurna_dominical > 0) {
                doc.text(`H. Extra Dominical: $${nominaDetalle.valor_extra_diurna_dominical.toLocaleString('es-CO')}`);
            }
            if (nominaDetalle.comisiones > 0) {
                doc.text(`Comisiones: $${nominaDetalle.comisiones.toLocaleString('es-CO')}`);
            }
            doc.text(`Total Devengado: $${(nominaDetalle.total_devengado || 0).toLocaleString('es-CO')}`);
            doc.moveDown();

            // Deducciones
            doc.fontSize(14).text('DEDUCCIONES', { underline: true });
            doc.fontSize(11);
            doc.text(`Salud (4%): $${(nominaDetalle.salud || nominaDetalle.salud_empleado || 0).toLocaleString('es-CO')}`);
            doc.text(`Pensión (4%): $${(nominaDetalle.pension || nominaDetalle.pension_empleado || 0).toLocaleString('es-CO')}`);
            if (nominaDetalle.fondo_solidaridad > 0) {
                doc.text(`Fondo Solidaridad: $${nominaDetalle.fondo_solidaridad.toLocaleString('es-CO')}`);
            }
            if (nominaDetalle.otras_deducciones > 0) {
                doc.text(`Otras Deducciones: $${nominaDetalle.otras_deducciones.toLocaleString('es-CO')}`);
            }
            doc.text(`Total Deducciones: $${(nominaDetalle.total_deducciones || 0).toLocaleString('es-CO')}`);
            doc.moveDown();

            // Neto a pagar
            doc.fontSize(16).text(`NETO A PAGAR: $${(nominaDetalle.neto_pagado || 0).toLocaleString('es-CO')}`, { align: 'right' });
            doc.moveDown(2);

            // Firmas
            doc.fontSize(10);
            doc.text('_________________________', 100, doc.y);
            doc.text('_________________________', 350, doc.y - 14);
            doc.text('Firma Empleador', 120, doc.y + 5);
            doc.text('Firma Empleado', 375, doc.y - 9);

            doc.end();
        }) as unknown as Buffer;
    }

    // ==================== LIQUIDACIÓN ====================
    async calcularLiquidacion(empresaId: string, data: {
        empleado_id: string;
        fecha_retiro: string;
        motivo_retiro: string;
        base_liquidacion_manual?: number;
        salario_fijo?: boolean;
        promedio_12_meses?: number;
        incluir_auxilio_transporte?: boolean;
        dias_vacaciones?: number;
        dias_prima?: number;
        dias_cesantias?: number;
        dias_sueldo_pendientes?: number;
    }) {
        const config = await this.repo.getConfiguracionVigente(empresaId);
        if (!config) throw new Error('No hay configuración de nómina vigente');

        const empleado = await this.repo.obtenerEmpleado(data.empleado_id, empresaId);
        if (!empleado) throw new Error('Empleado no encontrado');

        const fechaRetiro = new Date(data.fecha_retiro);
        const fechaIngreso = empleado.fecha_inicio ? new Date(empleado.fecha_inicio) : new Date();
        
        // Calcular días laborados totales
        const diasLaboradosTotal = Math.floor((fechaRetiro.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
        
        // Base de cálculo
        const salarioBase = data.base_liquidacion_manual || Number(empleado.salario_base) || config.salario_minimo;
        const auxTransporte = (data.incluir_auxilio_transporte !== false && empleado.auxilio_transporte) 
            ? config.auxilio_transporte 
            : 0;
        const basePrestaciones = salarioBase + auxTransporte;
        
        // Función auxiliar para calcular días en base 30/360 (convención laboral colombiana)
        // Del 27/01 al 27/02 = exactamente 30 días (1 mes)
        const calcularDias30_360 = (fechaInicio: Date, fechaFin: Date): number => {
            const y1 = fechaInicio.getFullYear();
            const m1 = fechaInicio.getMonth();
            let d1 = fechaInicio.getDate();
            
            const y2 = fechaFin.getFullYear();
            const m2 = fechaFin.getMonth();
            let d2 = fechaFin.getDate();
            
            // Reglas de ajuste 30/360:
            // Si el día es 31, se convierte en 30
            if (d1 === 31) d1 = 30;
            if (d2 === 31) d2 = 30;
            
            // Fórmula 30/360: cada mes tiene 30 días, año tiene 360
            return ((y2 - y1) * 360) + ((m2 - m1) * 30) + (d2 - d1);
        };
        
        // Días laborados totales en base 30/360
        const diasLaborados30_360 = calcularDias30_360(fechaIngreso, fechaRetiro);
        
        // Días del año actual trabajados para cesantías (base 30/360)
        const inicioAnio = new Date(fechaRetiro.getFullYear(), 0, 1);
        const fechaInicioCalculo = fechaIngreso > inicioAnio ? fechaIngreso : inicioAnio;
        const diasAnioActual = calcularDias30_360(fechaInicioCalculo, fechaRetiro);
        
        // Días del semestre para prima (base 30/360)
        const inicioSemestre = fechaRetiro.getMonth() < 6 
            ? new Date(fechaRetiro.getFullYear(), 0, 1)
            : new Date(fechaRetiro.getFullYear(), 6, 1);
        const fechaInicioPrima = fechaIngreso > inicioSemestre ? fechaIngreso : inicioSemestre;
        const diasSemestre = calcularDias30_360(fechaInicioPrima, fechaRetiro);
        
        // Usar días personalizados o calculados
        const diasCesantias = data.dias_cesantias ?? diasAnioActual;
        const diasPrima = data.dias_prima ?? diasSemestre;
        // Vacaciones: días totales trabajados (para el cálculo se usará base 720)
        const diasVacaciones = data.dias_vacaciones ?? diasLaborados30_360;
        const diasSueldoPendiente = data.dias_sueldo_pendientes ?? Math.min(fechaRetiro.getDate(), 30);

        // CÁLCULOS DE PRESTACIONES (Base 30/360)
        // Cesantías: (Salario + Aux) * días_año / 360
        const valorCesantias = Math.round((basePrestaciones * diasCesantias) / 360);
        
        // Intereses sobre cesantías: Cesantías * días_año * 12% / 360
        const valorIntereses = Math.round((valorCesantias * diasCesantias * 0.12) / 360);
        
        // Prima de servicios: (Salario + Aux) * días_semestre / 360
        const valorPrima = Math.round((basePrestaciones * diasPrima) / 360);
        
        // Vacaciones: Salario * días_totales / 720 (sin aux transporte, 15 días por año = 360/720)
        const valorVacaciones = Math.round((salarioBase * diasVacaciones) / 720);
        
        // Salario pendiente
        const sueldoPendienteBruto = Math.round((salarioBase / 30) * diasSueldoPendiente);
        const auxTransportePendiente = Math.round((auxTransporte / 30) * diasSueldoPendiente);
        const saludPendiente = Math.round(sueldoPendienteBruto * 0.04);
        const pensionPendiente = Math.round(sueldoPendienteBruto * 0.04);
        const sueldoPendienteNeto = sueldoPendienteBruto + auxTransportePendiente - saludPendiente - pensionPendiente;
        
        // INDEMNIZACIÓN (solo para despido sin justa causa)
        let valorIndemnizacion = 0;
        let motivoIndemnizacion = '';
        
        if (data.motivo_retiro === 'DESPIDO_SIN_JUSTA_CAUSA') {
            // Verificar si está en período de prueba (usar campos si existen)
            const emp = empleado as any;
            const enPeriodoPrueba = emp.es_periodo_prueba && 
                emp.fecha_fin_periodo_prueba && 
                new Date(data.fecha_retiro) <= new Date(emp.fecha_fin_periodo_prueba);
            
            if (enPeriodoPrueba) {
                motivoIndemnizacion = 'En período de prueba - Sin derecho a indemnización (Art. 76 CST)';
            } else {
                const aniosTrabajados = diasLaboradosTotal / 365;
                
                if (empleado.tipo_contrato === 'INDEFINIDO') {
                    // Contrato indefinido - Ley 789/2002
                    if (salarioBase < config.salario_minimo * 10) {
                        // Menos de 10 SMMLV
                        const diasPrimerAnio = Math.min(diasLaboradosTotal, 365);
                        const diasRestantes = Math.max(0, diasLaboradosTotal - 365);
                        valorIndemnizacion = Math.round(
                            (salarioBase / 30) * 30 * (diasPrimerAnio / 365) + // 30 días primer año
                            (salarioBase / 30) * 20 * (diasRestantes / 365)    // 20 días por año siguiente
                        );
                        motivoIndemnizacion = 'Contrato indefinido (<10 SMMLV): 30 días año 1 + 20 días/año subsiguiente';
                    } else {
                        // 10 SMMLV o más
                        const diasPrimerAnio = Math.min(diasLaboradosTotal, 365);
                        const diasRestantes = Math.max(0, diasLaboradosTotal - 365);
                        valorIndemnizacion = Math.round(
                            (salarioBase / 30) * 20 * (diasPrimerAnio / 365) + // 20 días primer año
                            (salarioBase / 30) * 15 * (diasRestantes / 365)    // 15 días por año siguiente
                        );
                        motivoIndemnizacion = 'Contrato indefinido (≥10 SMMLV): 20 días año 1 + 15 días/año subsiguiente';
                    }
                } else if (empleado.tipo_contrato === 'FIJO' && empleado.fecha_fin) {
                    // Contrato a término fijo - salarios faltantes hasta el vencimiento
                    const fechaFinContrato = new Date(empleado.fecha_fin);
                    const diasFaltantes = Math.floor((fechaFinContrato.getTime() - fechaRetiro.getTime()) / (1000 * 60 * 60 * 24));
                    if (diasFaltantes > 0) {
                        valorIndemnizacion = Math.round((salarioBase / 30) * diasFaltantes);
                        motivoIndemnizacion = `Contrato fijo: ${diasFaltantes} días restantes hasta vencimiento`;
                    }
                }
            }
        }
        
        // TOTAL LIQUIDACIÓN
        const totalLiquidacion = valorCesantias + valorIntereses + valorPrima + valorVacaciones + 
                                 sueldoPendienteNeto + valorIndemnizacion;
        
        return {
            empleado_id: data.empleado_id,
            empleado_nombre: `${empleado.nombres} ${empleado.apellidos}`,
            empleado_documento: empleado.numero_documento,
            fecha_ingreso: empleado.fecha_inicio,
            fecha_retiro: data.fecha_retiro,
            motivo_retiro: data.motivo_retiro,
            dias_laborados_total: diasLaborados30_360,
            bases: {
                salario_base: salarioBase,
                auxilio_transporte: auxTransporte,
                base_prestaciones: basePrestaciones,
                es_salario_variable: data.salario_fijo === false,
                incluye_auxilio_transporte: data.incluir_auxilio_transporte !== false && empleado.auxilio_transporte
            },
            detalles: {
                cesantias: { dias: diasCesantias, valor: valorCesantias },
                intereses: { dias: diasCesantias, porcentaje: 12, valor: valorIntereses },
                prima: { dias: diasPrima, valor: valorPrima },
                vacaciones: { dias: diasVacaciones, valor: valorVacaciones },
                salario_pendiente: {
                    dias: diasSueldoPendiente,
                    valor_bruto: sueldoPendienteBruto,
                    aux_transporte: auxTransportePendiente,
                    salud: saludPendiente,
                    pension: pensionPendiente,
                    neto: sueldoPendienteNeto
                },
                indemnizacion: {
                    valor: valorIndemnizacion,
                    motivo: motivoIndemnizacion
                }
            },
            total_liquidacion: totalLiquidacion
        };
    }

    async generarPDFLiquidacion(empresaId: string, liquidacion: any): Promise<Buffer> {
        const empresa = await this.configFactRepo.findByEmpresaId(empresaId);
        
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const doc = new PDFDocument({ margin: 50 });

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Encabezado con datos de la empresa
            const nombreEmpresa = (empresa as any)?.nombre_empresa || empresa?.razon_social || 'Empresa';
            const nitEmpresa = (empresa as any)?.nit || empresa?.rut || 'N/A';
            const direccionEmpresa = empresa?.direccion || '';
            const ciudadEmpresa = (empresa as any)?.ciudad || empresa?.giro || '';
            const deptoEmpresa = (empresa as any)?.departamento || '';
            const emailEmpresa = (empresa as any)?.correo_electronico || empresa?.email || '';
            
            // Construir lista de teléfonos desde telefonos[] y telefono2
            const telefonosArray = (empresa as any)?.telefonos || [];
            const telefono2 = (empresa as any)?.telefono2 || '';
            const todosLosTelefonos = [...(Array.isArray(telefonosArray) ? telefonosArray : []), telefono2].filter(Boolean);
            const telefonoStr = todosLosTelefonos.join(' - ');
            
            doc.fontSize(18).font('Helvetica-Bold').text(nombreEmpresa.toUpperCase(), { align: 'center' });
            doc.fontSize(11).font('Helvetica').text(`NIT: ${nitEmpresa}`, { align: 'center' });
            if (direccionEmpresa) {
                doc.text(direccionEmpresa, { align: 'center' });
            }
            if (ciudadEmpresa || deptoEmpresa) {
                doc.text(`${ciudadEmpresa}${ciudadEmpresa && deptoEmpresa ? ' - ' : ''}${deptoEmpresa}`, { align: 'center' });
            }
            if (emailEmpresa) {
                doc.text(`Email: ${emailEmpresa}`, { align: 'center' });
            }
            if (telefonoStr) {
                doc.text(`Tel: ${telefonoStr}`, { align: 'center' });
            }
            doc.moveDown();
            doc.fontSize(16).font('Helvetica-Bold').text('LIQUIDACIÓN DE PRESTACIONES SOCIALES', { align: 'center' });
            doc.font('Helvetica');
            doc.moveDown();

            // Información del empleado
            doc.fontSize(12);
            doc.text(`Empleado: ${liquidacion.empleado_nombre || 'N/A'}`);
            doc.text(`Documento: ${liquidacion.empleado_documento || 'N/A'}`);
            doc.text(`Fecha Ingreso: ${new Date(liquidacion.fecha_ingreso).toLocaleDateString('es-CO')}`);
            doc.text(`Fecha Retiro: ${new Date(liquidacion.fecha_retiro).toLocaleDateString('es-CO')}`);
            doc.text(`Días Laborados: ${liquidacion.dias_laborados_total}`);
            doc.text(`Motivo: ${liquidacion.motivo_retiro?.replace(/_/g, ' ')}`);
            doc.moveDown();

            // Base de cálculo
            doc.fontSize(14).text('BASE DE CÁLCULO', { underline: true });
            doc.fontSize(11);
            doc.text(`Salario Base: $${liquidacion.bases.salario_base.toLocaleString('es-CO')}`);
            doc.text(`Auxilio Transporte: $${liquidacion.bases.auxilio_transporte.toLocaleString('es-CO')}`);
            doc.text(`Base Prestaciones: $${liquidacion.bases.base_prestaciones.toLocaleString('es-CO')}`);
            doc.moveDown();

            // Prestaciones
            doc.fontSize(14).text('PRESTACIONES SOCIALES', { underline: true });
            doc.fontSize(11);
            doc.text(`Cesantías (${liquidacion.detalles.cesantias.dias} días): $${liquidacion.detalles.cesantias.valor.toLocaleString('es-CO')}`);
            doc.text(`Intereses Cesantías: $${liquidacion.detalles.intereses.valor.toLocaleString('es-CO')}`);
            doc.text(`Prima de Servicios (${liquidacion.detalles.prima.dias} días): $${liquidacion.detalles.prima.valor.toLocaleString('es-CO')}`);
            doc.text(`Vacaciones (${liquidacion.detalles.vacaciones.dias} días): $${liquidacion.detalles.vacaciones.valor.toLocaleString('es-CO')}`);
            doc.moveDown();

            // Salario pendiente
            if (liquidacion.detalles.salario_pendiente.neto > 0) {
                doc.fontSize(14).text('SALARIO PENDIENTE', { underline: true });
                doc.fontSize(11);
                doc.text(`Sueldo Bruto (${liquidacion.detalles.salario_pendiente.dias} días): $${liquidacion.detalles.salario_pendiente.valor_bruto.toLocaleString('es-CO')}`);
                doc.text(`(-) Salud 4%: $${liquidacion.detalles.salario_pendiente.salud.toLocaleString('es-CO')}`);
                doc.text(`(-) Pensión 4%: $${liquidacion.detalles.salario_pendiente.pension.toLocaleString('es-CO')}`);
                doc.text(`Neto: $${liquidacion.detalles.salario_pendiente.neto.toLocaleString('es-CO')}`);
                doc.moveDown();
            }

            // Indemnización
            if (liquidacion.detalles.indemnizacion.valor > 0) {
                doc.fontSize(14).text('INDEMNIZACIÓN', { underline: true });
                doc.fontSize(11);
                doc.text(`Valor: $${liquidacion.detalles.indemnizacion.valor.toLocaleString('es-CO')}`);
                doc.text(`Motivo: ${liquidacion.detalles.indemnizacion.motivo}`);
                doc.moveDown();
            }

            // Total
            doc.moveDown();
            doc.fontSize(16).text(`TOTAL LIQUIDACIÓN: $${liquidacion.total_liquidacion.toLocaleString('es-CO')}`, { align: 'right' });
            doc.moveDown(2);

            // Firmas
            doc.fontSize(10);
            doc.text('_________________________', 100, doc.y);
            doc.text('_________________________', 350, doc.y - 14);
            doc.text('Firma Empleador', 120, doc.y + 5);
            doc.text('Firma Empleado', 375, doc.y - 9);

            doc.end();
        }) as unknown as Buffer;
    }

    // Eliminar historial de nómina por periodo
    async eliminarHistorialPorPeriodo(empresaId: string, periodoMes: string, periodoAnio: number) {
        return await this.repo.eliminarHistorialPorPeriodo(empresaId, periodoMes, periodoAnio);
    }

    // Eliminar historial de nómina por fechas
    async eliminarHistorialPorFechas(empresaId: string, fechaInicio: string, fechaFin: string) {
        return await this.repo.eliminarHistorialPorFechas(empresaId, fechaInicio, fechaFin);
    }
}
