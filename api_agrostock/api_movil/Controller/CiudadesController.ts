import { Context } from "../Dependencies/dependencias.ts";
import { CiudadesModel } from "../Models/CiudadesModel.ts";

export const getCiudades = async (ctx: Context) => {
  try {
    // Obtener parámetro id_departamento de la query string
    const url = new URL(ctx.request.url);
    const idDepartamento = url.searchParams.get("id_departamento");
    
    const model = new CiudadesModel();
    let lista;
    
    // Si se proporciona id_departamento, filtrar ciudades por departamento
    if (idDepartamento) {
      const idDep = parseInt(idDepartamento);
      if (isNaN(idDep)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "El id_departamento debe ser un número válido.",
        };
        return;
      }
      lista = await model.ListarCiudadesPorDepartamento(idDep);
    } else {
      lista = await model.ListarCiudades();
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
      message: "Error interno del servidor.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
};