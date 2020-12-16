export const runMockStep = (file, exportName, step, context) => {
  const { mocks } = context;
  const mock = mocks.find((m) => m.name === step.definition.name);

  mock.mock.addMock(step.definition.args, step.definition.return);

  return Promise.resolve(["success", context]);
};

type MockCall = [any[], any];

type SetupMock = {
  addMock: (args: any[], returnValue: any) => void;
  getCalls: () => MockCall[];
};

const setupFetchMock = (): SetupMock => {
  let calls = [];
  let mockReturnValues = [];

  window.fetch = function (
    input: RequestInfo,
    init: RequestInit
  ): Promise<any> {
    const callingArgs = Array.from(arguments);

    calls.push(callingArgs);

    const mockReturnValue = mockReturnValues.find(
      ([args]) => JSON.stringify(args) === JSON.stringify(callingArgs)
    );

    return Promise.resolve({
      json: () => Promise.resolve(mockReturnValue ? mockReturnValue[1] : []),
    });
  };

  return {
    addMock: (args, returnValue) => mockReturnValues.push([args, returnValue]),
    getCalls: () => calls,
  };
};

const MOCKS = [
  {
    name: "fetch",
    setup: setupFetchMock,
  },
];

export type Mock = {
  name: string;
  mock: SetupMock;
};

export type MockResult = {
  name: string;
  calls: MockCall[];
};

export const setupMocks = (): Mock[] =>
  MOCKS.map(({ name, setup }) => ({
    name,
    mock: setup(),
  }));
