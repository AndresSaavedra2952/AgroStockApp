import { conexion } from "./Conexion.ts";
import { join } from "../Dependencies/dependencias.ts";
import { HistorialPreciosModel, HistorialPrecioCreateData } from "./HistorialPreciosModel.ts";

export interface ProductoData {
  id_producto: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
  id_usuario: number;
  id_categoria?: number;
  id_ciudad_origen?: number;
  imagen_principal?: string;
  imagenes_adicionales?: string | string[]; // JSON array o string
  disponible: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ProductoDataResponse extends ProductoData {
  imagenUrl?: string | null; // Para compatibilidad
  nombre_productor?: string;
  email_productor?: string;
  ciudad_origen?: string;
  departamento_origen?: string;
  categoria_nombre?: string;
}

export class ProductosModel {
    public _objProducto: ProductoData | null;
    private readonly UPLOADS_DIR: string;
    
    constructor(objProducto: ProductoData | null = null) {
        this._objProducto = objProducto;
        // Usar ruta absoluta basada en el directorio actual
        // @ts-ignore - Deno is a global object in Deno runtime
        const currentDir = Deno.cwd();
        this.UPLOADS_DIR = join(currentDir, "uploads");
        console.log(`[ProductosModel] UPLOADS_DIR inicializado en: ${this.UPLOADS_DIR}`);
    }


    public async ListarProductos(): Promise<ProductoData[]> {
        try {
            const result = await conexion.query("SELECT * FROM productos ORDER BY id_producto DESC");
            return result as ProductoData[];
        } catch (error) {
            console.error("Error al listar productos:", error);
            throw new Error("Error al listar productos.");
        }
    }

    // 📌 Listar productos con información adicional
    public async ListarProductosConInfo(): Promise<Record<string, unknown>[]> {
        try {
            const result = await conexion.query(`
                SELECT 
                    p.*,
                    u.nombre as nombre_productor,
                    u.email as email_productor,
                    u.telefono as telefono_productor,
                    u.foto_perfil as foto_productor,
                    c.nombre as ciudad_origen,
                    d.nombre as departamento_origen,
                    r.nombre as region_origen,
                    cat.nombre as categoria_nombre,
                    cat.imagen_url as categoria_imagen
                FROM productos p
                INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
                LEFT JOIN ciudades c ON p.id_ciudad_origen = c.id_ciudad
                LEFT JOIN departamentos d ON c.id_departamento = d.id_departamento
                LEFT JOIN regiones r ON d.id_region = r.id_region
                LEFT JOIN categorias cat ON p.id_categoria = cat.id_categoria AND cat.activa = 1
                WHERE p.disponible = 1
                ORDER BY p.id_producto DESC
            `);
            return result;
        } catch (error) {
            console.error("Error al listar productos con info:", error);
            return [];
        }
    }

    // 📌 Buscar productos por criterios
    public async BuscarProductos(criterios: {
        nombre?: string;
        categoria?: number;
        ciudad?: number;
        departamento?: number;
        region?: number;
        precio_min?: number;
        precio_max?: number;
        stock_min?: number;
    }): Promise<Record<string, unknown>[]> {
        try {
            let query = `
                SELECT 
                    p.*,
                    u.nombre as nombre_productor,
                    u.email as email_productor,
                    u.telefono as telefono_productor,
                    c.nombre as ciudad_origen,
                    d.nombre as departamento_origen,
                    r.nombre as region_origen,
                    GROUP_CONCAT(cat.nombre) as categorias
                FROM productos p
                INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
                INNER JOIN ciudades c ON p.id_ciudad_origen = c.id_ciudad
                INNER JOIN departamentos d ON c.id_departamento = d.id_departamento
                INNER JOIN regiones r ON d.id_region = r.id_region
                LEFT JOIN categorias cat ON p.id_categoria = cat.id_categoria AND cat.activa = 1
                WHERE p.disponible = 1
            `;
            
            const params: unknown[] = [];

            if (criterios.nombre) {
                query += " AND p.nombre LIKE ?";
                params.push(`%${criterios.nombre}%`);
            }

            if (criterios.categoria) {
                query += " AND p.id_categoria = ?";
                params.push(criterios.categoria);
            }

            if (criterios.ciudad) {
                query += " AND p.id_ciudad_origen = ?";
                params.push(criterios.ciudad);
            }

            if (criterios.departamento) {
                query += " AND c.id_departamento = ?";
                params.push(criterios.departamento);
            }

            if (criterios.region) {
                query += " AND d.id_region = ?";
                params.push(criterios.region);
            }

            if (criterios.precio_min !== undefined) {
                query += " AND p.precio >= ?";
                params.push(criterios.precio_min);
            }

            if (criterios.precio_max !== undefined) {
                query += " AND p.precio <= ?";
                params.push(criterios.precio_max);
            }

            if (criterios.stock_min !== undefined) {
                query += " AND p.stock >= ?";
                params.push(criterios.stock_min);
            }

            query += " ORDER BY p.id_producto DESC";

            const result = await conexion.query(query, params);
            return result;
        } catch (error) {
            console.error("Error al buscar productos:", error);
            return [];
        }
    }

    // 📌 Obtener productos por productor
    public async ObtenerProductosPorProductor(id_usuario: number): Promise<Record<string, unknown>[]> {
        try {
            const result = await conexion.query(`
                SELECT 
                    p.*,
                    c.nombre as ciudad_origen,
                    d.nombre as departamento_origen,
                    r.nombre as region_origen,
                    GROUP_CONCAT(cat.nombre) as categorias
                FROM productos p
                INNER JOIN ciudades c ON p.id_ciudad_origen = c.id_ciudad
                INNER JOIN departamentos d ON c.id_departamento = d.id_departamento
                INNER JOIN regiones r ON d.id_region = r.id_region
                LEFT JOIN categorias cat ON p.id_categoria = cat.id_categoria AND cat.activa = 1
                WHERE p.id_usuario = ?
                ORDER BY p.id_producto DESC
            `, [id_usuario]);
            
            return result;
        } catch (error) {
            console.error("Error al obtener productos por productor:", error);
            return [];
        }
    }

