import { Context } from "../Dependencies/dependencias.ts";
import { DepartamentosModel } from "../Models/DepartamentosModel.ts";


export const getDepartamentos = async (ctx: Context) => {
  try {
    console.log("[getDepartamentos] Iniciando carga de departamentos...");
    const model = new DepartamentosModel();
    const lista = await model.ListarDepartamentos();
    console.log(`[getDepartamentos] Se encontraron ${lista.length} departamentos`);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: lista.length > 0 ? "Departamentos encontrados." : "No se encontraron departamentos.",
      data: lista,
    };
  } catch (error) {
    console.error("Error en getDepartamentos:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      message: error instanceof Error ? error.message : "Error interno del servidor.",
      error: "INTERNAL_ERROR"
    };
  }
};