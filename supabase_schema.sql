-- ==============================================================================
-- SISTEMA WEB PARA EL REGISTRO Y CONTROL DE AFILIADOS
-- SINDICATO DE MINIBUSES - LA PAZ, BOLIVIA
-- Optimizado para Supabase (IDs 1, 2, 3, 4... en todas las tablas)
-- ==============================================================================

-- ==============================================================================
-- MÓDULO 1: GESTIÓN DE IDENTIDADES Y SEGURIDAD
-- ==============================================================================

CREATE TABLE roles (
    id_rol      SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) UNIQUE NOT NULL,
    -- Valores esperados: 'Administrador', 'Secretario', 'Tesorero', 'Consulta'
    descripcion TEXT
);

CREATE TABLE personas (
    id_persona      SERIAL PRIMARY KEY,
    nombres         VARCHAR(100) NOT NULL,
    paterno         VARCHAR(80),
    materno         VARCHAR(80),
    ci              VARCHAR(15) UNIQUE NOT NULL,
    expedido        CHAR(2) CHECK (expedido IN ('LP','CB','SC','OR','PT','TJ','BE','PD','CH')),
    fecha_nacimiento DATE,
    celular         VARCHAR(15),
    direccion       VARCHAR(255),
    fotografia      VARCHAR(255),
    estado          SMALLINT DEFAULT 1 CHECK (estado IN (0,1))
);

-- OPTIMIZADO: Ahora el ID del usuario es numérico (1, 2, 3...)
-- Se agregó 'auth_user_id' para vincular con Supabase Auth silenciosamente.
CREATE TABLE usuarios (
    id_usuario      SERIAL PRIMARY KEY,
    auth_user_id    UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    id_persona      INT UNIQUE NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    id_rol          INT NOT NULL REFERENCES roles(id_rol),
    estado          SMALLINT DEFAULT 1 CHECK (estado IN (0,1)),
    fecha_creacion  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso   TIMESTAMP
);

-- Auditoría
CREATE TABLE auditoria (
    id_auditoria    SERIAL PRIMARY KEY,
    id_usuario      INT REFERENCES usuarios(id_usuario),
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

CREATE TABLE cargos_directiva (
    id_cargo        SERIAL PRIMARY KEY,
    nombre_cargo    VARCHAR(80) UNIQUE NOT NULL,
    orden_jerarquico SMALLINT
);

CREATE TABLE directiva (
    id_directiva    SERIAL PRIMARY KEY,
    id_afiliado     INT NOT NULL,   -- FK declarada después
    id_cargo        INT NOT NULL REFERENCES cargos_directiva(id_cargo),
    gestion_inicio  INT NOT NULL CHECK (gestion_inicio >= 2000),
    gestion_fin     INT NOT NULL,
    activo          BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_gestion CHECK (gestion_fin > gestion_inicio)
);

-- ==============================================================================
-- MÓDULO 3: AFILIADOS Y PARQUE AUTOMOTOR
-- ==============================================================================

CREATE TABLE categorias_licencia (
    id_categoria    SERIAL PRIMARY KEY,
    categoria       VARCHAR(10) UNIQUE NOT NULL,
    descripcion     TEXT
);

CREATE TABLE afiliados (
    id_afiliado             SERIAL PRIMARY KEY,
    id_persona              INT UNIQUE NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    id_categoria_licencia   INT REFERENCES categorias_licencia(id_categoria),
    numero_afiliado         VARCHAR(15) UNIQUE NOT NULL,
    tipo_afiliado           VARCHAR(20) NOT NULL
                            CHECK (tipo_afiliado IN ('Socio Propietario','Chofer Asalariado','Relevo')),
    fecha_ingreso           DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_emision_licencia  DATE,
    fecha_vencimiento_licencia DATE,
    estado_organico         VARCHAR(20) DEFAULT 'Activo'
                            CHECK (estado_organico IN ('Activo','Suspendido','Retirado','Fallecido'))
);

ALTER TABLE directiva
    ADD CONSTRAINT fk_directiva_afiliado
    FOREIGN KEY (id_afiliado) REFERENCES afiliados(id_afiliado);

CREATE TABLE vehiculos (
    id_vehiculo     SERIAL PRIMARY KEY,
    id_propietario  INT NOT NULL REFERENCES afiliados(id_afiliado),
    numero_disco    INT UNIQUE NOT NULL,
    placa           VARCHAR(10) UNIQUE NOT NULL,
    numero_linea    VARCHAR(10) NOT NULL,
    numero_interno  VARCHAR(5),
    marca           VARCHAR(50),
    modelo          VARCHAR(50),
    anio_fabricacion SMALLINT,
    color           VARCHAR(30),
    fotografia      VARCHAR(255),
    estado          VARCHAR(20) DEFAULT 'Operativo'
                    CHECK (estado IN ('Operativo', 'Restricción Vehicular', 'Restricción Sindical', 'Mantenimiento', 'Fuerza Mayor', 'Baja'))
);

CREATE TABLE chofer_vehiculo (
    id_asignacion   SERIAL PRIMARY KEY,
    id_vehiculo     INT NOT NULL REFERENCES vehiculos(id_vehiculo),
    id_chofer       INT NOT NULL REFERENCES afiliados(id_afiliado),
    fecha_asignacion DATE DEFAULT CURRENT_DATE,
    fecha_fin       DATE,
    estado          SMALLINT DEFAULT 1 CHECK (estado IN (0,1)),
    CONSTRAINT chk_fechas_asignacion CHECK (fecha_fin IS NULL OR fecha_fin > fecha_asignacion)
);

-- ==============================================================================
-- MÓDULO 4: RUTAS Y OPERACIONES (RUTAS FIJAS)
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
    tipo            VARCHAR(20) NOT NULL
                    CHECK (tipo IN ('Ordinaria','Extraordinaria','Eleccionaria')),
    lugar           VARCHAR(150),
    acta_url        VARCHAR(255),
    quorum_minimo   SMALLINT,
    id_usuario_reg  INT REFERENCES usuarios(id_usuario)
);

