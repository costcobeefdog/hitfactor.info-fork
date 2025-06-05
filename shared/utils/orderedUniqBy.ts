const orderedUniqBy = <T>(arr: T[], key: keyof T): T[] =>
  Object.values(
    arr.reduce((acc, cur: T) => {
      const itemKey = cur[key] as unknown as number | string;
      const item = acc[itemKey] ?? cur;
      acc[itemKey] = item;
      return acc;
    }, {}),
  );

export default orderedUniqBy;
