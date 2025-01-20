import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
import { PageInfo } from './page-info.model';

export function Connection<T>(classRef: Type<T>): any {
  @ObjectType(`${classRef.name}Edge`, { isAbstract: true })
  abstract class EdgeType {
    @Field(() => String)
    cursor: string;

    @Field(() => classRef)
    node: T;
  }

  @ObjectType({ isAbstract: true })
  abstract class ConnectionType {
    @Field(() => [EdgeType], { nullable: true })
    edges: EdgeType[];

    @Field(() => PageInfo, { nullable: true })
    pageInfo: PageInfo;
  }

  return ConnectionType;
}
