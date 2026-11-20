export type Enviroment = "TEST" | "PROD";


export interface TableSettingByProduct {
    SettingsByProductId: number;
    ProdcutId: number;
    SettingId:number;
    Value:string
    
}

export interface TableComparison { 
    id: number;
    testData:TableSettingByProduct | null;
    prodData:TableSettingByProduct | null;
    status: "IGUAL" | "DIFERENTE" | "NUEVO" | "SOLO EN PROD";
    differences: string[];
}

