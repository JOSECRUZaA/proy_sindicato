-- ==============================================================================
-- SISTEMA WEB PARA EL REGISTRO Y CONTROL DE AFILIADOS - V2 (Optimizado)
-- SINDICATO DE MINIBUSES - LA PAZ, BOLIVIA
-- Esquema desnormalizado para mayor rendimiento y simplicidad
-- ==============================================================================

-- ==============================================================================
-- MÓDULO 0: LIMPIEZA DEL ESQUEMA ANTERIOR
-- ==============================================================================
DROP VIEW IF EXISTS vista_busqueda_vehiculos;
DROP TABLE IF EXISTS comprobantes_pago CASCADE;
DROP TABLE IF EXISTS multas CASCADE;
DROP TABLE IF EXISTS tipos_multa CASCADE;
DROP TABLE IF EXISTS cuotas CASCADE;
DROP TABLE IF EXISTS tipos_cuota CASCADE;
DROP TABLE IF EXISTS obligaciones_financieras CASCADE;
DROP TABLE IF EXISTS asistencia_asamblea CASCADE;
DROP TABLE IF EXISTS asambleas CASCADE;
DROP TABLE IF EXISTS rutas CASCADE;
DROP TABLE IF EXISTS chofer_vehiculo CASCADE;
DROP TABLE IF EXISTS vehiculos CASCADE;
DROP TABLE IF EXISTS directiva CASCADE;
DROP TABLE IF EXISTS cargos_directiva CASCADE;
DROP TABLE IF EXISTS afiliados CASCADE;
DROP TABLE IF EXISTS categorias_licencia CASCADE;
DROP TABLE IF EXISTS auditoria CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS personas CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;

-- ==============================================================================
-- MÓDULO 1: IDENTIDAD, ACCESO Y AFILIADOS (TABLA MAESTRA)
-- ==============================================================================

CREATE TABLE perfiles (
    id_perfil       SERIAL PRIMARY KEY,
    auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Datos Personales
    nombres         VARCHAR(100) NOT NULL,
    paterno         VARCHAR(80),
    materno         VARCHAR(80),
    ci              VARCHAR(15) UNIQUE NOT NULL,
    correo          VARCHAR(150) UNIQUE,
    celular         VARCHAR(15),
    fotografia      VARCHAR(255),
    
    -- Datos de Acceso
    rol             VARCHAR(50) DEFAULT 'Consulta' 
                    CHECK (rol IN ('Administrador', 'Secretario', 'Tesorero', 'Controlador', 'Consulta', 'Afiliado')),
    estado          SMALLINT DEFAULT 1 CHECK (estado IN (0,1)), -- 1=Activo, 0=Suspendido
    fecha_registro  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos Sindicales (Nulos si es solo usuario administrativo)
    numero_afiliado VARCHAR(15) UNIQUE,
    tipo_afiliado   VARCHAR(30) CHECK (tipo_afiliado IN ('Socio Propietario', 'Chofer Asalariado', 'Relevo', NULL)),
    fecha_ingreso   DATE,
    estado_organico VARCHAR(20) DEFAULT 'Activo' CHECK (estado_organico IN ('Activo', 'Suspendido', 'Retirado', 'Fallecido', NULL)),
    
    -- Datos de Licencia
    categoria_licencia VARCHAR(10) CHECK (categoria_licencia IN ('A', 'B', 'C', 'D', 'P', NULL)),
    fecha_emision_licencia DATE,
    fecha_vencimiento_licencia DATE
);

-- Auditoría simplificada
CREATE TABLE auditoria (
    id_auditoria    SERIAL PRIMARY KEY,
    id_perfil       INT REFERENCES perfiles(id_perfil),
    tabla_afectada  VARCHAR(50) NOT NULL,
    accion          VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
    dato_anterior   JSONB,
    dato_nuevo      JSONB,
    fecha_accion    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_origen       VARCHAR(45)
);

-- ==============================================================================
-- MÓDULO 2: ESTRUCTURA SINDICAL Y DIRECTIVA
-- ==============================================================================

CREATE TABLE directiva (
    id_directiva    SERIAL PRIMARY KEY,
    id_afiliado     INT NOT NULL REFERENCES perfiles(id_perfil) ON DELETE CASCADE,
    cargo           VARCHAR(80) NOT NULL, -- Ej: 'Secretario General', 'Vocal'
    gestion_inicio  INT NOT NULL CHECK (gestion_inicio >= 2000),
    gestion_fin     INT NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_gestion CHECK (gestion_fin > gestion_inicio)
);

-- ==============================================================================
-- MÓDULO 3: PARQUE AUTOMOTOR Y ASIGNACIONES
-- ==============================================================================

CREATE TABLE vehiculos (
    id_vehiculo     SERIAL PRIMARY KEY,
    id_propietario  INT NOT NULL REFERENCES perfiles(id_perfil),
    numero_disco    INT UNIQUE NOT NULL,
    placa           VARCHAR(10) UNIQUE NOT NULL,
    numero_linea    VARCHAR(10) NOT NULL,
    numero_interno  VARCHAR(5),
    marca           VARCHAR(50),
    modelo          VARCHAR(50),
    anio_fabricacion SMALLINT,
    color           VARCHAR(30),
    fotografia      VARCHAR(255),
    estado          VARCHAR(30) DEFAULT 'Operativo'
                    CHECK (estado IN ('Operativo', 'Restricción Vehicular', 'Restricción Sindical', 'Mantenimiento', 'Fuerza Mayor', 'Baja'))
);

