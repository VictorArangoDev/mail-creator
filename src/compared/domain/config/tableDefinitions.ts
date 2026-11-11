export type UpdateStrategy = 'SIMPLE' | 'COMPOSITE_KEY';
export type SelectorType = 'CONTEXT' | 'MANUAL';
export type ContextLevel = 'CUSTOMER' | 'PRODUCT' | 'SUBPRODUCT' | 'RESOURCE';  // ← agregado RESOURCE
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
  contextLevel?: ContextLevel;
  manualPlaceholder?: string;   
  hasIdentity?: boolean;
  identityColumn?: string;
  targetInstance?: TargetInstance;
  insertColumns?: string[];
}

export const TABLE_DEFINITIONS: Record<string, TableDefinition> = {

  // ========== CUSTOMER ==========
  Customers: {
    tableName: 'Customers',
    displayName: 'Customers',
    keyColumn: 'Nit',
    valueColumns: ['Name', 'Description'],   
    filterColumn: 'Nit',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'CUSTOMER',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: ['Nit', 'Name', 'Description'],
  },

  // ========== PRODUCT (y sus hijos directos) ==========
  Product: {
    tableName: 'Product',
    displayName: 'Product',
    keyColumn: 'ProductId',
    valueColumns: ['CustomerNit', 'Name', 'Description'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: true,
    identityColumn: 'ProductId',
    targetInstance: 'PROJECT5X',
    insertColumns: ['ProductId', 'CustomerNit', 'Name', 'Description', 'Type'],
  },

  SubProduct: {
    tableName: 'SubProduct',
    displayName: 'SubProduct',
    keyColumn: 'SubProductId',
    valueColumns: ['Name', 'Description'],   
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: true,
    identityColumn: 'SubProductId',
    targetInstance: 'PROJECT5X',
    insertColumns: ['SubProductId', 'ProductId', 'Name', 'Description'],
  },

  SettingsByProduct: {
    tableName: 'SettingsByProduct',
    displayName: 'SettingsByProduct',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: false,                      
    targetInstance: 'PROJECT5X',
    insertColumns: ['ProductId', 'SettingId', 'Value'],
  },

  Resources: {
    tableName: 'Resources',
    displayName: 'Resources',
    keyColumn: 'Space',                      
    valueColumns: ['TypeResource', 'Properties', 'Transformation', 'OutputFormat', 'Version'],
    filterColumn: 'ProductId',
    updateStrategy: 'COMPOSITE_KEY',         
    compositeKeys: ['ProductId', 'Space'],   
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: true,
    identityColumn: 'ResourcesId',
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ResourcesId', 'ProductId', 'Space', 'TypeResource', 'Properties',
      'Transformation', 'OutputFormat', 'Version', 'Date',
    ],
  },

  RulesByProduct: {
    tableName: 'RulesByProduct',
    displayName: 'RulesByProduct',
    keyColumn: 'RulesByProductId',
    valueColumns: ['Data', 'DefaultValue', 'EquivalentValue'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  FileSchemas: {
    tableName: 'FileSchemas',
    displayName: 'FileSchemas',
    keyColumn: 'FileName',
    valueColumns: ['FileSchema', 'DatabaseSchema'],
    filterColumn: 'ProductId',
    updateStrategy: 'COMPOSITE_KEY',
    compositeKeys: ['ProductId', 'FileName'],
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
    insertColumns: [
      'ProductId', 'FileName', 'FileSchema', 'FileVersion', 'State',
      'FilesByProductId', 'DatabaseSchema',
    ],
  },

  FilesByProduct: {
    tableName: 'FilesByProduct',
    displayName: 'Archivos por Producto',
    keyColumn: 'Patron',
    valueColumns: ['Extension'],
    filterColumn: 'ProductId',
    updateStrategy: 'COMPOSITE_KEY',
    compositeKeys: ['ProductId', 'Patron'],
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
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

  JsonDianEquivalences: {
    tableName: 'JsonDianEquivalences',
    displayName: 'JsonDianEquivalences',
    keyColumn: 'EquivalenceId',
    valueColumns: ['ClientFieldName', 'ClientFieldPath'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  JsonDianTemplates: {
    tableName: 'JsonDianTemplates',
    displayName: 'TJsonDianTemplates',
    keyColumn: 'ProductId',
    valueColumns: ['Jsontemplate', 'Status'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  FieldByProduct: {
    tableName: 'FieldByProduct',
    displayName: 'FieldByProduct',
    keyColumn: 'FieldId',
    valueColumns: ['FieldName', 'FieldPath'],
    filterColumn: 'ProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'PRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  SettingsByEN: {
    tableName: 'SettingsByEN',
    displayName: 'SettingsByEN',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'ENId',
    updateStrategy: 'SIMPLE',
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 1',              
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  // ========== SUBPRODUCT ==========
  SettingsBySubProduct: {
    tableName: 'SettingsBySubProduct',
    displayName: 'SettingsBySubProduct',
    keyColumn: 'SettingId',
    valueColumns: ['Value'],
    filterColumn: 'SubProductId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'SUBPRODUCT',
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  // ========== RESOURCE ==========
  ResourceConfiguration: {
    tableName: 'ResourceConfiguration',
    displayName: 'ResourceConfiguration',
    keyColumn: 'ResourcesId',
    valueColumns: ['ResourceContent', 'Data'],
    filterColumn: 'ResourcesId',
    updateStrategy: 'SIMPLE',
    selectorType: 'CONTEXT',
    contextLevel: 'RESOURCE',               
    hasIdentity: false,
    targetInstance: 'PROJECT5X',
  },

  // ========== MANUAL ==========
  Template: {
    tableName: 'Template',
    displayName: 'Template',
    keyColumn: 'Name',
    valueColumns: ['Config'],
    filterColumn: 'TemplateId',
    updateStrategy: 'COMPOSITE_KEY',
    compositeKeys: ['TemplateId', 'Name'],
    selectorType: 'MANUAL',
    manualPlaceholder: 'Ej: 10900',          
    hasIdentity: true,
    identityColumn: 'TemplateId',
    targetInstance: 'PROJECT5X',             
    insertColumns: [
      'TemplateId', 'Name', 'Description', 'Config', 'Visibility', 'Type',
      'CreateAt', 'UpdateAt', 'Format', 'Mjml', 'Thumbnail', 'FileSchema',
      'TemplateStatus', 'SupplierCode',
    ],
  },
};