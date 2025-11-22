import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { z } from "../Dependencies/dependencias.ts";
import { ProductosModel, ProductoData } from "../Models/ProductosModel.ts";
import { conexion } from "../Models/Conexion.ts";

interface ProductoDataResponse extends ProductoData {
  imagenUrl: string | null;
}

// Helper function para obtener la URL base de forma segura
function getBaseUrl(ctx: Context): string {
  const origin = ctx.request.url.origin;
  if (typeof origin === 'string' && origin) {
    return origin;
  }
  return 'http://localhost:8000';
}

const productosSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().min(0),
  stock: z.number().min(0),
  stock_minimo: z.number().min(0).optional(),
  id_usuario: z.number().int().positive(),
  id_categoria: z.number().int().positive().optional().nullable(),
  id_ciudad_origen: z.number().int().positive().optional().nullable(),
  unidad_medida: z.string().optional(),
  disponible: z.boolean().optional(),
  imagen_principal: z.string().url().optional().nullable(),
}).strip(); // Eliminar campos desconocidos (como imagenData) sin validarlos

const productosUpdateSchema = productosSchema.extend({
  id_producto: z.number().int().positive(),
  imagen_principal: z.string().optional(),
  imagenes_adicionales: z.array(z.string()).optional(),
});

const filtrosSchema = z.object({
  nombre: z.string().optional(),
  precio_min: z.string().transform((val: string) => val ? Number(val) : undefined).optional(),
  precio_max: z.string().transform((val: string) => val ? Number(val) : undefined).optional(),
  stock_min: z.string().transform((val: string) => val ? Number(val) : undefined).optional(),
  id_usuario: z.string().transform((val: string) => val ? Number(val) : undefined).optional(),
  id_ciudad_origen: z.string().transform((val: string) => val ? Number(val) : undefined).optional(),
  unidad_medida: z.string().optional(),
  disponible: z.string().transform((val: string) => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  orden: z.enum(['nombre_asc', 'nombre_desc', 'precio_asc', 'precio_desc', 'stock_asc', 'stock_desc']).optional(),
  limite: z.string().transform((val: string) => val ? Number(val) : 50).optional(),
  pagina: z.string().transform((val: string) => val ? Number(val) : 1).optional(),
});

// deno-lint-ignore no-explicit-any
function filtrarProductos(productos: ProductoData[], filtros: any): ProductoData[] {
  let productosFiltrados = [...productos];

  if (filtros.nombre) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.nombre.toLowerCase().includes(filtros.nombre.toLowerCase())
    );
  }

  if (filtros.precio_min !== undefined) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.precio !== undefined && producto.precio >= filtros.precio_min
    );
  }
  if (filtros.precio_max !== undefined) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.precio !== undefined && producto.precio <= filtros.precio_max
    );
  }

  if (filtros.stock_min !== undefined) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.stock >= filtros.stock_min
    );
  }

  if (filtros.id_usuario !== undefined) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.id_usuario === filtros.id_usuario
    );
  }

  if (filtros.id_ciudad_origen !== undefined) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.id_ciudad_origen === filtros.id_ciudad_origen
    );
  }

  if (filtros.unidad_medida) {
    productosFiltrados = productosFiltrados.filter(producto => 
      producto.unidad_medida?.toLowerCase().includes(filtros.unidad_medida.toLowerCase())
    );
  }

  if (filtros.disponible !== undefined) {
    if (filtros.disponible) {
      productosFiltrados = productosFiltrados.filter(producto => producto.stock > 0);
    } else {
      productosFiltrados = productosFiltrados.filter(producto => producto.stock === 0);
    }
  }

  if (filtros.orden) {
    switch (filtros.orden) {
      case 'nombre_asc':
        productosFiltrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      case 'nombre_desc':
        productosFiltrados.sort((a, b) => b.nombre.localeCompare(a.nombre));
        break;
      case 'precio_asc':
        productosFiltrados.sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0));
        break;
      case 'precio_desc':
        productosFiltrados.sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0));
        break;
      case 'stock_asc':
        productosFiltrados.sort((a, b) => a.stock - b.stock);
        break;
      case 'stock_desc':
        productosFiltrados.sort((a, b) => b.stock - a.stock);
        break;
    }
  }

  return productosFiltrados;
}

