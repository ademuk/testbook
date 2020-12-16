export const promiseSequence = <T>(tasks: (() => Promise<T>)[]) =>
  tasks.reduce(
    (promiseChain, currentTask) =>
      promiseChain.then((chainResults) =>
        currentTask().then((currentResult) => [...chainResults, currentResult])
      ),
    Promise.resolve([])
  );

export const chunk = <T>(items: T[], count: number): T[][] => {
  let i = 0,
    result = [];
  while (i < items.length) {
    result.push(items.slice(i, (i += count)));
  }
  return result;
};

export const promiseBatch = <T>(
  tasks: (() => Promise<T>)[],
  batchSize: number
) =>
  promiseSequence(
    chunk(tasks, batchSize).map((batchedTasks) => () =>
      Promise.all(batchedTasks.map((batchedTask) => batchedTask()))
    )
  ).then((batches) => batches.flat());