CREATE TABLE asistencia_asamblea (
    id_asistencia   SERIAL PRIMARY KEY,
    id_asamblea     INT NOT NULL REFERENCES asambleas(id_asamblea),
    id_afiliado     INT NOT NULL REFERENCES afiliados(id_afiliado),
    asistio         BOOLEAN DEFAULT FALSE,
    justificado     BOOLEAN DEFAULT FALSE,
    observacion     VARCHAR(255),
    CONSTRAINT uq_asistencia UNIQUE (id_asamblea, id_afiliado)
);

-- ==============================================================================
-- MÓDULO 6: HACIENDA
-- ==============================================================================

CREATE TABLE tipos_cuota (
    id_tipo_cuota   SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) UNIQUE NOT NULL,
    monto_default   DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    periodicidad    VARCHAR(20) CHECK (periodicidad IN ('Mensual','Anual','Única','Extraordinaria')),
    activo          BOOLEAN DEFAULT TRUE
);

CREATE TABLE cuotas (
    id_cuota        SERIAL PRIMARY KEY,
    id_afiliado     INT NOT NULL REFERENCES afiliados(id_afiliado),
    id_tipo_cuota   INT NOT NULL REFERENCES tipos_cuota(id_tipo_cuota),
    gestion         INT NOT NULL CHECK (gestion >= 2000),
    mes             SMALLINT CHECK (mes BETWEEN 1 AND 12),
    monto_bs        DECIMAL(8,2) NOT NULL,
    fecha_registro  DATE DEFAULT CURRENT_DATE,
    fecha_limite    DATE,
    observacion     VARCHAR(255),
    estado          VARCHAR(20) DEFAULT 'Pendiente'
                    CHECK (estado IN ('Pendiente','Cancelado','Fuera de Plazo')),
    CONSTRAINT uq_cuota_periodo UNIQUE (id_afiliado, id_tipo_cuota, gestion, mes)
);

CREATE TABLE tipos_multa (
    id_tipo_multa   SERIAL PRIMARY KEY,
    concepto        VARCHAR(150) UNIQUE NOT NULL,
    monto_default   DECIMAL(8,2) NOT NULL,
    categoria       VARCHAR(50) NOT NULL
);