function paginarResultados(productos: ProductoData[], pagina: number, limite: number) {
  const inicio = (pagina - 1) * limite;
  const fin = inicio + limite;
  const productosPaginados = productos.slice(inicio, fin);
  
  return {
    productos: productosPaginados,
    total: productos.length,
    pagina,
    limite,
    totalPaginas: Math.ceil(productos.length / limite),
    hayMasPaginas: fin < productos.length
  };
}

export const getProductos = async (ctx: Context) => {
  try {
    const queryParams = Object.fromEntries(ctx.request.url.searchParams.entries());
    const filtros = filtrosSchema.parse(queryParams);

    const objProductos = new ProductosModel();
    const lista = await objProductos.ListarProductos();

    const productosFiltrados = filtrarProductos(lista, filtros);
    const resultado = paginarResultados(productosFiltrados, filtros.pagina || 1, filtros.limite || 50);
    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = resultado.productos.map(producto => ({
      ...producto,
      imagenUrl: producto.imagen_principal 
        ? objProductos.construirUrlImagen(producto.imagen_principal, baseUrl)
        : null
    }));

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: resultado.productos.length > 0 ? `${resultado.productos.length} productos encontrados.` : "No se encontraron productos con los filtros aplicados.",
      data: listaConImagenes,
      pagination: {
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas,
        hayMasPaginas: resultado.hayMasPaginas
      },
      filtros_aplicados: filtros
    };
  } catch (error) {
    console.error("Error en getProductos:", error);
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "Parámetros de filtro inválidos.",
        errors: zodError.errors.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    } else {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: "Error interno del servidor.",
      };
    }
  }
};

