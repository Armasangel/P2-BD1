-- ============================================================
--  init/01_schema.sql  —  AgroStock: Sistema de Inventario y Ventas
--  Corre automáticamente al crear el contenedor por primera vez.
-- ============================================================

-- ── TABLAS ───────────────────────────────────────────────────

CREATE TABLE categoria (
    id_categoria     SERIAL        PRIMARY KEY,
    nombre_categoria VARCHAR(100)  NOT NULL,
    CONSTRAINT uq_categoria_nombre UNIQUE (nombre_categoria)
);

CREATE TABLE marca (
    id_marca     SERIAL        PRIMARY KEY,
    nombre_marca VARCHAR(100)  NOT NULL,
    CONSTRAINT uq_marca_nombre UNIQUE (nombre_marca)
);

CREATE TABLE proveedor (
    id_proveedor     SERIAL        PRIMARY KEY,
    nombre_proveedor VARCHAR(150)  NOT NULL,
    nit_proveedor    VARCHAR(20)   NOT NULL,
    correo_contacto  VARCHAR(200),
    telefono         VARCHAR(20),
    estado_proveedor BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_proveedor_nit UNIQUE (nit_proveedor)
);

CREATE TABLE producto (
    id_producto     SERIAL        PRIMARY KEY,
    codigo_producto VARCHAR(50)   NOT NULL,
    nombre_producto VARCHAR(200)  NOT NULL,
    precio_unitario NUMERIC(10,2),
    precio_mayoreo  NUMERIC(10,2),
    unidad_medida   VARCHAR(50)   NOT NULL,
    estado_producto BOOLEAN       NOT NULL DEFAULT TRUE,
    caducidad       BOOLEAN       NOT NULL DEFAULT FALSE,
    exento_iva      BOOLEAN       NOT NULL DEFAULT FALSE,
    id_categoria    INT           NOT NULL,
    id_marca        INT           NOT NULL,
    CONSTRAINT uq_producto_codigo    UNIQUE (codigo_producto),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    CONSTRAINT fk_producto_marca     FOREIGN KEY (id_marca)     REFERENCES marca(id_marca)
);

CREATE TABLE producto_proveedor (
    id_producto  INT NOT NULL,
    id_proveedor INT NOT NULL,
    PRIMARY KEY (id_producto, id_proveedor),
    CONSTRAINT fk_pp_producto  FOREIGN KEY (id_producto)  REFERENCES producto(id_producto),
    CONSTRAINT fk_pp_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedor(id_proveedor)
);

CREATE TABLE usuario (
    id_usuario      SERIAL        PRIMARY KEY,
    nombre          VARCHAR(150)  NOT NULL,
    correo          VARCHAR(200)  NOT NULL,
    telefono        VARCHAR(20),
    contrasena_hash VARCHAR(255)  NOT NULL,
    tipo_usuario    VARCHAR(20)   NOT NULL CHECK (tipo_usuario IN ('DUENO','EMPLEADO','COMPRADOR')),
    estado_usuario  BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_usuario_correo   UNIQUE (correo),
    CONSTRAINT uq_usuario_telefono UNIQUE (telefono)
);

CREATE TABLE bodega (
    id_bodega     SERIAL        PRIMARY KEY,
    nombre_bodega VARCHAR(100)  NOT NULL,
    ubicacion     VARCHAR(255)
);

CREATE TABLE bodega_producto (
    id_bodega            INT           NOT NULL,
    id_producto          INT           NOT NULL,
    cantidad_disponible  NUMERIC(12,3) NOT NULL DEFAULT 0,
    stock_minimo         NUMERIC(12,3) NOT NULL DEFAULT 0,
    ultima_actualizacion TIMESTAMP     NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_bodega, id_producto),
    CONSTRAINT fk_bp_bodega   FOREIGN KEY (id_bodega)   REFERENCES bodega(id_bodega),
    CONSTRAINT fk_bp_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

