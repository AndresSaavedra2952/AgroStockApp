import { obtenerConexion } from "./Conexion.ts";

interface CiudadData {
  id_ciudad: number | null;
  nombre: string;
  id_departamento: number;
}

export class CiudadesModel {
  public _objCiudad: CiudadData | null;

  constructor(objCiudad: CiudadData | null = null) {
    this._objCiudad = objCiudad;
  }

  public async ListarCiudades(): Promise<CiudadData[]> {
    try {
      const conexion = await obtenerConexion();
      const result = await conexion.query("SELECT * FROM ciudades ORDER BY nombre ASC");
      return result as CiudadData[];
    } catch (error) {
      console.error("Error al listar ciudades:", error);
      throw new Error("Error al listar ciudades.");
    }
  }

  public async ListarCiudadesPorDepartamento(idDepartamento: number): Promise<CiudadData[]> {
    try {
      const conexion = await obtenerConexion();
      const result = await conexion.query(
        "SELECT * FROM ciudades WHERE id_departamento = ? ORDER BY nombre ASC",
        [idDepartamento]
      );
      return result as CiudadData[];
    } catch (error) {
      console.error("Error al listar ciudades por departamento:", error);
      throw new Error("Error al listar ciudades por departamento.");
    }
  }
}