CREATE TABLE multas (
    id_multa        SERIAL PRIMARY KEY,
    id_afiliado     INT NOT NULL REFERENCES afiliados(id_afiliado),
    id_usuario_emisor INT NOT NULL REFERENCES usuarios(id_usuario),
    id_asamblea     INT REFERENCES asambleas(id_asamblea),
    id_tipo_multa   INT REFERENCES tipos_multa(id_tipo_multa) ON DELETE SET NULL,
    concepto        VARCHAR(255) NOT NULL,
    monto_bs        DECIMAL(8,2) NOT NULL,
    fecha_emision   DATE DEFAULT CURRENT_DATE,
    observacion     VARCHAR(255),
    estado          VARCHAR(20) DEFAULT 'Pendiente'
                    CHECK (estado IN ('Pendiente','Cancelado','Condonado'))
);

CREATE TABLE comprobantes_pago (
    id_comprobante  SERIAL PRIMARY KEY,
    numero_recibo   VARCHAR(20) UNIQUE NOT NULL,
    id_cuota        INT REFERENCES cuotas(id_cuota),
    id_multa        INT REFERENCES multas(id_multa),
    id_usuario_caja INT NOT NULL REFERENCES usuarios(id_usuario),
    monto_pagado    DECIMAL(8,2) NOT NULL,
    fecha_pago      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacion     VARCHAR(100),
    CONSTRAINT chk_origen_pago CHECK (
        (id_cuota IS NOT NULL AND id_multa IS NULL) OR
        (id_cuota IS NULL AND id_multa IS NOT NULL)
    )
);

-- ==============================================================================
-- SEGURIDAD RLS (Row Level Security) - SUPABASE
-- ==============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura de roles para todos" 
ON roles FOR SELECT TO authenticated USING (true);

-- Permitir a usuarios autenticados gestionar usuarios, personas, afiliados y vehículos
CREATE POLICY "Permisos totales de usuarios para autenticados" ON usuarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permisos totales de personas para autenticados" ON personas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permisos totales de afiliados para autenticados" ON afiliados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permisos totales de vehiculos para autenticados" ON vehiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- INSERTS INICIALES (DATOS SEMILLA)
-- ==============================================================================

INSERT INTO roles (nombre, descripcion) VALUES
    ('Administrador',   'Acceso total al sistema'),
    ('Secretario',      'Gestión de afiliados y asambleas'),
    ('Tesorero',        'Gestión de cuotas y multas'),
    ('Consulta',        'Solo lectura del padrón'),
    ('Controlador',     'Registro de multas y control en parada o ruta');

INSERT INTO cargos_directiva (nombre_cargo, orden_jerarquico) VALUES
    ('Secretario General',         1),
    ('Secretario de Relaciones',   2),
    ('Secretario de Hacienda',     3),
    ('Secretario de Actas',        4),
    ('Secretario de Vialidad',     5),
    ('Vocal',                      6);

INSERT INTO tipos_cuota (nombre, monto_default, periodicidad) VALUES
    ('Cuota Mensual Ordinaria',     30.00,  'Mensual'),
    ('Habilitación Anual',          100.00, 'Anual'),
    ('Cuota Extraordinaria',        50.00,  'Extraordinaria'),
    ('Aporte Fondo Mortuorio',      20.00,  'Única');

INSERT INTO categorias_licencia (categoria, descripcion) VALUES
    ('A',   'Motocicleta'),
    ('B',   'Vehículo liviano'),
    ('C',   'Vehículo pesado'),
    ('D',   'Transporte de pasajeros'),
    ('P',   'Transporte público urbano');

INSERT INTO tipos_multa (concepto, monto_default, categoria) VALUES
    ('Falta a marchas o bloqueos', 200.00, 'Movilizaciones'),
    ('Inasistencia a asambleas generales', 100.00, 'Asambleas'),
    ('Abandono de ruta o "trameaje"', 75.00, 'Operaciones'),
    ('Atraso en punto de control (tarjeta)', 5.00, 'Operaciones'),
    ('Falta a fiesta patronal (Preste)', 300.00, 'Social'),
    ('Peleas o altercados entre choferes', 150.00, 'Disciplina'),
    ('No portar uniforme / Distintivo', 20.00, 'Disciplina');
