import { GraphQLResolveInfo } from 'graphql';

export function getQueriedFields(
  info: GraphQLResolveInfo,
  fieldName: string,
): string[] {
  const fieldNode = info.fieldNodes.find(
    (node) => node.name.value === fieldName,
  );

  if (!fieldNode || !fieldNode.selectionSet) {
    return [];
  }

  return extractFields(fieldNode.selectionSet);
}

const extractFields = (selectionSet: any): string[] => {
  const fields: string[] = [];

  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      fields.push(selection.name.value);
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      fields.push(...extractFields(selection.selectionSet));
    }
  }

  return fields;
};
