import React, { Fragment, useEffect, useState } from "react";
import { Link as RouterLink, RouteComponentProps } from "react-router-dom";
import type { History } from "history";
import queryString from "query-string";
import SelectedRegionModal from "./test/SelectedRegionModal";
import SelectedMockCallModal from "./test/SelectedMockCallModal";
import EditRenderPropsModal from "./test/EditRenderPropsModal";
import Step from "./test/Step";
import EditMockModal, {EditStepProps} from "./test/EditMockModal";
import LoadingIndicator from "./LoadingIndicator";

const groupBy = <T, K extends keyof any>(items: T[], getKey: (item: T) => K): {[key: string]: T[]} =>
  items.reduce(
    (prev, curr) => ({
      ...prev,
      [getKey(curr)]: [...(prev[getKey(curr)] || []), curr],
    }),
    {} as Record<K, T[]>
  );

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const labelMap: { [key: string]: string } = {
  fetch: "HTTP requests",
};

const label = (text: string) =>
  labelMap[text] ? labelMap[text] : capitalise(text);

type TestDefinition = {
  id: string;
  steps: StepDefinition[];
};

export type StepDefinition = {
  type: string;
  definition: {
    [key: string]: any
  }
};

export type StepResultDefinition = {
  result: string
}

export type RegionDefinition = {
  text: string;
  type: string;
  unique: boolean;
  xpath: string;
};

type MockCallArgs = any[];

export type MockCalls = {
  name: string;
  calls: MockCallArgs[]
};

export type MockCall = [
  string,
  MockCallArgs
];

type TestProps = {
  history: History;
  file: string,
  exportName: string;
  test: TestDefinition;
  step: number;
}