CREATE TABLE kardex (
    id_kardex        SERIAL        PRIMARY KEY,
    id_bodega        INT           NOT NULL,
    id_producto      INT           NOT NULL,
    fecha_movimiento TIMESTAMP     NOT NULL DEFAULT NOW(),
    tipo_movimiento  VARCHAR(20)   NOT NULL CHECK (tipo_movimiento IN ('ENTRADA','SALIDA','AJUSTE')),
    cantidad         NUMERIC(12,3) NOT NULL,
    descripcion      VARCHAR(255),
    CONSTRAINT fk_kardex_bp FOREIGN KEY (id_bodega, id_producto)
        REFERENCES bodega_producto(id_bodega, id_producto)
);

CREATE TABLE venta (
    id_venta          SERIAL        PRIMARY KEY,
    id_usuario        INT           NOT NULL,
    id_empleado       INT,
    fecha_venta       TIMESTAMP     NOT NULL DEFAULT NOW(),
    estado_venta      VARCHAR(20)   NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado_venta IN ('PENDIENTE','CONFIRMADO','ENTREGADO','PAGADO')),
    tipo_venta        VARCHAR(20)   NOT NULL CHECK (tipo_venta IN ('MINORISTA','MAYORISTA')),
    tipo_entrega      VARCHAR(20)   NOT NULL CHECK (tipo_entrega IN ('EN_TIENDA','DOMICILIO')),
    direccion_entrega VARCHAR(255),
    enlinea           BOOLEAN       NOT NULL DEFAULT FALSE,
    total             NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_limite_pago DATE,
    CONSTRAINT fk_venta_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario(id_usuario),
    CONSTRAINT fk_venta_empleado FOREIGN KEY (id_empleado) REFERENCES usuario(id_usuario),
    CONSTRAINT chk_direccion     CHECK (tipo_entrega = 'EN_TIENDA' OR direccion_entrega IS NOT NULL)
);

CREATE TABLE detalle_venta (
    id_detalle_venta SERIAL        PRIMARY KEY,
    id_venta         INT           NOT NULL,
    id_producto      INT           NOT NULL,
    cantidad         NUMERIC(12,3) NOT NULL,
    precio_unitario  NUMERIC(10,2) NOT NULL,
    subtotal         NUMERIC(12,2) NOT NULL,
    CONSTRAINT fk_dv_venta    FOREIGN KEY (id_venta)    REFERENCES venta(id_venta),
    CONSTRAINT fk_dv_producto FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
);

CREATE TABLE pago (
    id_pago    SERIAL        PRIMARY KEY,
    id_venta   INT           NOT NULL,
    fecha_pago TIMESTAMP     NOT NULL DEFAULT NOW(),
    monto      NUMERIC(12,2) NOT NULL,
    metodo     VARCHAR(20)   NOT NULL CHECK (metodo IN ('TARJETA','EFECTIVO','TRANSFERENCIA')),
    CONSTRAINT fk_pago_venta FOREIGN KEY (id_venta) REFERENCES venta(id_venta)
);

CREATE TABLE factura (
    id_factura     SERIAL        PRIMARY KEY,
    id_venta       INT           NOT NULL,
    numero_factura VARCHAR(50)   NOT NULL,
    nombre_cliente VARCHAR(150),
    nit_cliente    VARCHAR(20)   NOT NULL DEFAULT 'CF',
    total_factura  NUMERIC(12,2) NOT NULL,
    CONSTRAINT uq_factura_numero UNIQUE (numero_factura),
    CONSTRAINT uq_factura_venta  UNIQUE (id_venta),
    CONSTRAINT fk_factura_venta  FOREIGN KEY (id_venta) REFERENCES venta(id_venta)
);

-- ── ÍNDICES ──────────────────────────────────────────────────
-- Búsquedas por nombre de producto (filtros, autocomplete)
CREATE INDEX idx_producto_nombre    ON producto(nombre_producto);
-- Consultas de inventario por bodega (pantalla más frecuente)
CREATE INDEX idx_bp_bodega          ON bodega_producto(id_bodega);
-- Historial de kardex por producto y fecha
CREATE INDEX idx_kardex_prod_fecha  ON kardex(id_producto, fecha_movimiento);
-- Reportes de ventas filtrados por estado y fecha
CREATE INDEX idx_venta_estado_fecha ON venta(estado_venta, fecha_venta);
-- Login: búsqueda de usuario por correo
CREATE INDEX idx_usuario_correo     ON usuario(correo);

-- ── VISTAS ───────────────────────────────────────────────────

