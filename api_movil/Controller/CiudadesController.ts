import { Context, RouterContext } from "../Dependencies/dependencias.ts";
import { CiudadesModel } from "../Models/CiudadesModel.ts";

export const getCiudades = async (ctx: Context) => {
  try {
    const url = new URL(ctx.request.url);
    const idDepartamento = url.searchParams.get("id_departamento");
    console.log(`[getCiudades] Solicitud recibida - id_departamento: ${idDepartamento}`);
    
    const model = new CiudadesModel();
    let lista;
    
    if (idDepartamento) {
      const idDepartamentoNum = parseInt(idDepartamento);
      if (isNaN(idDepartamentoNum) || idDepartamentoNum <= 0) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "ID de departamento inválido.",
        };
        return;
      }
      
      // Filtrar ciudades por departamento
      const { conexion } = await import("../Models/Conexion.ts");
      lista = await conexion.query(
        "SELECT * FROM ciudades WHERE id_departamento = ? ORDER BY nombre",
        [idDepartamentoNum]
      );
      console.log(`[getCiudades] Se encontraron ${lista.length} ciudades para el departamento ${idDepartamentoNum}`);
    } else {
      lista = await model.ListarCiudades();
      console.log(`[getCiudades] Se encontraron ${lista.length} ciudades (todas)`);
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: lista.length > 0 ? "Ciudades encontradas." : "No se encontraron ciudades.",
      data: lista,
    };
  } catch (error) {
    console.error("Error en getCiudades:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error interno del servidor.",
      error: "INTERNAL_ERROR"
    };
  }
};

export const getCiudadPorId = async (ctx: RouterContext<"/ciudades/:id">) => {
  try {
    const id_ciudad = Number(ctx.params.id);
    
    if (isNaN(id_ciudad) || id_ciudad <= 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        message: "ID de ciudad inválido.",
      };
      return;
    }

    const { conexion } = await import("../Models/Conexion.ts");
    const result = await conexion.query(
      "SELECT * FROM ciudades WHERE id_ciudad = ?",
      [id_ciudad]
    );

    if (result.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        message: "Ciudad no encontrada.",
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: "Ciudad encontrada.",
      data: result[0],
    };
  } catch (error) {
    console.error("Error en getCiudadPorId:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: "Error interno del servidor.",
    };
  }
};