    public async AgregarProducto(imagenData?: string): Promise<{ success: boolean; message: string; producto?: ProductoData }> {
        try {
            if (!this._objProducto) {
                throw new Error("No se proporciono un objeto de producto.");
            }

            const { nombre, descripcion, precio, stock, stock_minimo, id_usuario, id_categoria, id_ciudad_origen, unidad_medida } = this._objProducto;

            if (!nombre || precio === undefined || stock === undefined || !id_usuario) {
                throw new Error("Faltan campos obligatorios: nombre, precio, stock, id_usuario.");
            }

            await conexion.execute("START TRANSACTION");

            const result = await conexion.execute(`INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, id_usuario, id_categoria, id_ciudad_origen, unidad_medida, disponible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [nombre, descripcion || null, precio, stock, stock_minimo || 5, id_usuario, id_categoria || null, id_ciudad_origen || null, unidad_medida || 'kg']
            );

            if (!result || !result.affectedRows || result.affectedRows === 0) {
                await conexion.execute("ROLLBACK");
                return { success: false, message: "No se pudo agregar el producto." };
            }

            const queryResult = await conexion.query("SELECT * FROM productos ORDER BY id_producto DESC LIMIT 1");
            const nuevoProducto = queryResult[0] as ProductoData;

            let rutaImagen = null;
            let errorImagen: string | null = null;
            
            if (imagenData) {
                try {
                    console.log(`[ProductosModel] ========== INICIANDO PROCESO DE IMAGEN ==========`);
                    console.log(`[ProductosModel] Producto ID: ${nuevoProducto.id_producto}`);
                    console.log(`[ProductosModel] Tipo de imagenData: ${typeof imagenData}`);
                    console.log(`[ProductosModel] Longitud de imagenData: ${imagenData.length} caracteres`);
                    console.log(`[ProductosModel] Primeros 50 chars: ${imagenData.substring(0, 50)}`);
                    console.log(`[ProductosModel] ¿Tiene prefijo data:image/? ${imagenData.startsWith('data:image/')}`);
                    
                    console.log(`[ProductosModel] Llamando a guardarImagen...`);
                    rutaImagen = await this.guardarImagen(nuevoProducto.id_producto, imagenData);
                    console.log(`[ProductosModel] ✅ guardarImagen completado. Ruta retornada: ${rutaImagen}`);
                    
                    if (!rutaImagen || rutaImagen.trim().length === 0) {
                        throw new Error("guardarImagen retornó una ruta vacía o null");
                    }
                    
                    if (rutaImagen) {
                        console.log(`[ProductosModel] 🔄 Ejecutando UPDATE para guardar ruta: ${rutaImagen} en producto ${nuevoProducto.id_producto}`);
                        
                        const updateResult = await conexion.execute("UPDATE productos SET imagen_principal = ? WHERE id_producto = ?", 
                        [rutaImagen, nuevoProducto.id_producto]
                        );
                        
                        console.log(`[ProductosModel] ✅ UPDATE ejecutado. Rows affected: ${updateResult.affectedRows || 0}`);
                        console.log(`[ProductosModel] ✅ UPDATE info:`, {
                            affectedRows: updateResult.affectedRows,
                            insertId: updateResult.insertId,
                            changedRows: (updateResult as any).changedRows
                        });
                        
                        if (!updateResult.affectedRows || updateResult.affectedRows === 0) {
                            console.error(`[ProductosModel] ❌ ADVERTENCIA: UPDATE no afectó ninguna fila. El producto podría no existir o ya tener ese valor.`);
                            // Intentar verificar si el producto existe
                            const productoCheck = await conexion.query("SELECT id_producto, imagen_principal FROM productos WHERE id_producto = ?", [nuevoProducto.id_producto]);
                            if (productoCheck.length === 0) {
                                console.error(`[ProductosModel] ❌ ERROR CRÍTICO: El producto ${nuevoProducto.id_producto} no existe después del INSERT!`);
                            } else {
                                console.log(`[ProductosModel] Producto existe. imagen_principal actual: ${productoCheck[0].imagen_principal}`);
                            }
                        } else {
                            console.log(`[ProductosModel] ✅ imagen_principal actualizada en BD: ${rutaImagen}`);
                            
                            // Verificar que se actualizó correctamente ANTES del COMMIT
                            const verificacion = await conexion.query("SELECT imagen_principal FROM productos WHERE id_producto = ?", [nuevoProducto.id_producto]);
                            if (verificacion.length > 0) {
                                const imagenGuardada = verificacion[0].imagen_principal;
                                console.log(`[ProductosModel] ✅ Verificación ANTES de COMMIT: imagen_principal en BD = ${imagenGuardada}`);
                                
                                if (imagenGuardada !== rutaImagen) {
                                    console.error(`[ProductosModel] ❌ ERROR: La ruta guardada (${imagenGuardada}) no coincide con la esperada (${rutaImagen})`);
                                    errorImagen = `La ruta no se guardó correctamente. Esperada: ${rutaImagen}, Obtenida: ${imagenGuardada}`;
                                }
                            } else {
                                console.error(`[ProductosModel] ❌ ERROR: No se pudo verificar la imagen después del UPDATE`);
                            }
                        }
                    } else {
                        console.error(`[ProductosModel] ❌ rutaImagen es null después de guardarImagen`);
                        errorImagen = "La ruta de la imagen es null";
                    }
                } catch (imageError) {
                    const errorMsg = imageError instanceof Error ? imageError.message : String(imageError);
                    console.error(`[ProductosModel] ❌❌❌ ERROR AL PROCESAR IMAGEN ❌❌❌`);
                    console.error(`[ProductosModel] Mensaje de error:`, errorMsg);
                    console.error(`[ProductosModel] Tipo de error:`, imageError instanceof Error ? imageError.name : typeof imageError);
                    console.error(`[ProductosModel] Stack trace completo:`, imageError instanceof Error ? imageError.stack : 'No stack trace');
                    console.error(`[ProductosModel] Error completo:`, imageError);
                    errorImagen = errorMsg;
                    // No hacer rollback del producto, pero registrar el error
                    // El producto se creará sin imagen
                    // IMPORTANTE: No lanzar el error para que el producto se cree sin imagen
                }
            } else {
                console.log(`[ProductosModel] ⚠️ No se proporcionó imagenData para el producto ${nuevoProducto.id_producto}`);
            }

            await conexion.execute("COMMIT");
            console.log(`[ProductosModel] ✅ COMMIT ejecutado`);

            // Verificar DESPUÉS del COMMIT que la imagen se mantuvo
            const productoFinal = await conexion.query("SELECT * FROM productos WHERE id_producto = ?", [nuevoProducto.id_producto]);
            
            if (productoFinal.length > 0) {
                const imagenFinal = productoFinal[0].imagen_principal;
                console.log(`[ProductosModel] ✅ Verificación DESPUÉS de COMMIT: imagen_principal = ${imagenFinal}`);
                
                if (rutaImagen && imagenFinal !== rutaImagen) {
                    console.error(`[ProductosModel] ❌ ERROR CRÍTICO: La imagen se perdió después del COMMIT!`);
                    console.error(`[ProductosModel] Ruta esperada: ${rutaImagen}`);
                    console.error(`[ProductosModel] Ruta en BD: ${imagenFinal}`);
                    errorImagen = `La imagen se perdió después del COMMIT. Esperada: ${rutaImagen}, Obtenida: ${imagenFinal || 'NULL'}`;
                } else if (rutaImagen && imagenFinal === rutaImagen) {
                    console.log(`[ProductosModel] ✅✅✅ CONFIRMADO: La imagen se guardó correctamente en la BD: ${imagenFinal}`);
                }
            } else {
                console.error(`[ProductosModel] ❌ ERROR: No se encontró el producto después del COMMIT`);
            }

            let mensaje = "Producto agregado exitosamente.";
            if (errorImagen) {
                mensaje += ` ⚠️ Advertencia: No se pudo guardar la imagen: ${errorImagen}`;
            }

            return {
                success: true,
                message: mensaje,
                producto: productoFinal[0] as ProductoData,
                ...(errorImagen && { warning: `Error al guardar imagen: ${errorImagen}` })
            };

        } catch (error) {
            await conexion.execute("ROLLBACK");
            console.error("Error al agregar producto:", error);
            return { 
                success: false, 
                message: error instanceof Error ? error.message : "Error al agregar producto." 
            };
        }
    }

    public async EditarProducto(imagenData?: string, imagenesAdicionales?: string[]): Promise<{ success: boolean; message: string }> {
        try {
            if (!this._objProducto || !this._objProducto.id_producto) {
                throw new Error("No se proporciono un objeto de producto valido.");
            }
            const { id_producto, nombre, descripcion, precio, stock, stock_minimo, id_usuario, id_categoria, id_ciudad_origen, unidad_medida, disponible } = this._objProducto;

            await conexion.execute("START TRANSACTION");

            // Obtener el precio anterior antes de actualizar
            const productoAnterior = await conexion.query("SELECT precio FROM productos WHERE id_producto = ?", [id_producto]);
            const precioAnterior = productoAnterior.length > 0 ? parseFloat(productoAnterior[0].precio) : null;

            let rutaImagen = this._objProducto.imagen_principal;
            
            if (imagenData) {
                if (this._objProducto.imagen_principal) {
                    const productDir = join(this.UPLOADS_DIR, id_producto.toString());
                    if (await this.existeDirectorio(productDir)) {
                        // @ts-ignore - Deno is a global object in Deno runtime
                        await Deno.remove(productDir, { recursive: true });
                    }
                }
                
                try {
                    rutaImagen = await this.guardarImagen(id_producto, imagenData);
                } catch (imageError) {
                    console.error("Error al procesar nueva imagen:", imageError);
                }
            }

            // Procesar imágenes adicionales
            // El frontend envía un array que puede contener:
            // - Rutas relativas de imágenes existentes que se mantienen (strings que no son base64)
            // - Imágenes nuevas en formato base64 (strings que empiezan con "data:image/")
            console.log(`[ProductosModel.EditarProducto] Procesando imágenes adicionales para producto ${id_producto}`);
            console.log(`[ProductosModel.EditarProducto] imagenesAdicionales recibidas:`, {
                tipo: typeof imagenesAdicionales,
                esArray: Array.isArray(imagenesAdicionales),
                longitud: imagenesAdicionales ? imagenesAdicionales.length : 0,
                contenido: imagenesAdicionales ? imagenesAdicionales.map((img, idx) => ({
                    indice: idx,
                    tipo: typeof img,
                    esBase64: typeof img === 'string' && img.startsWith('data:image/'),
                    esRuta: typeof img === 'string' && !img.startsWith('data:image/'),
                    preview: typeof img === 'string' ? img.substring(0, 50) : String(img)
                })) : null
            });
            
            let imagenesAdicionalesJson: string | null = null;
            if (imagenesAdicionales && imagenesAdicionales.length > 0) {
                try {
                    const rutasFinales: string[] = [];
                    
                    for (const imgData of imagenesAdicionales) {
                        if (typeof imgData === 'string' && imgData.trim().length > 0) {
                            // Si es base64 (nueva imagen), guardarla
                            if (imgData.startsWith('data:image/')) {
                                try {
                                    console.log(`[ProductosModel.EditarProducto] Guardando nueva imagen adicional para producto ${id_producto}`);
                                    const rutaImg = await this.guardarImagen(id_producto, imgData);
                                    console.log(`[ProductosModel.EditarProducto] ✅ Nueva imagen guardada: ${rutaImg}`);
                                    rutasFinales.push(rutaImg);
                                } catch (imgError) {
                                    console.error(`[ProductosModel.EditarProducto] Error al guardar imagen adicional nueva para producto ${id_producto}:`, imgError);
                                }
                            } else {
                                // Si es una ruta relativa (imagen existente que se mantiene), agregarla directamente
                                console.log(`[ProductosModel.EditarProducto] Manteniendo imagen existente: ${imgData}`);
                                rutasFinales.push(imgData);
                            }
                        }
                    }
                    
                    if (rutasFinales.length > 0) {
                        imagenesAdicionalesJson = JSON.stringify(rutasFinales);
                        console.log(`[ProductosModel.EditarProducto] ✅ Imágenes adicionales finales para producto ${id_producto}:`, imagenesAdicionalesJson);
                    } else {
                        console.log(`[ProductosModel.EditarProducto] ⚠️ No se procesaron imágenes adicionales válidas para producto ${id_producto}`);
                    }
                } catch (error) {
                    console.error(`[ProductosModel.EditarProducto] Error al procesar imágenes adicionales para producto ${id_producto}:`, error);
                }
            } else {
                // Si se envía un array vacío explícitamente, limpiar las imágenes adicionales
                // PERO si no se envía el campo, mantener las existentes
                console.log(`[ProductosModel.EditarProducto] Array vacío o undefined recibido para producto ${id_producto}`);
                console.log(`[ProductosModel.EditarProducto] imagenesAdicionales es:`, imagenesAdicionales);
                
                // Si se envía explícitamente un array vacío, limpiar
                // Si es undefined/null, mantener las existentes (no actualizar el campo)
                if (imagenesAdicionales !== undefined && imagenesAdicionales !== null && Array.isArray(imagenesAdicionales) && imagenesAdicionales.length === 0) {
                    console.log(`[ProductosModel.EditarProducto] Array vacío explícito recibido, limpiando imágenes adicionales para producto ${id_producto}`);
                    imagenesAdicionalesJson = null;
                } else {
                    // Si no se envía el campo, no actualizar (mantener las existentes)
                    console.log(`[ProductosModel.EditarProducto] No se enviaron imágenes adicionales, manteniendo las existentes para producto ${id_producto}`);
                    imagenesAdicionalesJson = undefined; // undefined significa "no actualizar este campo"
                }
            }

            console.log(`[ProductosModel.EditarProducto] Actualizando producto ${id_producto} con imagenes_adicionales:`, imagenesAdicionalesJson);
            
            // Construir la query dinámicamente según si se actualizan las imágenes adicionales
            let query: string;
            let params: any[];
            
            if (imagenesAdicionalesJson !== undefined) {
                // Si se proporciona un valor (null o JSON), actualizar el campo
                query = `UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, stock_minimo = ?, id_usuario = ?, id_categoria = ?, id_ciudad_origen = ?, unidad_medida = ?, imagen_principal = ?, imagenes_adicionales = ?, disponible = ? WHERE id_producto = ?`;
                params = [nombre, descripcion || null, precio, stock, stock_minimo || 5, id_usuario, id_categoria || null, id_ciudad_origen || null, unidad_medida || 'kg', rutaImagen, imagenesAdicionalesJson, disponible !== false ? 1 : 0, id_producto];
            } else {
                // Si es undefined, no actualizar el campo imagenes_adicionales (mantener las existentes)
                query = `UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, stock_minimo = ?, id_usuario = ?, id_categoria = ?, id_ciudad_origen = ?, unidad_medida = ?, imagen_principal = ?, disponible = ? WHERE id_producto = ?`;
                params = [nombre, descripcion || null, precio, stock, stock_minimo || 5, id_usuario, id_categoria || null, id_ciudad_origen || null, unidad_medida || 'kg', rutaImagen, disponible !== false ? 1 : 0, id_producto];
            }
            
            console.log(`[ProductosModel.EditarProducto] Query a ejecutar:`, query.substring(0, 100) + '...');
            console.log(`[ProductosModel.EditarProducto] Parámetros:`, params.map((p, i) => ({ indice: i, tipo: typeof p, valor: typeof p === 'string' && p.length > 50 ? p.substring(0, 50) + '...' : p })));
            
            const result = await conexion.execute(query, params);
            
            // Verificar que se actualizó correctamente
            if (result && result.affectedRows > 0) {
                const productoVerificado = await conexion.query("SELECT imagenes_adicionales FROM productos WHERE id_producto = ?", [id_producto]);
                console.log(`[ProductosModel.EditarProducto] ✅ Producto ${id_producto} actualizado. imagenes_adicionales en BD:`, productoVerificado[0]?.imagenes_adicionales);
            }

            // Si el precio cambió, registrar en historial de precios
            if (precioAnterior !== null && precio !== undefined && precioAnterior !== precio) {
                try {
                    const historialData: HistorialPrecioCreateData = {
                        id_producto,
                        precio_anterior: precioAnterior,
                        precio_nuevo: precio,
                        id_usuario_modifico: id_usuario || null
                    };
                    const historialModel = new HistorialPreciosModel(historialData);
                    await historialModel.RegistrarCambioPrecio();
                } catch (historialError) {
                    console.error("Error al registrar historial de precio:", historialError);
                    // No fallar la actualización del producto si falla el historial
                }
            }

            // Si se actualizó la imagen o hay cambios en los datos, considerar exitoso
            if (result && ((result.affectedRows ?? 0) > 0 || imagenData)) {
                await conexion.execute("COMMIT");
                return {
                    success: true,
                    message: imagenData ? "Imagen actualizada exitosamente." : "Producto editado exitosamente.",
                };
            } else {
                await conexion.execute("ROLLBACK");
                return {
                    success: false,
                    message: "No se pudo editar el producto.",
                };
            }
        } catch (error) {
            await conexion.execute("ROLLBACK");
            console.error("Error al editar producto:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Error al editar el producto.",
            };
        }
    }

    public async EliminarProducto(id_producto: number): Promise<{ success: boolean; message: string }> {
        try {
            await conexion.execute("START TRANSACTION");

            const producto = await conexion.query("SELECT * FROM productos WHERE id_producto = ?", [id_producto]);
            
            if (!producto || producto.length === 0) {
                await conexion.execute("ROLLBACK");
                return {
                    success: false,
                    message: "El producto no existe."
                };
            }

            const result = await conexion.execute("DELETE FROM productos WHERE id_producto = ?", [id_producto]);

            if (result && result.affectedRows && result.affectedRows > 0) {
                await this.eliminarCarpetaProducto(id_producto);
                
                await conexion.execute("COMMIT");
                return {
                    success: true,
                    message: "Producto eliminado exitosamente."
                };
            } else {
                await conexion.execute("ROLLBACK");
                return {
                    success: false,
                    message: "No se pudo eliminar el producto."
                };
            }
        } catch (error) {
            await conexion.execute("ROLLBACK");
            console.error("Error al eliminar producto:", error);
            return {
                success: false,
                message: error instanceof Error ? error.message : "Error al eliminar el producto."
            };
        }        
    }

    public async ObtenerProductoPorId(id_producto: number): Promise<ProductoData | null> {
        try {
            const result = await conexion.query("SELECT * FROM productos WHERE id_producto = ?", [id_producto]);
            return result.length > 0 ? result[0] as ProductoData : null;
        } catch (error) {
            console.error("Error al obtener producto por ID:", error);
            throw new Error("Error al obtener producto.");
        }
    }

    public construirUrlImagen(rutaImagen: string | null | undefined, baseUrl: string = "http://localhost:8000"): string | null {
        if (!rutaImagen) return null;
        
        // Normalizar la ruta: cambiar barras invertidas por barras normales (Windows)
        const rutaNormalizada = rutaImagen.replace(/\\/g, '/');
        
        // Asegurarse de que la ruta no empiece con /
        const rutaLimpia = rutaNormalizada.startsWith('/') ? rutaNormalizada.substring(1) : rutaNormalizada;
        
        // Construir URL completa
        const url = `${baseUrl}/${rutaLimpia}`;
        console.log(`[ProductosModel.construirUrlImagen] Ruta original: ${rutaImagen}, URL construida: ${url}`);
        
        return url;
    }

    private async existeDirectorio(ruta: string): Promise<boolean> {
        try {
            // @ts-ignore - Deno is a global object in Deno runtime
            const stat = await Deno.stat(ruta);
            return stat.isDirectory;
        } catch {
            return false;
        }
    }

    private async crearDirectorio(ruta: string): Promise<void> {
        try {
            console.log(`[ProductosModel.crearDirectorio] Creando directorio: ${ruta}`);
            // @ts-ignore - Deno is a global object in Deno runtime
            await Deno.mkdir(ruta, { recursive: true });
            console.log(`[ProductosModel.crearDirectorio] ✅ Directorio creado: ${ruta}`);
        } catch (error) {
            // @ts-ignore - Deno is a global object in Deno runtime
            if (error instanceof Deno.errors.AlreadyExists) {
                console.log(`[ProductosModel.crearDirectorio] Directorio ya existe: ${ruta}`);
            } else {
                console.error(`[ProductosModel.crearDirectorio] ❌ Error al crear directorio:`, error);
                throw error;
            }
        }
    }

    private async crearCarpetaProducto(idProducto: number): Promise<string> {
        try {
            console.log(`[ProductosModel.crearCarpetaProducto] Creando carpeta para producto ${idProducto}`);
            console.log(`[ProductosModel.crearCarpetaProducto] UPLOADS_DIR: ${this.UPLOADS_DIR}`);
            
            // Crear carpeta uploads si no existe
            if (!(await this.existeDirectorio(this.UPLOADS_DIR))) {
                console.log(`[ProductosModel.crearCarpetaProducto] Creando carpeta uploads: ${this.UPLOADS_DIR}`);
                await this.crearDirectorio(this.UPLOADS_DIR);
                console.log(`[ProductosModel.crearCarpetaProducto] ✅ Carpeta uploads creada`);
            } else {
                console.log(`[ProductosModel.crearCarpetaProducto] ✅ Carpeta uploads ya existe`);
            }

            // Crear carpeta del producto
            const productDir = join(this.UPLOADS_DIR, idProducto.toString());
            console.log(`[ProductosModel.crearCarpetaProducto] Ruta de carpeta producto: ${productDir}`);
            
            if (!(await this.existeDirectorio(productDir))) {
                console.log(`[ProductosModel.crearCarpetaProducto] Creando carpeta producto: ${productDir}`);
                await this.crearDirectorio(productDir);
                console.log(`[ProductosModel.crearCarpetaProducto] ✅ Carpeta producto creada`);
            } else {
                console.log(`[ProductosModel.crearCarpetaProducto] ✅ Carpeta producto ya existe`);
            }
            
            // Verificar que ambas carpetas existen
            const uploadsExiste = await this.existeDirectorio(this.UPLOADS_DIR);
            const productExiste = await this.existeDirectorio(productDir);
            console.log(`[ProductosModel.crearCarpetaProducto] Verificación: uploads existe=${uploadsExiste}, producto existe=${productExiste}`);

            return productDir;
        } catch (error) {
            console.error(`[ProductosModel.crearCarpetaProducto] ❌ Error al crear carpeta para producto:`, error);
            throw new Error("Error al crear directorio para la imagen: " + (error instanceof Error ? error.message : "Error desconocido"));
        }
    }

    private async eliminarCarpetaProducto(idProducto: number): Promise<void> {
        try {
            const productDir = join(this.UPLOADS_DIR, idProducto.toString());
            
            if (await this.existeDirectorio(productDir)) {
                // @ts-ignore - Deno is a global object in Deno runtime
                await Deno.remove(productDir, { recursive: true });
            }

            if (await this.existeDirectorio(this.UPLOADS_DIR)) {
                try {
                    const items = [];
                    // @ts-ignore - Deno is a global object in Deno runtime
                    for await (const dirEntry of Deno.readDir(this.UPLOADS_DIR)) {
                        items.push(dirEntry);
                    }
                    if (items.length === 0) {
                        // @ts-ignore - Deno is a global object in Deno runtime
                        await Deno.remove(this.UPLOADS_DIR);
                    }
                } catch (_readError) {
                    console.log("Directorio uploads ya no existe o esta vacio");
                }
            }
        } catch (error) {
            console.error(`Error al eliminar carpeta para producto`, error);
        }
    }

    private detectarTipoImagen(imagenData: string): string {
        console.log(`[ProductosModel.detectarTipoImagen] Detectando tipo de imagen...`);
        console.log(`[ProductosModel.detectarTipoImagen] Primeros 50 chars: ${imagenData.substring(0, 50)}`);

        if (imagenData.startsWith('data:image/')) {
            const match = imagenData.match(/data:image\/([^;]+)/);
            const extension = match ? match[1] : 'jpg';
            // Normalizar extensiones comunes
            if (extension === 'jpeg') return 'jpg';
            console.log(`[ProductosModel.detectarTipoImagen] Tipo detectado desde data:image/: ${extension}`);
            return extension;
        }
        
        // Si es data:image;base64, intentar detectar desde los primeros bytes del base64
        if (imagenData.startsWith('data:image;base64,') || imagenData.startsWith('data:image,base64,')) {
            console.log(`[ProductosModel.detectarTipoImagen] Formato sin tipo MIME específico, detectando desde base64...`);
            const partes = imagenData.split(',');
            if (partes.length >= 2) {
                const base64Data = partes[1];
                // Los primeros bytes del base64 pueden indicar el tipo
                // JPEG: /9j/4AAQ
                // PNG: iVBORw0KGgo
                // GIF: R0lGODlh
                if (base64Data.startsWith('/9j/') || base64Data.startsWith('/9j/4AAQ')) {
                    console.log(`[ProductosModel.detectarTipoImagen] Detectado JPEG desde base64`);
                    return 'jpg';
                }
                if (base64Data.startsWith('iVBORw0KGgo')) {
                    console.log(`[ProductosModel.detectarTipoImagen] Detectado PNG desde base64`);
                    return 'png';
                }
                if (base64Data.startsWith('R0lGODlh')) {
                    console.log(`[ProductosModel.detectarTipoImagen] Detectado GIF desde base64`);
                    return 'gif';
                }
            }
            console.log(`[ProductosModel.detectarTipoImagen] No se pudo detectar tipo desde base64, usando jpg por defecto`);
            return 'jpg';
        }

        if (imagenData.startsWith('http://') || imagenData.startsWith('https://') || imagenData.startsWith('file://')) {
            try {
                const url = new URL(imagenData);
                const pathname = url.pathname.toLowerCase();
                if (pathname.includes('.png')) return 'png';
                if (pathname.includes('.jpg') || pathname.includes('.jpeg')) return 'jpg';
                if (pathname.includes('.gif')) return 'gif';
                if (pathname.includes('.webp')) return 'webp';
                if (pathname.includes('.bmp')) return 'bmp';
                if (pathname.includes('.svg')) return 'svg';
            } catch {
                // Si falla el parseo de URL, continuar
            }
            return 'jpg';
        }
        
        console.log(`[ProductosModel.detectarTipoImagen] No se pudo detectar tipo, usando jpg por defecto`);
        return 'jpg';
    }

    private async procesarImagen(imagenData: string): Promise<Uint8Array> {
        try {
            console.log(`[ProductosModel.procesarImagen] Iniciando procesamiento de imagen`);
            console.log(`[ProductosModel.procesarImagen] Longitud total: ${imagenData.length} caracteres`);
            console.log(`[ProductosModel.procesarImagen] Primeros 100 chars: ${imagenData.substring(0, 100)}`);
            
            // Manejar formato data:image/...;base64,...
            if (imagenData.startsWith('data:image/')) {
                console.log(`[ProductosModel.procesarImagen] Formato detectado: data:image/ (base64 con prefijo)`);
                
                // Separar el prefijo del base64
                const partes = imagenData.split(',');
                if (partes.length < 2) {
                    throw new Error("Datos base64 inválidos: no se encontró la coma separadora");
                }
                
                const base64Data = partes[1];
                console.log(`[ProductosModel.procesarImagen] Base64 extraído, longitud: ${base64Data.length} caracteres`);
                
                if (!base64Data || base64Data.trim().length === 0) {
                    throw new Error("Datos base64 inválidos: la parte base64 está vacía");
                }
                
                // Decodificar base64
                console.log(`[ProductosModel.procesarImagen] Decodificando base64...`);
                const decoded = atob(base64Data);
                console.log(`[ProductosModel.procesarImagen] Base64 decodificado, longitud: ${decoded.length} caracteres`);
                
                // Convertir a Uint8Array
                const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
                console.log(`[ProductosModel.procesarImagen] ✅ Imagen procesada exitosamente, tamaño: ${bytes.length} bytes`);
                
                return bytes;
            }
            
            // Manejar formato data:image;base64,... (sin tipo MIME específico)
            if (imagenData.startsWith('data:image;base64,')) {
                console.log(`[ProductosModel.procesarImagen] Formato detectado: data:image;base64, (base64 sin tipo MIME específico)`);
                
                // Separar el prefijo del base64
                const partes = imagenData.split(',');
                if (partes.length < 2) {
                    throw new Error("Datos base64 inválidos: no se encontró la coma separadora");
                }
                
                const base64Data = partes[1];
                console.log(`[ProductosModel.procesarImagen] Base64 extraído, longitud: ${base64Data.length} caracteres`);
                
                if (!base64Data || base64Data.trim().length === 0) {
                    throw new Error("Datos base64 inválidos: la parte base64 está vacía");
                }
                
                // Decodificar base64
                console.log(`[ProductosModel.procesarImagen] Decodificando base64...`);
                const decoded = atob(base64Data);
                console.log(`[ProductosModel.procesarImagen] Base64 decodificado, longitud: ${decoded.length} caracteres`);
                
                // Convertir a Uint8Array
                const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
                console.log(`[ProductosModel.procesarImagen] ✅ Imagen procesada exitosamente, tamaño: ${bytes.length} bytes`);
                
                return bytes;
            }
            
            // Manejar formato data:image,base64,... (sin punto y coma)
            if (imagenData.startsWith('data:image,base64,')) {
                console.log(`[ProductosModel.procesarImagen] Formato detectado: data:image,base64,`);
                
                const partes = imagenData.split(',');
                if (partes.length < 2) {
                    throw new Error("Datos base64 inválidos: no se encontró la coma separadora");
                }
                
                const base64Data = partes[1];
                if (!base64Data || base64Data.trim().length === 0) {
                    throw new Error("Datos base64 inválidos: la parte base64 está vacía");
                }
                
                const decoded = atob(base64Data);
                const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
                console.log(`[ProductosModel.procesarImagen] ✅ Imagen procesada exitosamente, tamaño: ${bytes.length} bytes`);
                
                return bytes;
            }
            
            if (imagenData.startsWith('file://')) {
                let rutaArchivo = imagenData.replace('file://', '');
                
                if (rutaArchivo.startsWith('/') && rutaArchivo.match(/^\/[A-Za-z]:/)) {
                    rutaArchivo = rutaArchivo.substring(1);
                }
                                
                try {
                    // @ts-ignore - Deno is a global object in Deno runtime
                    const stat = await Deno.stat(rutaArchivo);
                    if (!stat.isFile) {
                        throw new Error(`La ruta no es un archivo valido: ${rutaArchivo}`);
                    }
                    
                    // @ts-ignore - Deno is a global object in Deno runtime
                    const fileData = await Deno.readFile(rutaArchivo);
                    return fileData;
                } catch (error) {
                    console.error(`Error al leer archivo`, error);
                    throw new Error(`No se pudo leer el archivo: ${rutaArchivo}. Verifica que el archivo existe y tienes permisos de lectura.`);
                }
            }
            
            // Manejar formato data:image;base64,... (sin tipo MIME específico)
            if (imagenData.startsWith('data:image;base64,')) {
                console.log(`[ProductosModel.procesarImagen] Formato detectado: data:image;base64, (base64 sin tipo MIME específico)`);
                
                // Separar el prefijo del base64
                const partes = imagenData.split(',');
                if (partes.length < 2) {
                    throw new Error("Datos base64 inválidos: no se encontró la coma separadora");
                }
                
                const base64Data = partes[1];
                console.log(`[ProductosModel.procesarImagen] Base64 extraído, longitud: ${base64Data.length} caracteres`);
                
                if (!base64Data || base64Data.trim().length === 0) {
                    throw new Error("Datos base64 inválidos: la parte base64 está vacía");
                }
                
                // Decodificar base64
                console.log(`[ProductosModel.procesarImagen] Decodificando base64...`);
                const decoded = atob(base64Data);
                console.log(`[ProductosModel.procesarImagen] Base64 decodificado, longitud: ${decoded.length} caracteres`);
                
                // Convertir a Uint8Array
                const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
                console.log(`[ProductosModel.procesarImagen] ✅ Imagen procesada exitosamente, tamaño: ${bytes.length} bytes`);
                
                return bytes;
            }
            
            if (imagenData.startsWith('http://') || imagenData.startsWith('https://')) {
                const response = await fetch(imagenData);
                if (!response.ok) {
                    throw new Error(`Error al descargar imagen: ${response.status} - ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                return new Uint8Array(arrayBuffer);
            }
            
            if (imagenData.match(/^[A-Za-z0-9+/]+=*$/)) {
                try {
                    return Uint8Array.from(atob(imagenData), c => c.charCodeAt(0));
                } catch (_error) {
                    throw new Error("El texto parece ser base64 pero no se puede decodificar correctamente");
                }
            }
            
            throw new Error(`Formato de imagen no reconocido. Recibido: ${imagenData.substring(0, 100)}`);
            
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("Error desconocido al procesar la imagen");
        }
    }

