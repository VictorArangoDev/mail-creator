import type { ICatalogRepository, CustomerOption, ProductOption } from '../../domain/ports/ICatalogRepository';
import { getConnectionPool, type ConnectionEnv } from '../database/sqlServerConnection';

export class SqlServerCatalogoRepository implements ICatalogRepository {

  async searchCustomer(query: string, connectionEnv: ConnectionEnv): Promise<CustomerOption[]> {
    const pool = await getConnectionPool(connectionEnv);
    const request = pool.request();

    const trimmed = (query ?? '').trim();
    let whereClause = '';

    if (trimmed !== '') {
      if (/^\d+$/.test(trimmed)) {
        request.input('nit', trimmed);
        whereClause = 'WHERE Nit = @nit';
      } else {
        request.input('q', `%${trimmed}%`);
        whereClause = 'WHERE Name LIKE @q';
      }
    }

    const result = await request.query(`
      SELECT TOP 100 Nit, Name, Description
      FROM Customers
      ${whereClause}
      ORDER BY Name
    `);

    return result.recordset.map((r: any) => ({
      nit: String(r.Nit),
      name: r.Name ?? '',
      description: r.Description ?? null,
      label: `${r.Nit} - ${r.Name ?? 'sin Nombre'}`,
    }));
  }

  async getProductsByNit(nit: string, connectionEnv: ConnectionEnv): Promise<ProductOption[]> {
    const pool = await getConnectionPool(connectionEnv);

    const result = await pool.request()
      .input('nit', nit)
      .query(`
        SELECT ProductId, CustomerNit, Name, Description, Type
        FROM Product
        WHERE CustomerNit = @nit
        ORDER BY Name
      `);

    return result.recordset.map((r: any) => ({
      productId: Number(r.ProductId),
      customerNit: String(r.CustomerNit),
      name: r.Name ?? '',
      description: r.Description ?? null,
      type: r.Type ?? null,
      label: `${r.Name ?? '(Sin Nombre)'} (ID: ${r.ProductId})`,
    }));
  }
}