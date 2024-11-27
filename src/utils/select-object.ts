export function selectObject<T>(
  queriedFields: string[],
): Partial<Record<keyof T, true>> {
  return queriedFields.reduce(
    (acc, field) => ({ ...acc, [field]: true }),
    {} as Partial<Record<keyof T, true>>,
  );
}