const Test = ({history, file, exportName, test, step}: TestProps) => {
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [stepResults, setStepResults] = useState<StepResultDefinition[]>([]);
  const [mocks, setMocks] = useState<MockCalls[]>([]);
  const [regions, setRegions] = useState<RegionDefinition[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionDefinition>();
  const [selectedMockCall, setSelectedMockCall] = useState<MockCall>();
  const [selectedStep, setSelectedStep] = useState<StepDefinition>();

  useEffect(() => {
    if (test && step > steps.length - 1) {
      history.replace(`/tests/${test.id}?file=${file}&exportName=${exportName}&step=${test.steps.length - 1}`);
    }
  }, [history, file, exportName, test, steps, step]);

  useEffect(() => {
    setSteps(test.steps);
  }, [test.steps]);

  useEffect(() => {
    if (steps.length) {
      fetch(
        `/test/${test.id}/render/side-effects?file=${file}&exportName=${exportName}&step=${step}`
      )
        .then((res) => res.json())
        .then(({ regions, mocks }) => {
          setRegions(regions);
          setMocks(mocks);
        })
    }
  }, [file, exportName, test.id, step, steps]);

  useEffect(() => {
    if (steps.length) {
      fetch(`/test/${test.id}/run?file=${file}&exportName=${exportName}`)
        .then((res) => res.json())
        .then(setStepResults);
    }
  }, [file, exportName, test.id, steps]);

  const save = (steps: StepDefinition[]) =>
    fetch(`/test/${test.id}/steps?file=${file}&exportName=${exportName}`, {
      method: "put",
      body: JSON.stringify(steps),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(() => setSteps(steps));

  const handleAddStep = (stepToAdd: StepDefinition, idx: number) => {
    const modifiedSteps: StepDefinition[] = [...steps];

    modifiedSteps.splice(idx, 0, stepToAdd);

    save(modifiedSteps).then(() => {
      setSelectedRegion(undefined);
      setSelectedMockCall(undefined);

      history.push(
        `/tests/${test.id}?file=${file}&exportName=${exportName}&step=${step + 1}`
      );
    });
  };

  const handleDeleteStep = (idx: number) =>
    save(steps.filter((s, i) => i !== idx)).then(() => {
      setSelectedRegion(undefined);
      history.replace(
        `/tests/${test.id}?file=${file}&exportName=${exportName}&step=${step}`
      );
    });

  const handleEditStep = (stepToUpdate: StepDefinition, idx: number) =>
    save(steps.map((s, i) => (i === idx ? stepToUpdate : s))).then(() =>
      setSelectedStep(undefined)
    );

  const regionsByType = groupBy(regions, (r) => r.type);

  const editStepComponents: { [key: string]: React.FC<EditStepProps> } = {
    render: EditRenderPropsModal,
    mock: EditMockModal,
  };

  const EditModalComponent =
    selectedStep && editStepComponents[selectedStep.type];

  return (
    <div className="bg-white flex">
      <div className="md:w-1/2 p-6">
        <div className="block text-gray-700 text-lg font-semibold py-2">
          {file} /{" "}
          <RouterLink
            to={`/tests/?file=${file}&exportName=${exportName}`}
            className="underline"
          >
            {exportName}
          </RouterLink>{" "}
          / Test {test && test.id}
        </div>

        {!!regions.length &&
        Object.entries(regionsByType).map(([type, regions]) => (
          <Fragment key={`${type}`}>
            <h3>{capitalise(type)}</h3>
            {regions.map((r) => (
              <button
                className={`block font-medium text-gray-700 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 my-2 focus:rounded-lg w-full text-left`}
                key={`${r.xpath}${r.text}`}
                onClick={() => setSelectedRegion(r)}
              >
                {r.text + (r.unique ? "" : " (not unique)")}
              </button>
            ))}
          </Fragment>
        ))}

        {!!mocks.length &&
        mocks.map(({ name, calls }, i) => (
          !!calls.length && (<Fragment key={`${name}${i}`}>
            <h3>{label(name)}</h3>
            {calls.map((args, i) => (
              <button
                className={`block font-medium text-gray-700 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 my-2 focus:rounded-lg w-full text-left`}
                key={[i, ...args].join('')}
                onClick={() => setSelectedMockCall([name, args])}
              >
                {args}
              </button>
            ))}
          </Fragment>)
        ))}

        {selectedRegion && (
          <SelectedRegionModal
            region={selectedRegion}
              onSelect={(stepToAdd: StepDefinition) => handleAddStep(stepToAdd, step + 1)}
            onClose={() => setSelectedRegion(undefined)}
          />
        )}

        {selectedMockCall && (
          <SelectedMockCallModal
            selectedMockCall={selectedMockCall}
            onUpdateStep={(stepToAdd: StepDefinition) =>
              handleAddStep(stepToAdd, stepToAdd.type === "mock" ? 0 : step + 1)
            }
            onClose={() => setSelectedMockCall(undefined)}
          />
        )}

        {selectedStep && EditModalComponent && (
          <EditModalComponent
            step={selectedStep}
            onUpdateStep={(updatedStep: StepDefinition) =>
              handleEditStep(updatedStep, steps.indexOf(selectedStep))
            }
            onClose={() => setSelectedStep(undefined)}
            file={file}
            exportName={exportName}
          />
        )}
      </div>
      <div className="md:w-1/2 p-6">
        <div className="my-2">
          {steps.map((s, i) => (
            <Step
              step={s}
              result={stepResults[i] || {}}
              selected={
                i <= (step === null ? stepResults.length - 1 : step)
              }
              active={i === step}
              link={`/tests/${test.id}?file=${file}&exportName=${exportName}&step=${i}`}
              onDelete={() => handleDeleteStep(i)}
              onEdit={() => setSelectedStep(steps[i])}
              key={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
};


type RouteParams = {
  testId: string;
};

const TestRoute = ({
  match: {
    params: { testId },
  },
  location: { search },
  history,
}: RouteComponentProps<RouteParams>) => {
  const [test, setTest] = useState<TestDefinition>();

  const { file, exportName, step: stepIdx } = queryString.parse(search);
  const step = typeof stepIdx === "string" ? parseInt(stepIdx, 10) : null;

  useEffect(() => {
    if (test && step === null) {
      history.replace(`/tests/${test.id}?file=${file}&exportName=${exportName}&step=${test.steps.length - 1}`);
    }
  }, [history, file, exportName, test, step]);

  useEffect(() => {
    fetch(`/test/${testId}?file=${file}&exportName=${exportName}`)
      .then((res) => res.json())
      .then(setTest);
  }, [testId, file, exportName]);

  if (typeof file != 'string' || typeof exportName != 'string') {
    history.replace('/');
    return null;
  }

  if (!test || step === null) {
    return <LoadingIndicator>Loading test...</LoadingIndicator>
  }

  return (
    <Test history={history} file={file} exportName={exportName} test={test} step={step} />
  )
};

export default TestRoute;
