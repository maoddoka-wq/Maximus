export function createSerializedLocationOperationQueue() {
  let queue: Promise<void> = Promise.resolve();

  return function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}