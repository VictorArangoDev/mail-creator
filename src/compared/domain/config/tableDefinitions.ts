export type UpdateStrategy = "SIMPLE"  | "COMPOSITE_KEY";
export type SelectorType = 'PRODUCT' | "CUSTOMER"  | "MANUAL";


export interface TableDefinitions { 
    tableName: string;
    displayName: string;
    keyColumn: string;
    valueColumns: string[];
    filterColumn:string;
    updateStrategy: UpdateStrategy;
    compositeKeys?: string[];
    selectorType: SelectorType;
    manualPlaceHolder?:string;
}


export const TABLE_DEFINITIONS : Record<string, TableDefinitions> = {

    //Customers
    Customers:{
        tableName: 'Customers',
        displayName: 'Customers - Clientes',
        keyColumn: 'Nit',
        valueColumns: ['Nit','Name','Descripcion'],
        filterColumn: 'Nit',
        updateStrategy:'SIMPLE',
        selectorType: 'CUSTOMER'
    },

    //settingsByProduct
    SettingsByProduct: {
    tableName: 'SettingsByProduct',
    displayName: 'SettingByProduct - Configuraciones por Producto',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'PRODUCT',
  },

  //Templates Email
  Template: {
    tableName: 'Template',
    displayName: 'Template - Template HTML',
    keyColumn: 'TemplateId',
    valueColumns: ['TemplateId','Name','Description','Config','Visibility','Type','CreateAt','UpdateAt','Format','Mjml','Thumbnail','FileSchema','TemplateStatus','SupplierCode',],
    filterColumn: 'TemplateId',
    compositeKeys: ['TemplateId', "Name"],
    updateStrategy: "COMPOSITE_KEY",
    selectorType:"MANUAL"
  }
  






}