CREATE TABLE chofer_vehiculo (
    id_asignacion   SERIAL PRIMARY KEY,
    id_vehiculo     INT NOT NULL REFERENCES vehiculos(id_vehiculo),
    id_chofer       INT NOT NULL REFERENCES perfiles(id_perfil),
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    fecha_fin       DATE,
    estado          SMALLINT DEFAULT 1 CHECK (estado IN (0,1)),
    CONSTRAINT chk_fechas_asignacion CHECK (fecha_fin IS NULL OR fecha_fin > fecha_asignacion)
);

-- ==============================================================================
-- MÓDULO 4: RUTAS FIJAS
-- ==============================================================================

CREATE TABLE rutas (
    id_ruta         SERIAL PRIMARY KEY,
    numero_ruta     VARCHAR(10) UNIQUE NOT NULL,
    nombre_ruta     VARCHAR(150),
    origen          VARCHAR(100) NOT NULL,
    destino         VARCHAR(100) NOT NULL,
    estado          SMALLINT DEFAULT 1 CHECK (estado IN (0,1))
);

-- ==============================================================================
-- MÓDULO 5: ASAMBLEAS Y CONTROL DE ASISTENCIA
-- ==============================================================================

CREATE TABLE asambleas (
    id_asamblea     SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    hora            TIME,
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('Ordinaria','Extraordinaria','Eleccionaria')),
    lugar           VARCHAR(150),
    acta_url        VARCHAR(255),
    quorum_minimo   SMALLINT,
    id_registrador  INT REFERENCES perfiles(id_perfil)
);

CREATE TABLE asistencia_asamblea (
    id_asistencia   SERIAL PRIMARY KEY,
    id_asamblea     INT NOT NULL REFERENCES asambleas(id_asamblea),
    id_afiliado     INT NOT NULL REFERENCES perfiles(id_perfil),
    asistio         BOOLEAN DEFAULT FALSE,
    justificado     BOOLEAN DEFAULT FALSE,
    observacion     VARCHAR(255),
    CONSTRAINT uq_asistencia UNIQUE (id_asamblea, id_afiliado)
);

-- ==============================================================================
-- MÓDULO 6: OBLIGACIONES FINANCIERAS (HACIENDA)
-- ==============================================================================

CREATE TABLE obligaciones_financieras (
    id_obligacion   SERIAL PRIMARY KEY,
    id_afiliado     INT NOT NULL REFERENCES perfiles(id_perfil),
    
    -- Clasificación
    tipo_obligacion VARCHAR(20) NOT NULL CHECK (tipo_obligacion IN ('Cuota', 'Multa')),
    concepto        VARCHAR(255) NOT NULL, -- Ej: 'Mensualidad Mayo', 'Inasistencia Preste'
    
    -- Periodo (Aplica más a cuotas)
    gestion         INT CHECK (gestion >= 2000),
    mes             SMALLINT CHECK (mes BETWEEN 1 AND 12),
    
    -- Relaciones opcionales
    id_asamblea     INT REFERENCES asambleas(id_asamblea) ON DELETE SET NULL, -- Para multas por inasistencia
    
    -- Finanzas
    monto_total     DECIMAL(8,2) NOT NULL,
    monto_pagado    DECIMAL(8,2) DEFAULT 0.00,
    
    -- Estado y Fechas
    estado          VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagado', 'Condenado', 'Fuera de Plazo')),
    fecha_registro  DATE DEFAULT CURRENT_DATE,
    fecha_limite    DATE,
    fecha_pago      TIMESTAMP,
    
    -- Auditoría del cobro
    numero_recibo   VARCHAR(50) UNIQUE,
    id_emisor       INT REFERENCES perfiles(id_perfil), -- Quien registró la deuda (Ej: Controlador para multa)
    id_cobrador     INT REFERENCES perfiles(id_perfil), -- Quien cobró (Tesorero)
    observacion     VARCHAR(255)
);

-- ==============================================================================
-- SEGURIDAD RLS (Row Level Security) - SUPABASE
-- ==============================================================================

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligaciones_financieras ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados gestionar todo (simplificado para MVP)
CREATE POLICY "Permisos totales de perfiles para autenticados" ON perfiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permisos totales de vehiculos para autenticados" ON vehiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permisos totales de obligaciones para autenticados" ON obligaciones_financieras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- VISTAS OPTIMIZADAS
-- ==============================================================================

-- Vista para búsqueda unificada ultrarrápida de vehículos
CREATE OR REPLACE VIEW vista_busqueda_vehiculos AS
SELECT 
    v.id_vehiculo,
    CONCAT_WS(' ', 
        v.numero_disco::text, 
        v.placa, 
        p_prop.numero_afiliado, 
        p_prop.nombres, p_prop.paterno, p_prop.ci,
        p_chof.numero_afiliado,
        p_chof.nombres, p_chof.paterno, p_chof.ci
    ) AS busqueda_texto
FROM vehiculos v
JOIN perfiles p_prop ON v.id_propietario = p_prop.id_perfil
LEFT JOIN chofer_vehiculo cv ON v.id_vehiculo = cv.id_vehiculo AND cv.estado = 1 AND cv.fecha_fin IS NULL
LEFT JOIN perfiles p_chof ON cv.id_chofer = p_chof.id_perfil;
