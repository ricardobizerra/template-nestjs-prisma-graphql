import { FieldNode, GraphQLResolveInfo, SelectionSetNode } from 'graphql';

export function getQueriedFields<TModel extends Record<string, any>>(
  info: GraphQLResolveInfo,
  fieldName: string,
  paginatedQuery = true,
): (keyof TModel)[] {
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

    return extractFields(nodeField.selectionSet, info);
  }

  return extractFields(fieldNode.selectionSet, info);
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

const extractFields = <TModel>(
  selectionSet: SelectionSetNode,
  info: GraphQLResolveInfo,
): (keyof TModel)[] => {
  const fields: (keyof TModel)[] = [];

  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field' && !selection.name.value.startsWith('_')) {
      fields.push(selection.name.value as keyof TModel);
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      fields.push(...extractFields(selection.selectionSet, info));
    } else if (selection.kind === 'FragmentSpread') {
      const fragment = info.fragments[selection.name.value];

      if (fragment) {
        fields.push(...extractFields(fragment.selectionSet, info));
      }
    }
  }

  return fields;
};
