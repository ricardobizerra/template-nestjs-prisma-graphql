type ExtraModelFields<TDatabase, TModel> = Exclude<
  keyof TModel,
  keyof TDatabase
>;

type RequiredHashFields<TDatabase, TModel> =
  ExtraModelFields<TDatabase, TModel> extends never
    ? Record<string, never> & {
        DEFAULT: (keyof TDatabase)[];
      }
    : {
        [K in ExtraModelFields<TDatabase, TModel>]: (keyof TDatabase)[];
      } & {
        DEFAULT?: (keyof TDatabase)[];
      };

type SelectObjectParams<TDatabase, TModel> =
  ExtraModelFields<TDatabase, TModel> extends never
    ? [
        queriedFields: (keyof TModel)[],
        hashDifferentFields?: RequiredHashFields<TDatabase, TModel>,
      ]
    : [
        queriedFields: (keyof TModel)[],
        hashDifferentFields: RequiredHashFields<TDatabase, TModel>,
      ];

type SelectObjectReturn<TDatabase> = Partial<Record<keyof TDatabase, true>>;

export function selectObject<
  TDatabase extends Record<string, any>,
  TModel extends Partial<TDatabase>,
>(
  ...args: SelectObjectParams<TDatabase, TModel>
): SelectObjectReturn<TDatabase> {
  const [queriedFields, hashDifferentFields] = args as SelectObjectParams<
    TDatabase,
    TModel
  >;

  const processFields = (fields: (keyof TDatabase)[]) =>
    selectObject<TDatabase, TDatabase>(fields);

  const reduceFields = (
    acc: SelectObjectReturn<TDatabase>,
    field: keyof TModel,
  ) => {
    if (hashDifferentFields && field in hashDifferentFields) {
      const hashedFields = hashDifferentFields[
        field as keyof RequiredHashFields<TDatabase, TModel>
      ] as (keyof TDatabase)[];
      return { ...acc, ...processFields(hashedFields) };
    }
    return { ...acc, [field]: true };
  };

  const reducedFields = queriedFields.reduce(
    reduceFields,
    {} as SelectObjectReturn<TDatabase>,
  );

  if (!hashDifferentFields?.DEFAULT) {
    return reducedFields;
  }

  const defaultFields = processFields(
    hashDifferentFields.DEFAULT as (keyof TDatabase)[],
  );
  return { ...reducedFields, ...defaultFields };
}
