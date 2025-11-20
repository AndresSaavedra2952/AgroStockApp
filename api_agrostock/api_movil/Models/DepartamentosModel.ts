import { obtenerConexion } from "./Conexion.ts";

interface DepartamentoData {
  id_departamento: number | null;
  nombre: string;
  id_region: number;
}

export class DepartamentosModel {
  public _objDepartamento: DepartamentoData | null;

  constructor(objDepartamento: DepartamentoData | null = null) {
    this._objDepartamento = objDepartamento;
  }

  public async ListarDepartamentos(): Promise<DepartamentoData[]> {
    try {
      const conexion = await obtenerConexion();
      console.log("[DepartamentosModel] Ejecutando consulta: SELECT * FROM departamentos ORDER BY nombre ASC");
      
      const result = await conexion.query("SELECT * FROM departamentos ORDER BY nombre ASC");
      
      console.log(`[DepartamentosModel] Consulta exitosa, ${Array.isArray(result) ? result.length : 0} departamentos encontrados`);
      
      if (!Array.isArray(result)) {
        console.warn("[DepartamentosModel] ⚠️ El resultado no es un array:", typeof result);
        return [];
      }
      
      return result as DepartamentoData[];
    } catch (error) {
      console.error("[DepartamentosModel] ❌ Error al listar departamentos:", error);
      console.error("[DepartamentosModel] Error details:", error instanceof Error ? error.message : String(error));
      console.error("[DepartamentosModel] Error stack:", error instanceof Error ? error.stack : 'No stack available');
      
      // Verificar si es un error de tabla no encontrada
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("doesn't exist") || errorMessage.includes("Table") || errorMessage.includes("Unknown table")) {
        throw new Error("La tabla 'departamentos' no existe en la base de datos. Verifica que la base de datos esté correctamente configurada.");
      }
      
      throw error;
    }
  }
}