    private async guardarImagen(idProducto: number, imagenData: string): Promise<string> {
        try {
            console.log(`[ProductosModel.guardarImagen] ========== INICIANDO GUARDADO DE IMAGEN ==========`);
            console.log(`[ProductosModel.guardarImagen] Producto ID: ${idProducto}`);
            console.log(`[ProductosModel.guardarImagen] Tipo de imagenData: ${typeof imagenData}`);
            console.log(`[ProductosModel.guardarImagen] Longitud de imagenData: ${imagenData.length} caracteres`);
            console.log(`[ProductosModel.guardarImagen] Primeros 100 chars: ${imagenData.substring(0, 100)}`);
            
            // Verificar que imagenData no esté vacío
            if (!imagenData || imagenData.trim().length === 0) {
                throw new Error("imagenData está vacío o es null");
            }
            
            // Crear carpeta del producto
            const productDir = await this.crearCarpetaProducto(idProducto);
            console.log(`[ProductosModel.guardarImagen] ✅ Carpeta creada/verificada: ${productDir}`);
            
            // Verificar que la carpeta existe
            const carpetaExiste = await this.existeDirectorio(productDir);
            if (!carpetaExiste) {
                throw new Error(`La carpeta ${productDir} no se pudo crear`);
            }
            console.log(`[ProductosModel.guardarImagen] ✅ Carpeta existe: ${carpetaExiste}`);
            
            // Generar nombre de archivo
            const timestamp = Date.now();
            const extension = this.detectarTipoImagen(imagenData);
            console.log(`[ProductosModel.guardarImagen] Extensión detectada: ${extension}`);
            
            const nombreArchivo = `imagen_${timestamp}.${extension}`;
            const rutaCompleta = join(productDir, nombreArchivo);
            console.log(`[ProductosModel.guardarImagen] Ruta completa del archivo: ${rutaCompleta}`);

            // Procesar imagen (convertir base64 a bytes)
            console.log(`[ProductosModel.guardarImagen] Procesando imagen...`);
            let dataToWrite: Uint8Array;
            try {
                dataToWrite = await this.procesarImagen(imagenData);
                console.log(`[ProductosModel.guardarImagen] ✅ Imagen procesada, tamaño: ${dataToWrite.length} bytes`);
            } catch (procesarError) {
                console.error(`[ProductosModel.guardarImagen] ❌ ERROR al procesar imagen:`, procesarError);
                throw new Error(`Error al procesar la imagen: ${procesarError instanceof Error ? procesarError.message : 'Error desconocido'}`);
            }
            
            if (!dataToWrite || dataToWrite.length === 0) {
                throw new Error("Los datos de la imagen están vacíos después del procesamiento");
            }
                        
            // Guardar archivo
            console.log(`[ProductosModel.guardarImagen] Escribiendo archivo en: ${rutaCompleta}`);
            console.log(`[ProductosModel.guardarImagen] Tamaño de datos a escribir: ${dataToWrite.length} bytes`);
            try {
                // @ts-ignore - Deno is a global object in Deno runtime
                await Deno.writeFile(rutaCompleta, dataToWrite);
                console.log(`[ProductosModel.guardarImagen] ✅ Archivo escrito exitosamente`);
            } catch (writeError) {
                console.error(`[ProductosModel.guardarImagen] ❌ ERROR al escribir archivo:`, writeError);
                console.error(`[ProductosModel.guardarImagen] Ruta intentada: ${rutaCompleta}`);
                console.error(`[ProductosModel.guardarImagen] Tipo de error:`, writeError instanceof Error ? writeError.name : typeof writeError);
                console.error(`[ProductosModel.guardarImagen] Mensaje de error:`, writeError instanceof Error ? writeError.message : String(writeError));
                throw new Error(`Error al escribir el archivo: ${writeError instanceof Error ? writeError.message : 'Error desconocido'}`);
            }
            
            // Verificar que el archivo se guardó correctamente
            try {
                // @ts-ignore - Deno is a global object in Deno runtime
                const fileInfo = await Deno.stat(rutaCompleta);
                console.log(`[ProductosModel.guardarImagen] ✅ Verificación: Archivo existe, tamaño: ${fileInfo.size} bytes`);
                
                if (fileInfo.size === 0) {
                    throw new Error("El archivo se creó pero está vacío");
                }
                
                if (fileInfo.size !== dataToWrite.length) {
                    console.warn(`[ProductosModel.guardarImagen] ⚠️ ADVERTENCIA: Tamaño del archivo (${fileInfo.size}) no coincide con datos escritos (${dataToWrite.length})`);
                }
            } catch (statError) {
                console.error(`[ProductosModel.guardarImagen] ❌ ERROR: No se pudo verificar el archivo guardado:`, statError);
                throw new Error(`El archivo no se guardó correctamente: ${statError instanceof Error ? statError.message : 'Error desconocido'}`);
            }
            
            // Generar ruta relativa para la base de datos
            const rutaRelativa = join("uploads", idProducto.toString(), nombreArchivo);
            console.log(`[ProductosModel.guardarImagen] Ruta relativa para BD: ${rutaRelativa}`);
            console.log(`[ProductosModel.guardarImagen] ========== IMAGEN GUARDADA EXITOSAMENTE ==========`);
            
            return rutaRelativa;
        } catch (error) {
            console.error(`[ProductosModel.guardarImagen] ❌❌❌ ERROR AL GUARDAR IMAGEN ❌❌❌`);
            console.error(`[ProductosModel.guardarImagen] Error:`, error);
            console.error(`[ProductosModel.guardarImagen] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace');
            throw new Error("Error al guardar la imagen: " + (error instanceof Error ? error.message : "Error desconocido"));
        }
    }
}