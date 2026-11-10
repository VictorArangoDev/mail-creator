import type { ICatalogRepository, CustomerOption, ProductOption } from "../../domain/ports/ICatalogRepository";
import type { Enviroment } from "../../domain/entities/TableConfig";
import { getConnectionPool } from "../database/sqlServerConnection";



export class sqlServerCatalogoRepository implements ICatalogRepository {

    async searchCustomer(query: string, env: Enviroment): Promise<CustomerOption[]> {
        const pool = await getConnectionPool(env);
        const request = pool.request();

        const trimmed = (query ?? '').trim();
        let whereClause = '';

        if (trimmed !== '') {
            //Busqueda por Nit si son numeros
            //Si contiene letras se hace la busqueda por el name
            if (/^\d+$/.test(trimmed)) {
                request.input('nit', trimmed);
                whereClause = 'WHERE Nit = @nit';
            } else {
                request.input('q', `%${trimmed}%`);
                whereClause = 'WHERE Name LIKE @q';
            }
        }

        const result = await request.query(` SELECT TOP 100 Nit, Name, Description FROM Customers ${whereClause} ORDER BY Name`);

        return result.recordset.map(r =>({
            nit: String(r.Nit),
            name: r.Name ?? '',
            description: r.Description ?? null,
            label: `${r.Nit} - ${r.Name ?? 'sin Nombre'}`,
        }));
    }

    async getProductsByNit(nit: string, env: Enviroment): Promise<ProductOption[]> {
        const pool = await getConnectionPool(env);

        const result = pool.request().input('nit', nit).query(
            `SELECT ProductId, CustomerNit, Name, Description, Type 
             FROM Product
             WHERE CustomerNit = @nit
             ORDER BY Name
             `);

             return (await result).recordset.map(r => ({
                productId: Number(r.ProductId),
                customerNit:String(r.CustomerNit),
                name:r.Name ?? '',
                description: r.Description ?? null,
                type: r.type ?? null,
                label: `${r.Name ?? '(Sin Nombre)'} (ID: ${r.ProductId})`,
             }));


    }
}