export const getProductosPorUsuario = async (ctx: RouterContext<"/productos/usuario/:id">) => {
  try {
    const id_usuario = Number(ctx.params.id);
    
    if (isNaN(id_usuario) || id_usuario <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de usuario inválido.",
      };
      return;
    }

    const queryParams = Object.fromEntries(ctx.request.url.searchParams.entries());
    const filtros = { ...filtrosSchema.parse(queryParams), id_usuario };

    const objProductos = new ProductosModel();
    const lista = await objProductos.ListarProductos();

    const productosFiltrados = filtrarProductos(lista, filtros);
    const resultado = paginarResultados(productosFiltrados, filtros.pagina || 1, filtros.limite || 50);
    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = resultado.productos.map(producto => ({
      ...producto,
      imagenUrl: producto.imagen_principal 
        ? objProductos.construirUrlImagen(producto.imagen_principal, baseUrl)
        : null
    }));

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: resultado.productos.length > 0 ? `${resultado.productos.length} productos encontrados para el usuario.` : "No se encontraron productos para este usuario.",
      data: listaConImagenes,
      pagination: {
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas,
        hayMasPaginas: resultado.hayMasPaginas
      }
    };
  } catch (error) {
    console.error("Error en getProductosPorUsuario:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const getProductosDisponibles = async (ctx: Context) => {
  try {
    const queryParams = Object.fromEntries(ctx.request.url.searchParams.entries());
    const filtros = { ...filtrosSchema.parse(queryParams), disponible: true };

    const objProductos = new ProductosModel();
    const lista = await objProductos.ListarProductos();

    const productosFiltrados = filtrarProductos(lista, filtros);
    const resultado = paginarResultados(productosFiltrados, filtros.pagina || 1, filtros.limite || 50);
    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = resultado.productos.map(producto => ({
      ...producto,
      imagenUrl: producto.imagen_principal 
        ? objProductos.construirUrlImagen(producto.imagen_principal, baseUrl)
        : null
    }));

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: resultado.productos.length > 0
        ? `${resultado.productos.length} productos disponibles encontrados.`
        : "No hay productos disponibles.",
      data: listaConImagenes,
      pagination: {
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas,
        hayMasPaginas: resultado.hayMasPaginas
      }
    };
  } catch (error) {
    console.error("Error en getProductosDisponibles:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const buscarProductos = async (ctx: Context) => {
  try {
    const queryParams = Object.fromEntries(ctx.request.url.searchParams.entries());
    const filtros = filtrosSchema.parse(queryParams);

    if (!filtros.nombre) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "El parámetro 'nombre' es requerido para la búsqueda.",
      };
      return;
    }

    const objProductos = new ProductosModel();
    const lista = await objProductos.ListarProductos();

    const productosFiltrados = filtrarProductos(lista, filtros);
    const resultado = paginarResultados(productosFiltrados, filtros.pagina || 1, filtros.limite || 50);
    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = resultado.productos.map(producto => ({
      ...producto,
      imagenUrl: producto.imagen_principal 
        ? objProductos.construirUrlImagen(producto.imagen_principal, baseUrl)
        : null
    }));

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: resultado.productos.length > 0 ? `${resultado.productos.length} productos encontrados con "${filtros.nombre}".` : `No se encontraron productos con "${filtros.nombre}".`,
      data: listaConImagenes,
      pagination: {
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas,
        hayMasPaginas: resultado.hayMasPaginas
      },
      termino_busqueda: filtros.nombre
    };
  } catch (error) {
    console.error("Error en buscarProductos:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const getProductoPorId = async (ctx: RouterContext<"/productos/:id">) => {
  try {
    const id_producto = Number(ctx.params.id);
    
    if (isNaN(id_producto) || id_producto <= 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "ID de producto invalido.",
      };
      return;
    }

    const objProductos = new ProductosModel();
    const producto = await objProductos.ObtenerProductoPorId(id_producto);

    if (!producto) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Producto no encontrado.",
      };
      return;
    }

    const baseUrl = getBaseUrl(ctx);
    const productoConImagen = {
      ...producto,
      imagenUrl: producto.imagen_principal 
        ? objProductos.construirUrlImagen(producto.imagen_principal, baseUrl)
        : null
    };

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Producto encontrado.",
      data: productoConImagen,
    };
  } catch (error) {
    console.error("Error en getProductoPorId:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const postProducto = async (ctx: Context) => {
  try {
    // Log del request completo antes de parsear
    const contentType = ctx.request.headers.get("content-type") || "";
    const contentLength = ctx.request.headers.get("content-length") || "unknown";
    console.log(`[ProductosController.postProducto] Request recibido:`, {
      method: ctx.request.method,
      contentType,
      contentLength,
      url: ctx.request.url.toString()
    });
    
    // Leer el body como texto primero para debugging y evitar problemas con JSON grandes
    let body: any;
    try {
      // Intentar leer como JSON directamente
      body = await ctx.request.body.json();
      console.log(`[ProductosController.postProducto] ✅ Body parseado como JSON exitosamente`);
    } catch (parseError) {
      console.error(`[ProductosController.postProducto] ❌ Error parseando JSON:`, parseError);
      // Si falla, intentar leer como texto y parsear manualmente
      try {
        const bodyText = await ctx.request.body.text();
        console.log(`[ProductosController.postProducto] Body como texto (primeros 500 chars):`, bodyText.substring(0, 500));
        body = JSON.parse(bodyText);
        console.log(`[ProductosController.postProducto] ✅ Body parseado manualmente exitosamente`);
      } catch (textError) {
        console.error(`[ProductosController.postProducto] ❌ Error parseando body como texto:`, textError);
        throw new Error("Error al parsear el body del request");
      }
    }
    
    // Log de todas las claves del body
    console.log(`[ProductosController.postProducto] Claves en body:`, Object.keys(body));
    
    // Verificar si el body está completo (no truncado)
    const bodyStr = JSON.stringify(body);
    const bodySize = bodyStr.length;
    const contentLengthNum = parseInt(contentLength) || 0;
    console.log(`[ProductosController.postProducto] Tamaño del body parseado: ${bodySize} chars, Content-Length header: ${contentLengthNum} bytes`);
    
    if (contentLengthNum > 0 && bodySize < contentLengthNum * 0.9) {
      console.warn(`[ProductosController.postProducto] ⚠️ ADVERTENCIA: El body parseado es significativamente más pequeño que Content-Length. Posible truncamiento.`);
    }
    
    // Extraer imagenData ANTES de validar con Zod
    const imagenDataRaw = body.imagenData;
    
    // Log para debugging
    console.log(`[ProductosController.postProducto] Body recibido:`, {
      nombre: body.nombre,
      precio: body.precio,
      stock: body.stock,
      tieneImagenData: 'imagenData' in body,
      imagenData: imagenDataRaw ? 
        (typeof imagenDataRaw === 'string' ? `${imagenDataRaw.substring(0, 100)}... (${imagenDataRaw.length} chars)` : `Tipo: ${typeof imagenDataRaw}`) 
        : 'null/undefined',
      tipoImagenData: typeof imagenDataRaw,
      valorImagenData: imagenDataRaw === null ? 'null' : imagenDataRaw === undefined ? 'undefined' : 'presente'
    });
    
    console.log(`[ProductosController.postProducto] Validando body completo con Zod (imagenData será ignorado por .strip())...`);
    
    // Validar el body completo - .strip() eliminará imagenData automáticamente
    let validated;
    try {
      validated = productosSchema.parse(body);
      console.log(`[ProductosController.postProducto] ✅ Validación exitosa.`);
    } catch (zodError) {
      console.error(`[ProductosController.postProducto] ❌ Error de validación Zod:`, zodError);
      if (zodError instanceof z.ZodError) {
        console.error(`[ProductosController.postProducto] Errores de Zod:`, JSON.stringify(zodError.errors, null, 2));
      }
      throw zodError;
    }
    
    // Validar y normalizar imagenData manualmente
    let imagenData: string | undefined = undefined;
    if (imagenDataRaw !== null && imagenDataRaw !== undefined) {
      if (typeof imagenDataRaw === 'string' && imagenDataRaw.trim().length > 0) {
        imagenData = imagenDataRaw;
        console.log(`[ProductosController.postProducto] ✅ imagenData validado: tipo=string, longitud=${imagenData.length}`);
        console.log(`[ProductosController.postProducto] Prefijo imagenData: ${imagenData.substring(0, 100)}`);
        console.log(`[ProductosController.postProducto] ¿Tiene prefijo data:image/? ${imagenData.startsWith('data:image/')}`);
      } else {
        console.log(`[ProductosController.postProducto] ⚠️ imagenData ignorado (tipo inválido o vacío):`, typeof imagenDataRaw);
        if (typeof imagenDataRaw !== 'string') {
          console.log(`[ProductosController.postProducto] Tipo recibido: ${typeof imagenDataRaw}, valor: ${JSON.stringify(imagenDataRaw).substring(0, 100)}`);
        }
      }
    } else {
      console.log(`[ProductosController.postProducto] ⚠️ No se recibió imagenData`);
      console.log(`[ProductosController.postProducto] Body completo (primeros 1000 chars):`, JSON.stringify(body).substring(0, 1000));
      console.log(`[ProductosController.postProducto] Tamaño del body:`, JSON.stringify(body).length, 'caracteres');
      console.log(`[ProductosController.postProducto] Todas las claves del body:`, Object.keys(body).join(', '));
    }
    
    // Verificar si imagenData está presente pero es una cadena vacía
    if (imagenDataRaw === '') {
      console.log(`[ProductosController.postProducto] ⚠️ imagenData es una cadena vacía`);
    }

    const { imagen_principal, ...productoData } = validated;

    const productoCompleto: ProductoData = {
      id_producto: 0,
      nombre: productoData.nombre,
      descripcion: productoData.descripcion,
      precio: productoData.precio,
      stock: productoData.stock,
      stock_minimo: productoData.stock_minimo || 5,
      id_usuario: productoData.id_usuario,
      id_categoria: productoData.id_categoria ?? undefined,
      id_ciudad_origen: productoData.id_ciudad_origen ?? undefined,
      unidad_medida: productoData.unidad_medida || 'kg',
      disponible: productoData.disponible !== false,
      imagen_principal: imagen_principal ?? undefined
    };

    const objProductos = new ProductosModel(productoCompleto);
    // Normalizar null a undefined para imagenData
    const imagenDataNormalizada = imagenData === null ? undefined : imagenData;
    
    // Log para debugging
    if (imagenDataNormalizada) {
      console.log(`[ProductosController] ✅ imagenData recibida: tipo=${typeof imagenDataNormalizada}, longitud=${imagenDataNormalizada.length}, prefijo=${imagenDataNormalizada.substring(0, 30)}...`);
    } else {
      console.log(`[ProductosController] ⚠️ No se recibió imagenData`);
    }
    
    // Si hay imagen_principal (URL), actualizarla después de crear el producto
    const result = await objProductos.AgregarProducto(imagenDataNormalizada);
    
    // Si se creó exitosamente y hay imagen_principal (URL), actualizarla
    if (result.success && result.producto && imagen_principal && !imagenDataNormalizada) {
      await conexion.execute(
        "UPDATE productos SET imagen_principal = ? WHERE id_producto = ?",
        [imagen_principal, result.producto.id_producto]
      );
      // Recargar el producto con la imagen actualizada
      const productoActualizado = await conexion.query(
        "SELECT * FROM productos WHERE id_producto = ?",
        [result.producto.id_producto]
      );
      if (productoActualizado.length > 0) {
        result.producto = productoActualizado[0] as ProductoData;
      }
    }

    if (result.success && result.producto) {
      const baseUrl = getBaseUrl(ctx);
      const productoConUrl: ProductoDataResponse = {
        ...result.producto,
        imagenUrl: result.producto.imagen_principal 
          ? objProductos.construirUrlImagen(result.producto.imagen_principal, baseUrl)
          : null
      };

      ctx.response.status = 200;
      ctx.response.body = {
        success: result.success,
        message: result.message,
        data: productoConUrl,
      };
    } else {
      ctx.response.status = result.success ? 200 : 404;
      ctx.response.body = {
        success: result.success,
        message: result.message,
        data: result.producto,
      };
    }
  } catch (error) {
    console.error("Error en postProducto:", error);
    
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      ctx.response.status = 400; // Bad Request para errores de validación
      ctx.response.body = {
        success: false,
        error: "VALIDATION_ERROR",
        message: "Datos inválidos.",
        errors: zodError.errors.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    } else {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Error interno del servidor al agregar el producto.",
      };
    }
  }
};

