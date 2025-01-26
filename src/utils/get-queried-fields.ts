import { FieldNode, GraphQLResolveInfo, SelectionSetNode } from 'graphql';

export function getQueriedFields(
  info: GraphQLResolveInfo,
  fieldName: string,
  paginatedQuery = true,
): string[] {
  const fieldNode = info.fieldNodes.find(
    (node) => node.name.value === fieldName,
  );

  if (!fieldNode || !fieldNode.selectionSet) {
    return [];
  }

  if (!!paginatedQuery) {
    const edgesField = findFieldByName(fieldNode.selectionSet, 'edges');

    if (!edgesField || !edgesField.selectionSet) {
      return [];
    }

    const nodeField = findFieldByName(edgesField.selectionSet, 'node');

    if (!nodeField || !nodeField.selectionSet) {
      return [];
    }

    return extractFields(nodeField.selectionSet);
  }

  return extractFields(fieldNode.selectionSet);
}

const findFieldByName = (
  selectionSet: SelectionSetNode,
  fieldName: string,
): FieldNode | undefined => {
  return selectionSet.selections.find(
    (selection): selection is FieldNode =>
      selection.kind === 'Field' && selection.name.value === fieldName,
  );
};

const extractFields = (selectionSet: any): string[] => {
  const fields: string[] = [];

  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field' && !selection.name.value.startsWith('_')) {
      fields.push(selection.name.value);
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      fields.push(...extractFields(selection.selectionSet));
    }
  }

  return fields;
};
