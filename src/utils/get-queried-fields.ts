import { GraphQLResolveInfo } from 'graphql';

export function getQueriedFields(
  info: GraphQLResolveInfo,
  fieldName: string,
): string[] {
  const fields: string[] = [];
  const fieldNode = info.fieldNodes.find(
    (node) => node.name.value === fieldName,
  );

  if (!fieldNode || !fieldNode.selectionSet) {
    return fields;
  }

  const extractFields = (selectionSet: any): void => {
    selectionSet.selections.forEach((selection: any) => {
      if (selection.kind === 'Field') {
        fields.push(selection.name.value);
      } else if (
        selection.kind === 'InlineFragment' &&
        selection.selectionSet
      ) {
        extractFields(selection.selectionSet);
      }
    });
  };

  extractFields(fieldNode.selectionSet);
  return fields;
}
