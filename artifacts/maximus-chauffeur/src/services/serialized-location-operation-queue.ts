type AsyncOperation<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

export function createSerializedLocationOperations<
  TEnableArgs extends unknown[],
  TEnableResult,
  TResumeArgs extends unknown[],
  TResumeResult,
  TStopResult,
>(operations: {
  enable: AsyncOperation<TEnableArgs, TEnableResult>;
  resume: AsyncOperation<TResumeArgs, TResumeResult>;
  stop: () => Promise<TStopResult>;
}) {
  let queue: Promise<void> = Promise.resolve();

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation, operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  return {
    enable: (...args: TEnableArgs) =>
      serialize(() => operations.enable(...args)),
    resume: (...args: TResumeArgs) =>
      serialize(() => operations.resume(...args)),
    stop: () => serialize(operations.stop),
  };
}