export const putProducto = async (ctx: RouterContext<"/productos/:id">) => {
  try {
    const id_producto = Number(ctx.params.id);
    
    if (isNaN(id_producto) || id_producto <= 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "ID de producto invalido.",
      };
      return;
    }

    const body = await ctx.request.body.json();
    
    // Extraer imagenData e imagenes_adicionales ANTES de validar con Zod (similar a postProducto)
    const imagenDataRaw = body.imagenData;
    const imagenesAdicionalesRaw = body.imagenes_adicionales;
    
    // Log para debugging
    console.log(`[ProductosController.putProducto] Body recibido:`, {
      id_producto,
      nombre: body.nombre,
      precio: body.precio,
      imagenData: imagenDataRaw ? 
        (typeof imagenDataRaw === 'string' ? `${imagenDataRaw.substring(0, 100)}... (${imagenDataRaw.length} chars)` : `Tipo: ${typeof imagenDataRaw}`) 
        : 'null/undefined',
      tipoImagenData: typeof imagenDataRaw,
      imagenesAdicionales: imagenesAdicionalesRaw ? 
        (Array.isArray(imagenesAdicionalesRaw) ? `Array con ${imagenesAdicionalesRaw.length} elementos` : `Tipo: ${typeof imagenesAdicionalesRaw}`)
        : 'null/undefined',
    });
    
    const bodyWithId = { ...body, id_producto };
    const validated = productosUpdateSchema.parse(bodyWithId);

    // Validar y normalizar imagenData manualmente
    let imagenData: string | undefined = undefined;
    if (imagenDataRaw !== null && imagenDataRaw !== undefined) {
      if (typeof imagenDataRaw === 'string' && imagenDataRaw.trim().length > 0) {
        imagenData = imagenDataRaw;
        console.log(`[ProductosController.putProducto] ✅ imagenData validado: tipo=string, longitud=${imagenData.length}`);
      } else {
        console.log(`[ProductosController.putProducto] ⚠️ imagenData ignorado (tipo inválido o vacío):`, typeof imagenDataRaw);
      }
    } else {
      console.log(`[ProductosController.putProducto] ⚠️ No se recibió imagenData`);
    }

    // Validar y normalizar imagenes_adicionales manualmente
    let imagenesAdicionales: string[] | undefined = undefined;
    if (imagenesAdicionalesRaw !== null && imagenesAdicionalesRaw !== undefined) {
      if (Array.isArray(imagenesAdicionalesRaw) && imagenesAdicionalesRaw.length > 0) {
        // Filtrar solo strings válidos
        imagenesAdicionales = imagenesAdicionalesRaw.filter((img: any) => 
          typeof img === 'string' && img.trim().length > 0
        );
        console.log(`[ProductosController.putProducto] ✅ imagenes_adicionales validado: ${imagenesAdicionales.length} imágenes`);
      } else {
        console.log(`[ProductosController.putProducto] ⚠️ imagenes_adicionales ignorado (no es array válido)`);
      }
    } else {
      console.log(`[ProductosController.putProducto] ⚠️ No se recibió imagenes_adicionales`);
    }

    const { ...productoData } = validated;

    const objProductosCheck = new ProductosModel();
    const productoExiste = await objProductosCheck.ObtenerProductoPorId(id_producto);
    
    if (!productoExiste) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Producto no encontrado.",
      };
      return;
    }

    const productoCompleto: ProductoData = {
      id_producto: productoData.id_producto,
      nombre: productoData.nombre,
      descripcion: productoData.descripcion,
      precio: productoData.precio,
      stock: productoData.stock,
      stock_minimo: productoData.stock_minimo || 5,
      id_usuario: productoData.id_usuario,
      id_categoria: productoData.id_categoria ?? undefined,
      id_ciudad_origen: productoData.id_ciudad_origen ?? undefined,
      unidad_medida: productoData.unidad_medida || 'kg',
      disponible: productoData.disponible !== false,
      imagen_principal: productoExiste.imagen_principal,
      imagenes_adicionales: productoExiste.imagenes_adicionales,
    };

    const objProductos = new ProductosModel(productoCompleto);
    // Normalizar null a undefined para imagenData
    const imagenDataNormalizada = imagenData === null ? undefined : imagenData;
    
    // Log para debugging
    if (imagenDataNormalizada) {
      console.log(`[ProductosController.putProducto] ✅ imagenData recibida: tipo=${typeof imagenDataNormalizada}, longitud=${imagenDataNormalizada.length}, prefijo=${imagenDataNormalizada.substring(0, 30)}...`);
    } else {
      console.log(`[ProductosController.putProducto] ⚠️ No se recibió imagenData`);
    }
    
    if (imagenesAdicionales) {
      console.log(`[ProductosController.putProducto] ✅ imagenes_adicionales recibidas: ${imagenesAdicionales.length} imágenes`);
    } else {
      console.log(`[ProductosController.putProducto] ⚠️ No se recibieron imagenes_adicionales`);
    }
    
    const result = await objProductos.EditarProducto(imagenDataNormalizada, imagenesAdicionales);

    ctx.response.status = result.success ? 200 : 404;
    ctx.response.body = {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error("Error en putProducto:", error);
    
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      ctx.response.status = 400; // Bad Request para errores de validación
      ctx.response.body = {
        success: false,
        error: "VALIDATION_ERROR",
        message: "Datos inválidos.",
        errors: zodError.errors.map((err: z.ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    } else {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Error interno del servidor al actualizar el producto.",
      };
    }
  }
};