CREATE VIEW v_deudores AS
SELECT
    v.id_venta,
    u.nombre                              AS nombre_cliente,
    u.correo,
    v.fecha_venta,
    v.fecha_limite_pago,
    v.total                               AS total_venta,
    COALESCE(SUM(p.monto), 0)            AS total_pagado,
    v.total - COALESCE(SUM(p.monto), 0) AS deuda_pendiente
FROM venta v
JOIN usuario u ON u.id_usuario = v.id_usuario
LEFT JOIN pago p ON p.id_venta = v.id_venta
WHERE v.estado_venta != 'PAGADO'
GROUP BY v.id_venta, u.nombre, u.correo, v.fecha_venta, v.fecha_limite_pago, v.total
HAVING v.total - COALESCE(SUM(p.monto), 0) > 0;

CREATE VIEW v_ventas_por_categoria AS
SELECT
    c.nombre_categoria,
    COUNT(DISTINCT v.id_venta) AS total_ventas,
    SUM(dv.cantidad)           AS unidades_vendidas,
    SUM(dv.subtotal)           AS ingresos_totales
FROM detalle_venta dv
JOIN producto  p ON p.id_producto  = dv.id_producto
JOIN categoria c ON c.id_categoria = p.id_categoria
JOIN venta     v ON v.id_venta     = dv.id_venta
GROUP BY c.nombre_categoria;

-- ── DATOS DE PRUEBA ──────────────────────────────────────────

INSERT INTO categoria (nombre_categoria) VALUES
    ('Fertilizantes'), ('Herbicidas'), ('Insecticidas'), ('Fungicidas'),
    ('Semillas'), ('Herramientas'), ('Equipos de Riego'), ('Abonos Orgánicos');

INSERT INTO marca (nombre_marca) VALUES
    ('AgroMax'), ('CampoVerde'), ('TierraFértil'), ('BioPlant'),
    ('HidroTech'), ('SembraGT'), ('ProCultivo'), ('NaturAgro');

INSERT INTO bodega (nombre_bodega, ubicacion) VALUES
    ('Bodega Central',   'Zona 1, Ciudad Guatemala'),
    ('Bodega Norte',     'San Marcos, Guatemala'),
    ('Bodega Occidente', 'Quetzaltenango, Guatemala');

INSERT INTO proveedor (nombre_proveedor, nit_proveedor, correo_contacto, telefono) VALUES
    ('Distribuidora AgriGuate S.A.', '1234567-8', 'ventas@agriguate.com',   '24001234'),
    ('Importadora CampoGT',          '2345678-9', 'info@campogT.com',       '24005678'),
    ('BioInsumos de Guatemala',      '3456789-0', 'pedidos@bioinsumos.gt',  '55551234'),
    ('TecnoAgro Guatemala',          '4567890-1', 'comercial@tecnoagro.gt', '55559876'),
    ('Semillas del Pacífico',        '5678901-2', 'ventas@sempacifico.com', '77771234'),
    ('HidroSistemas GT',             '6789012-3', 'info@hidrosistemas.gt',  '77775678');

-- Contraseña para todos: password123
INSERT INTO usuario (nombre, correo, telefono, contrasena_hash, tipo_usuario) VALUES
    ('Roberto Cifuentes', 'admin@agrostock.com',  '50201110001', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'DUENO'),
    ('Ana Gramajo',       'ana@agrostock.com',    '50201110002', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'EMPLEADO'),
    ('Luis Monterroso',   'luis@agrostock.com',   '50201110003', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'EMPLEADO'),
    ('Pedro Ajú',         'pedro@gmail.com',      '50201110004', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'COMPRADOR'),
    ('Marta Coc',         'marta@gmail.com',      '50201110005', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'COMPRADOR'),
    ('Carlos Xoyon',      'carlos@gmail.com',     '50201110006', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'COMPRADOR'),
    ('Sandra Batz',       'sandra@agrostock.com', '50201110007', '$2b$10$fHirMqOPU1ORDgfFCxkfG.PetZXrQ9XEjVwKgAfM4BnmIVDXL7cUm', 'EMPLEADO');

