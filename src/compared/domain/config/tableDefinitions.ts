export type UpdateStrategy = 'SIMPLE' | 'COMPOSITE_KEY';
export type SelectorType = 'PRODUCT' | 'CUSTOMER' | 'MANUAL';
export type TargetInstance = 'PROJECT5X' | 'CADCORE' | 'BOTH';

export interface TableDefinition {
  tableName: string;
  displayName: string;
  keyColumn: string;
  valueColumns: string[];
  filterColumn: string;
  updateStrategy: UpdateStrategy;
  compositeKeys?: string[];
  selectorType: SelectorType;
  manualPlaceholder?: string;
  hasIdentity?: boolean;
  identityColumn?: string;
  targetInstance?: TargetInstance;
  insertColumns?: string[];
}

export const TABLE_DEFINITIONS: Record<string, TableDefinition> = {
  // =============== Dependen de Product ===============
  SettingsByProduct: {
    tableName: 'SettingsByProduct',
    displayName: 'Configuraciones por Producto',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'PRODUCT',
    hasIdentity: false,          // SettingsByProductId es identity, pero NO se preserva
    targetInstance: 'PROJECT5X',
    insertColumns: ['ProductId', 'SettingId', 'Value'],
  },
  SettingsBySubProduct: {
    tableName: 'SettingsBySubProduct',
    displayName: 'Configuraciones por SubProducto',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'SubProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'PRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },
  FilesByProduct: {
    tableName: 'FilesByProduct',
    displayName: 'Archivos por Producto',
    keyColumn: 'ProductId',
    valueColumns: ['Patron', 'Extension'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'PRODUCT',
    hasIdentity: true,
    identityColumn: 'FilesByProductId',
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'FilesByProductId', 'ProductId', 'Patron', 'Extension', 'TypesOfMappingId',
      'Required', 'DLL', 'ClaseEntityC#', 'ClaseReglasC#', 'Separador', 'Header',
      'CommitType', 'PosicionType', 'GeneralInfo', 'FinalType', 'TextEncoding',
      'TextQualifier', 'LineSeparator', 'LengthPosicionType', 'GroupBy',
    ],
  },
  SubProduct: {
    tableName: 'SubProduct',
    displayName: 'SubProductos',
    keyColumn: 'SubProductId',
    valueColumns: ['Name', 'Description'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'PRODUCT',
    hasIdentity: true,
    identityColumn: 'SubProductId',
    targetInstance: 'PROJECT5X',
    insertColumns: ['SubProductId', 'ProductId', 'Name', 'Description'],
  },

  // =============== Dependen de Customer ===============
  Customers: {
    tableName: 'Customers',
    displayName: 'Clientes',
    keyColumn: 'Nit',
    valueColumns: ['Name', 'Description'],
    filterColumn: 'Nit',
    updateStrategy: 'SIMPLE',
    selectorType: 'CUSTOMER',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: ['Nit', 'Name', 'Description'],
  },

  // =============== Manuales ===============
  Product: {
    tableName: 'Product',
    displayName: 'Productos',
    keyColumn: 'ProductId',
    valueColumns: ['Name', 'Description', 'Type'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: true,
    identityColumn: 'ProductId',
    targetInstance: 'PROJECT5X',
    insertColumns: ['ProductId', 'CustomerNit', 'Name', 'Description', 'Type'],
  },
  SettingsByEN: {
    tableName: 'SettingsByEN',
    displayName: 'Configuraciones por EN',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'ENId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },
  JsonDianEquivalences: {
    tableName: 'JsonDianEquivalences',
    displayName: 'Equivalencias Json DIAN',
    keyColumn: 'EquivalenceId',
    valueColumns: ['ClientFieldName', 'ClientFieldPath', 'TemplateFieldName', 'TemplatePath'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ProductId', 'ClientFieldName', 'ClientFieldPath', 'TemplateFieldName',
      'TemplatePath', 'IsMandatory', 'Status', 'GroupBy', 'OrderBy',
      'ApplyWhenExist', 'UniqueId',
    ],
  },
  JsonDianTemplates: {
    tableName: 'JsonDianTemplates',
    displayName: 'Templates JSON DIAN',
    keyColumn: 'ProductId',
    valueColumns: ['Jsontemplate', 'Status'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: ['ProductId', 'Jsontemplate', 'Status'],
  },
  RulesByProduct: {
    tableName: 'RulesByProduct',
    displayName: 'Reglas por Producto',
    keyColumn: 'RulesByProductId',
    valueColumns: ['Data', 'DefaultValue', 'EquivalentValue'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ProductId', 'Data', 'DefaultValue', 'EquivalentValue', 'Criterion',
      'RuleId', 'Priority', 'Connector', 'Step', 'Detail',
    ],
  },
  Resources: {
    tableName: 'Resources',
    displayName: 'Recursos',
    keyColumn: 'ResourcesId',
    valueColumns: ['Space', 'Properties'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: true,
    identityColumn: 'ResourcesId',
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ResourcesId', 'ProductId', 'Space', 'TypeResource', 'Properties',
      'Transformation', 'OutputFormat', 'Version', 'Date',
    ],
  },
  ResourceConfiguration: {
    tableName: 'ResourceConfiguration',
    displayName: 'Configuración de Recursos',
    keyColumn: 'ResourcesId',
    valueColumns: ['ResourceContent', 'Data'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ResourcesId', 'ProductId', 'RuleId', 'Priority', 'ResourceContent',
      'Data', 'Criterion', 'Value', 'Connector', 'Date',
    ],
  },
  FileSchemas: {
    tableName: 'FileSchemas',
    displayName: 'Esquemas de Archivos',
    keyColumn: 'FileName',
    valueColumns: ['FileSchema', 'FileVersion'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1965',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ProductId', 'FileName', 'FileSchema', 'FileVersion', 'State',
      'FilesByProductId', 'DatabaseSchema',
    ],
  },
  Template: {
    tableName: 'Template',
    displayName: 'Plantillas',
    keyColumn: 'TemplateId',
    valueColumns: ['Config'],
    filterColumn: 'TemplateId',
    updateStrategy: 'COMPOSITE_KEY',
    compositeKeys: ['TemplateId', 'Name'],
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 10900',
    hasIdentity: true,
    identityColumn: 'TemplateId',
    targetInstance: 'BOTH', 
    insertColumns: [
      'TemplateId', 'Name', 'Description', 'Config', 'Visibility', 'Type',
      'CreateAt', 'UpdateAt', 'Format', 'Mjml', 'Thumbnail', 'FileSchema',
      'TemplateStatus', 'SupplierCode',
    ],
  },
};