export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc',
}

export interface OrdenationArgs {
  orderBy: string;
  orderDirection: OrderDirection;
}