INSERT INTO producto (codigo_producto, nombre_producto, precio_unitario, precio_mayoreo, unidad_medida, id_categoria, id_marca) VALUES
    ('FER-001', 'Urea 46% 50kg',             185.00, 165.00, 'saco',   1, 1),
    ('FER-002', 'Nitrato de Amonio 25kg',    120.00, 105.00, 'saco',   1, 2),
    ('FER-003', 'Sulfato de Potasio 25kg',   210.00, 190.00, 'saco',   1, 3),
    ('FER-004', 'Triple 15 50kg',            195.00, 175.00, 'saco',   1, 1),
    ('HER-001', 'Glifosato 1L',               55.00,  48.00, 'litro',  2, 2),
    ('HER-002', 'Paraquat 1L',                62.00,  54.00, 'litro',  2, 4),
    ('HER-003', '2-4D Amina 1L',              38.00,  32.00, 'litro',  2, 3),
    ('INS-001', 'Clorpirifos 1L',             45.00,  38.00, 'litro',  3, 1),
    ('INS-002', 'Cipermetrina 500ml',         28.00,  23.00, 'frasco', 3, 5),
    ('INS-003', 'Imidacloprid 200ml',         75.00,  65.00, 'frasco', 3, 4),
    ('FUN-001', 'Mancozeb 1kg',               42.00,  36.00, 'kg',     4, 3),
    ('FUN-002', 'Cobre Metalico 1kg',         38.00,  32.00, 'kg',     4, 2),
    ('FUN-003', 'Propiconazol 500ml',         95.00,  83.00, 'frasco', 4, 6),
    ('SEM-001', 'Semilla Maiz Hibrido 10kg', 320.00, 290.00, 'bolsa',  5, 6),
    ('SEM-002', 'Semilla Frijol Negro 25lb',  85.00,  75.00, 'bolsa',  5, 7),
    ('SEM-003', 'Semilla Tomate 10g',        125.00, 110.00, 'sobre',  5, 8),
    ('HER-T01', 'Machete 18 pulgadas',        65.00,  55.00, 'unidad', 6, 7),
    ('HER-T02', 'Azadon de 5lb',              85.00,  72.00, 'unidad', 6, 1),
    ('HER-T03', 'Mochila Aspersora 20L',     350.00, 310.00, 'unidad', 6, 5),
    ('RIE-001', 'Cinta de Goteo x metro',      4.50,   3.80, 'metro',  7, 5),
    ('RIE-002', 'Valvula de Bola 1 pulg',     18.00,  15.00, 'unidad', 7, 4),
    ('RIE-003', 'Filtro de Malla 3/4 pulg',   45.00,  38.00, 'unidad', 7, 5),
    ('ABO-001', 'Lombricompost 50lb',          95.00,  82.00, 'saco',   8, 8),
    ('ABO-002', 'Compost Enriquecido 50lb',    78.00,  66.00, 'saco',   8, 7),
    ('ABO-003', 'Bokashi 25kg',                65.00,  55.00, 'saco',   8, 8);

INSERT INTO producto_proveedor (id_producto, id_proveedor) VALUES
    (1,1),(2,1),(3,2),(4,1),(5,2),(6,2),(7,3),
    (8,1),(9,4),(10,4),(11,3),(12,3),(13,4),
    (14,5),(15,5),(16,5),(17,6),(18,6),(19,4),
    (20,6),(21,6),(22,6),(23,3),(24,3),(25,3);

INSERT INTO bodega_producto (id_bodega, id_producto, cantidad_disponible, stock_minimo) VALUES
    (1,  1, 200, 30),(1,  2, 150, 20),(1,  3,  80, 15),
    (1,  4, 175, 25),(1,  5, 300, 40),(1,  6, 120, 20),
    (1,  7, 250, 30),(1,  8, 180, 20),(1,  9, 400, 50),
    (1, 10,  90, 10),(1, 11, 320, 40),(1, 12, 280, 35),
    (1, 13,  60,  8),(2, 14, 500, 60),(2, 15, 800, 80),
    (2, 16, 150, 20),(2, 17, 200, 25),(2, 18,  75, 10),
    (2, 19,  30,  5),(3, 20,2000,200),(3, 21, 500, 50),
    (3, 22, 300, 30),(3, 23, 400, 50),(3, 24, 350, 40),
    (3, 25, 600, 60);

