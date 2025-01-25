import { Type } from '@nestjs/common';
import { ArgsType, Field, registerEnumType } from '@nestjs/graphql';

export enum OrderDirection {
  Asc = 'asc',
  Desc = 'desc',
}

registerEnumType(OrderDirection, { name: 'OrderDirection' });

export function Ordenation<T>(Model: Type<T>, OrderBy: object): any {
  registerEnumType(OrderBy, { name: `Ordenation${Model.name}` });

  @ArgsType()
  abstract class Ordenation {
    @Field(() => OrderBy, { nullable: true })
    orderBy: keyof T;

    @Field(() => OrderDirection, { nullable: true })
    orderDirection: OrderDirection;
  }

  return Ordenation;
}