export const deleteProducto = async (ctx: RouterContext<"/productos/:id">) => {
  try {
    const id_producto = Number(ctx.params.id);
    
    if (isNaN(id_producto) || id_producto <= 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "ID de producto invalido.",
      };
      return;
    }

    // Obtener información del producto antes de eliminarlo para borrar la imagen
    const { conexion } = await import("../Models/Conexion.ts");
    const producto = await conexion.query(
      "SELECT imagen_principal FROM productos WHERE id_producto = ?",
      [id_producto]
    );

    // Eliminar imagen si existe
    if (producto.length > 0 && producto[0].imagen_principal) {
      try {
        const { imageService } = await import("../Services/ImageService.ts");
        // Eliminar la imagen individual
        await imageService.deleteImage(producto[0].imagen_principal);
        // También intentar eliminar la carpeta del producto si existe
        await imageService.deleteFolder(`productos/${id_producto}`);
      } catch (imageError) {
        console.error("Error eliminando imagen del producto:", imageError);
        // Continuar con la eliminación del producto aunque falle la eliminación de la imagen
      }
    }

    const objProductos = new ProductosModel();
    const result = await objProductos.EliminarProducto(id_producto);

    ctx.response.status = result.success ? 200 : 404;
    ctx.response.body = {
      success: result.success,
      message: result.message,
    };
  } catch (error) {
    console.error("Error en deleteProducto:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

// 📌 Nuevas funciones para funcionalidades mejoradas

export const getProductosConInfo = async (ctx: Context) => {
  try {
    const queryParams = Object.fromEntries(ctx.request.url.searchParams.entries());
    const filtros = filtrosSchema.parse(queryParams);

    const objProductos = new ProductosModel();
    const lista = await objProductos.ListarProductosConInfo();

    // Aplicar filtros básicos
    let productosFiltrados: ProductoData[] = [...(lista as unknown as ProductoData[])];

    if (filtros.nombre) {
      productosFiltrados = productosFiltrados.filter((producto: ProductoData) => 
        producto.nombre.toLowerCase().includes(filtros.nombre!.toLowerCase())
      );
    }

    if (filtros.precio_min !== undefined) {
      productosFiltrados = productosFiltrados.filter((producto: ProductoData) => 
        producto.precio >= filtros.precio_min!
      );
    }

    if (filtros.precio_max !== undefined) {
      productosFiltrados = productosFiltrados.filter((producto: ProductoData) => 
        producto.precio <= filtros.precio_max!
      );
    }

    if (filtros.stock_min !== undefined) {
      productosFiltrados = productosFiltrados.filter((producto: ProductoData) => 
        producto.stock >= filtros.stock_min!
      );
    }

    const resultado = paginarResultados(productosFiltrados, filtros.pagina || 1, filtros.limite || 50);
    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = resultado.productos.map(producto => ({
      ...producto,
      imagenUrl: producto.imagen_principal 
        ? objProductos.construirUrlImagen(producto.imagen_principal, baseUrl)
        : null
    }));

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: resultado.productos.length > 0 ? `${resultado.productos.length} productos encontrados.` : "No se encontraron productos.",
      data: listaConImagenes,
      pagination: {
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas,
        hayMasPaginas: resultado.hayMasPaginas
      }
    };
  } catch (error) {
    console.error("Error en getProductosConInfo:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const buscarProductosAvanzado = async (ctx: Context) => {
  try {
    const queryParams = Object.fromEntries(ctx.request.url.searchParams.entries());
    
    const criterios = {
      nombre: queryParams.nombre,
      categoria: queryParams.categoria ? parseInt(queryParams.categoria) : undefined,
      ciudad: queryParams.ciudad ? parseInt(queryParams.ciudad) : undefined,
      departamento: queryParams.departamento ? parseInt(queryParams.departamento) : undefined,
      region: queryParams.region ? parseInt(queryParams.region) : undefined,
      precio_min: queryParams.precio_min ? parseFloat(queryParams.precio_min) : undefined,
      precio_max: queryParams.precio_max ? parseFloat(queryParams.precio_max) : undefined,
      stock_min: queryParams.stock_min ? parseInt(queryParams.stock_min) : undefined,
    };

    const objProductos = new ProductosModel();
    const productos = await objProductos.BuscarProductos(criterios);

    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = productos.map((producto: any) => {
      const imagenPrincipal = typeof producto.imagen_principal === 'string' ? producto.imagen_principal : null;
      return {
        ...producto,
        imagenUrl: imagenPrincipal 
          ? objProductos.construirUrlImagen(imagenPrincipal, baseUrl)
          : null
      };
    });

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: productos.length > 0 ? `${productos.length} productos encontrados.` : "No se encontraron productos con los criterios especificados.",
      data: listaConImagenes,
      total: productos.length,
      criterios_aplicados: criterios
    };
  } catch (error) {
    console.error("Error en buscarProductosAvanzado:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const getProductosPorProductor = async (ctx: RouterContext<"/productos/productor/:id">) => {
  try {
    const id_usuario = Number(ctx.params.id);
    
    if (isNaN(id_usuario) || id_usuario <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de usuario inválido.",
      };
      return;
    }

    const objProductos = new ProductosModel();
    const productos = await objProductos.ObtenerProductosPorProductor(id_usuario);

    const baseUrl = getBaseUrl(ctx);
    const listaConImagenes = productos.map((producto: any) => {
      const imagenPrincipal = typeof producto.imagen_principal === 'string' ? producto.imagen_principal : null;
      return {
        ...producto,
        imagenUrl: imagenPrincipal 
          ? objProductos.construirUrlImagen(imagenPrincipal, baseUrl)
          : null
      };
    });

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: productos.length > 0 ? `${productos.length} productos encontrados para el productor.` : "No se encontraron productos para este productor.",
      data: listaConImagenes,
      total: productos.length
    };
  } catch (error) {
    console.error("Error en getProductosPorProductor:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};

export const getProductoDetallado = async (ctx: RouterContext<"/productos/:id/detalle">) => {
  try {
    console.log(`[ProductosController.getProductoDetallado] ✅ FUNCIÓN EJECUTÁNDOSE - Versión sin productos_categorias`);
    
    const id_producto = Number(ctx.params.id);
    
    if (isNaN(id_producto) || id_producto <= 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "ID de producto inválido.",
      };
      return;
    }

    console.log(`[ProductosController.getProductoDetallado] Obteniendo producto ${id_producto}`);
    
    // Consulta simplificada - primero obtener el producto básico
    let producto: any[];
    try {
      producto = await conexion.query(`
        SELECT * FROM productos WHERE id_producto = ?
      `, [id_producto]);
    } catch (error) {
      console.error(`[ProductosController.getProductoDetallado] Error en consulta básica:`, error);
      throw error;
    }
    
    if (producto.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Producto no encontrado.",
      };
      return;
    }
    
    const productoData = producto[0] as any;
    
    // Obtener información adicional de forma segura (con try-catch para cada JOIN)
    let nombre_productor = null;
    let email_productor = null;
    let telefono_productor = null;
    let direccion_productor = null;
    
    if (productoData.id_usuario) {
      try {
        const usuarioData = await conexion.query(`
          SELECT nombre, email, telefono, direccion FROM usuarios WHERE id_usuario = ?
        `, [productoData.id_usuario]);
        if (usuarioData.length > 0) {
          nombre_productor = usuarioData[0].nombre;
          email_productor = usuarioData[0].email;
          telefono_productor = usuarioData[0].telefono;
          direccion_productor = usuarioData[0].direccion;
        }
      } catch (error) {
        console.log(`[ProductosController.getProductoDetallado] Error obteniendo datos de usuario:`, error);
      }
    }
    
    let ciudad_origen = null;
    let departamento_origen = null;
    
    if (productoData.id_ciudad_origen) {
      try {
        const ciudadData = await conexion.query(`
          SELECT c.nombre as ciudad, d.nombre as departamento
          FROM ciudades c
          LEFT JOIN departamentos d ON c.id_departamento = d.id_departamento
          WHERE c.id_ciudad = ?
        `, [productoData.id_ciudad_origen]);
        if (ciudadData.length > 0) {
          ciudad_origen = ciudadData[0].ciudad;
          departamento_origen = ciudadData[0].departamento;
        }
      } catch (error) {
        console.log(`[ProductosController.getProductoDetallado] Error obteniendo datos de ubicación:`, error);
      }
    }
    
    let categoria_nombre = null;
    
    if (productoData.id_categoria) {
      try {
        const categoriaData = await conexion.query(`
          SELECT nombre FROM categorias WHERE id_categoria = ? AND (activa = 1 OR activa IS NULL)
        `, [productoData.id_categoria]);
        if (categoriaData.length > 0) {
          categoria_nombre = categoriaData[0].nombre;
        }
      } catch (error) {
        console.log(`[ProductosController.getProductoDetallado] Error obteniendo datos de categoría:`, error);
      }
    }
    
    // Obtener estadísticas de reseñas por separado (si la tabla existe)
    let calificacion_promedio = null;
    let total_resenas = 0;
    try {
      const resenasData = await conexion.query(`
        SELECT 
          AVG(calificacion) as promedio,
          COUNT(*) as total
        FROM resenas
        WHERE id_producto = ?
      `, [id_producto]);
      
      if (resenasData.length > 0 && resenasData[0].promedio) {
        calificacion_promedio = parseFloat(resenasData[0].promedio).toFixed(1);
        total_resenas = parseInt(resenasData[0].total) || 0;
      }
    } catch (resenasError) {
      // Si la tabla resenas no existe, simplemente ignorar el error
      console.log(`[ProductosController.getProductoDetallado] Tabla resenas no disponible, continuando sin estadísticas de reseñas`);
    }

    const objProductos = new ProductosModel();
    const baseUrl = getBaseUrl(ctx);
    
    // Corregir el nombre del campo de imagen
    const imagenPrincipal = productoData.imagen_principal || null;
    
    const productoDetallado = {
      ...productoData,
      nombre_productor,
      email_productor,
      telefono_productor,
      direccion_productor,
      ciudad_origen,
      departamento_origen,
      categoria_nombre,
      imagenUrl: imagenPrincipal 
        ? objProductos.construirUrlImagen(imagenPrincipal, baseUrl)
        : null,
      calificacion_promedio: calificacion_promedio,
      total_resenas: total_resenas,
      categorias: categoria_nombre ? [categoria_nombre] : []
    };

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Producto encontrado.",
      data: productoDetallado,
    };
  } catch (error: any) {
    console.error("❌ ERROR en getProductoDetallado:", error);
    console.error("❌ Error details:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("❌ Error stack:", error.stack);
    }
    
    // Verificar si el error menciona productos_categorias
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('productos_categorias')) {
      console.error("❌❌❌ ERROR CRÍTICO: Se está intentando usar la tabla productos_categorias!");
      console.error("❌ Esto NO debería pasar. El código actual NO usa esa tabla.");
      console.error("❌ VERIFICA QUE EL SERVIDOR SE HAYA REINICIADO COMPLETAMENTE.");
    }
    
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
      error: errorMessage
    };
  }
};