INSERT INTO kardex (id_bodega, id_producto, tipo_movimiento, cantidad, descripcion) VALUES
    (1,  1, 'ENTRADA', 200, 'Compra inicial'),
    (1,  2, 'ENTRADA', 150, 'Compra inicial'),
    (1,  3, 'ENTRADA',  80, 'Compra inicial'),
    (1,  4, 'ENTRADA', 175, 'Compra inicial'),
    (1,  5, 'ENTRADA', 300, 'Compra inicial'),
    (1,  6, 'ENTRADA', 120, 'Compra inicial'),
    (1,  7, 'ENTRADA', 250, 'Compra inicial'),
    (1,  8, 'ENTRADA', 180, 'Compra inicial'),
    (1,  9, 'ENTRADA', 400, 'Compra inicial'),
    (1, 10, 'ENTRADA',  90, 'Compra inicial'),
    (1, 11, 'ENTRADA', 320, 'Compra inicial'),
    (1, 12, 'ENTRADA', 280, 'Compra inicial'),
    (1, 13, 'ENTRADA',  60, 'Compra inicial'),
    (2, 14, 'ENTRADA', 500, 'Compra inicial'),
    (2, 15, 'ENTRADA', 800, 'Compra inicial'),
    (2, 16, 'ENTRADA', 150, 'Compra inicial'),
    (2, 17, 'ENTRADA', 200, 'Compra inicial'),
    (2, 18, 'ENTRADA',  75, 'Compra inicial'),
    (2, 19, 'ENTRADA',  30, 'Compra inicial'),
    (3, 20, 'ENTRADA',2000, 'Compra inicial'),
    (3, 21, 'ENTRADA', 500, 'Compra inicial'),
    (3, 22, 'ENTRADA', 300, 'Compra inicial'),
    (3, 23, 'ENTRADA', 400, 'Compra inicial'),
    (3, 24, 'ENTRADA', 350, 'Compra inicial'),
    (3, 25, 'ENTRADA', 600, 'Compra inicial');

INSERT INTO venta (id_usuario, id_empleado, estado_venta, tipo_venta, tipo_entrega, total, fecha_limite_pago) VALUES
    (4, 2, 'PAGADO',     'MINORISTA', 'EN_TIENDA',  473.00, '2026-03-15'),
    (5, 2, 'ENTREGADO',  'MAYORISTA', 'DOMICILIO',  980.00, '2026-04-01'),
    (6, 3, 'PENDIENTE',  'MINORISTA', 'EN_TIENDA',  227.50, '2026-04-20'),
    (4, 3, 'CONFIRMADO', 'MAYORISTA', 'DOMICILIO', 1560.00, '2026-04-30'),
    (5, 2, 'PENDIENTE',  'MINORISTA', 'EN_TIENDA',  318.00, '2026-05-05');

INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES
    (1,  1, 1, 185.00, 185.00),
    (1,  5, 2,  55.00, 110.00),
    (1, 17, 1,  65.00,  65.00),
    (1, 11, 1,  42.00,  42.00),
    (1, 24, 1,  71.00,  71.00),
    (2,  1, 2, 165.00, 330.00),
    (2,  4, 2, 175.00, 350.00),
    (2, 14, 1, 300.00, 300.00),
    (3,  8, 2,  45.00,  90.00),
    (3, 12, 2,  38.00,  76.00),
    (3, 16, 1, 125.00, 125.00),
    (4,  1, 4, 165.00, 660.00),
    (4,  2, 3, 105.00, 315.00),
    (4, 14, 2, 290.00, 580.00),
    (5, 19, 1, 350.00, 350.00),
    (5,  9, 1,  28.00,  28.00);

INSERT INTO pago (id_venta, monto, metodo) VALUES
    (1, 473.00, 'EFECTIVO'),
    (2, 500.00, 'TRANSFERENCIA'),
    (4, 800.00, 'TARJETA');

INSERT INTO factura (id_venta, numero_factura, nombre_cliente, nit_cliente, total_factura) VALUES
    (1, 'FAC-2026-0001', 'Pedro Ajú', 'CF',        473.00),
    (2, 'FAC-2026-0002', 'Marta Coc', '9988776-5', 980.00);