import React, { Fragment, useEffect, useRef, useState } from "react";
import { Link as RouterLink, RouteComponentProps } from "react-router-dom";
import type { History } from "history";
import queryString from "query-string";
import SelectedRegionModal from "./test/SelectedRegionModal";
import SelectedMockCallModal, {
  renderMockCallArgsLabel,
} from "./test/SelectedMockCallModal";
import EditRenderPropsModal from "./test/EditRenderPropsModal";
import Step from "./test/Step";
import EditMockModal, { EditStepProps } from "./test/EditMockModal";
import EditRenderWrapperModal from "./test/EditRenderWrapperModal";
import StepResultModal from "./test/StepResultModal";
import LoadingIndicator from "./LoadingIndicator";

const groupBy = <T, K extends keyof any>(
  items: T[],
  getKey: (item: T) => K
): { [key: string]: T[] } =>
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

export type TestDefinition = {
  id: string;
  name?: string;
  steps: StepDefinition[];
};

export type StepDefinition = {
  type: string;
  definition: {
    [key: string]: any;
  };
};

export type StepError = {
  name: string;
  message: string;
  stack: string;
  componentStack?: string;
};

export type StepResult = {
  result: string;
  error?: StepError;
};

export type RegionDefinition = {
  text: string;
  type: string;
  unique: boolean;
  xpath: string;
};

type MockCallArgs = any[];

export type MockCalls = {
  name: string;
  calls: MockCallArgs[];
};

export type MockCall = [string, MockCallArgs];

type TestProps = {
  history: History;
  file: string;
  exportName: string;
  test: TestDefinition;
  step: number;
};

const Test = ({ history, file, exportName, test, step }: TestProps) => {
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [mocks, setMocks] = useState<MockCalls[]>([]);
  const [regions, setRegions] = useState<RegionDefinition[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionDefinition>();
  const [selectedMockCall, setSelectedMockCall] = useState<MockCall>();
  const [selectedStepToEdit, setSelectedStepToEdit] = useState<
    StepDefinition
  >();
  const [isLoadingSideEffects, setIsLoadingSideEffects] = useState<boolean>(
    false
  );
  const [
    selectedStepToEditRenderWrapper,
    setSelectedStepToEditRenderWrapper,
  ] = useState<StepDefinition>();
  const [selectedStepResult, setSelectedStepResult] = useState<
    [StepDefinition, StepResult]
  >();
  const editableTestNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (test && step > steps.length - 1) {
      history.replace(
        `/tests/${test.id}?file=${file}&exportName=${exportName}&step=${
          test.steps.length - 1
        }`
      );
    }
  }, [history, file, exportName, test, steps, step]);

  useEffect(() => {
    setSteps(test.steps);
  }, [test.steps]);

  useEffect(() => {
    if (steps.length) {
      setIsLoadingSideEffects(true);
      fetch(
        `/test/${test.id}/render/side-effects?file=${file}&exportName=${exportName}&step=${step}`
      )
        .then((res) => res.json())
        .then(({ regions, mocks }) => {
          setRegions(regions);
          setMocks(mocks);
        })
        .finally(() => setIsLoadingSideEffects(false));
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
        `/tests/${test.id}?file=${file}&exportName=${exportName}&step=${
          step + 1
        }`
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
      setSelectedStepToEdit(undefined)
    );

  const handleUpdateTestName = (name: string) =>
    fetch(`/test/${test.id}/name?file=${file}&exportName=${exportName}`, {
      method: "put",
      body: JSON.stringify({ name }),
      headers: {
        "Content-Type": "application/json",
      },
    });

  const handleEditRenderWrapperStep = (
    stepToUpdate: StepDefinition,
    idx: number
  ) => {
    setSelectedStepToEditRenderWrapper(stepToUpdate);
    save(steps.map((s, i) => (i === idx ? stepToUpdate : s))).then(() =>
      setSelectedStepToEdit(undefined)
    );
  };

  const regionsByType = groupBy(regions, (r) => r.type);

  const editStepComponents: { [key: string]: React.FC<EditStepProps> } = {
    render: EditRenderPropsModal,
    mock: EditMockModal,
  };

  const EditModalComponent =
    selectedStepToEdit && editStepComponents[selectedStepToEdit.type];

  const testName = test && (test.name || test.id);

  const focusAndSelect = (el: HTMLInputElement) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection: Selection | null = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleUpdateTestNameKeyPress = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLDivElement)?.blur();
    }
  };

  return (
    <div className="flex">
      <div className="md:w-1/2 p-3">
        <div className="px-6 py-2 flex items-center text-gray-700 text-2xl font-semibold">
          <h1
            contentEditable={true}
            onBlur={(event) => {
              const name = (event.target as HTMLDivElement).textContent;
              name && handleUpdateTestName(name);
            }}
            onKeyPress={handleUpdateTestNameKeyPress}
            ref={editableTestNameRef}
          >
            {testName}
          </h1>{" "}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-5 h-5 ml-2 cursor-pointer"
            onClick={() =>
              editableTestNameRef.current &&
              focusAndSelect(editableTestNameRef.current)
            }
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </div>

        <h2 className="px-6 pb-2 flex items-center text-gray-700 font-semibold">
          {file} /
          <RouterLink
            to={`/tests/?file=${file}&exportName=${exportName}`}
            className="underline ml-1"
          >
            {exportName}
          </RouterLink>
        </h2>

        {isLoadingSideEffects && (
          <LoadingIndicator>Rendering...</LoadingIndicator>
        )}

        {!!regions.length && !isLoadingSideEffects && (
          <div className="p-3 m-3 bg-white shadow-md rounded-2xl">
            {Object.entries(regionsByType).map(([type, regions]) => (
              <Fragment key={`${type}`}>
                <h3 className="text-xl p-2">{capitalise(type)}</h3>
                {regions.map((r) => (
                  <button
                    className={`text-gray-700 hover:text-gray-600 hover:bg-gray-100 p-2 px-4 my-2 rounded-full focus:rounded-full w-full text-left`}
                    key={`${r.xpath}${r.text}`}
                    onClick={() => setSelectedRegion(r)}
                  >
                    {r.text + (r.unique ? "" : " (not unique)")}
                  </button>
                ))}
              </Fragment>
            ))}
          </div>
        )}

        {!!mocks.filter(({calls}) => calls.length).length && !isLoadingSideEffects && (
          <div className="p-3 m-3 bg-white shadow-md rounded-2xl">
            {mocks.filter(({calls}) => calls.length).map(
              ({ name, calls }, i) =>
                (
                  <Fragment key={`${name}${i}`}>
                    <h3 className="text-xl p-2">{label(name)}</h3>
                    {calls.map((args, i) => (
                      <button
                        className={`text-gray-700 hover:text-gray-600 hover:bg-gray-100 p-2 my-2 rounded-full focus:rounded-full text-left`}
                        key={[i, ...args].join("")}
                        onClick={() => setSelectedMockCall([name, args])}
                      >
                        {renderMockCallArgsLabel(args)}
                      </button>
                    ))}
                  </Fragment>
                )
            )}
          </div>
        )}

        {selectedRegion && (
          <SelectedRegionModal
            region={selectedRegion}
            onSelect={(stepToAdd: StepDefinition) =>
              handleAddStep(stepToAdd, step + 1)
            }
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

        {selectedStepToEdit && EditModalComponent && (
          <EditModalComponent
            step={selectedStepToEdit}
            onUpdateStep={(updatedStep: StepDefinition) =>
              handleEditStep(updatedStep, steps.indexOf(selectedStepToEdit))
            }
            onClose={() => setSelectedStepToEdit(undefined)}
            file={file}
            exportName={exportName}
          />
        )}

        {selectedStepToEditRenderWrapper && (
          <EditRenderWrapperModal
            step={selectedStepToEditRenderWrapper}
            onUpdateStep={(updatedStep: StepDefinition) =>
              handleEditRenderWrapperStep(
                updatedStep,
                steps.indexOf(selectedStepToEditRenderWrapper)
              )
            }
            onClose={() => setSelectedStepToEditRenderWrapper(undefined)}
            file={file}
            exportName={exportName}
          />
        )}

        {selectedStepResult && (
          <StepResultModal
            stepAndResult={selectedStepResult}
            onClose={() => setSelectedStepResult(undefined)}
          />
        )}
      </div>
      <div className="md:w-1/2 p-6 pl-1">
        <div className="my-2">
          {steps.map((s, i) => (
            <Step
              step={s}
              result={stepResults[i] || {}}
              selected={i <= (step === null ? stepResults.length - 1 : step)}
              active={i === step}
              link={`/tests/${test.id}?file=${file}&exportName=${exportName}&step=${i}`}
              onDelete={() => handleDeleteStep(i)}
              onEdit={() => setSelectedStepToEdit(steps[i])}
              onEditWrapper={() => setSelectedStepToEditRenderWrapper(steps[i])}
              onResultClick={
                stepResults[i] && stepResults[i].result === "error"
                  ? () => setSelectedStepResult([s, stepResults[i]])
                  : undefined
              }
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
      history.replace(
        `/tests/${test.id}?file=${file}&exportName=${exportName}&step=${
          test.steps.length - 1
        }`
      );
    }
  }, [history, file, exportName, test, step]);

  useEffect(() => {
    fetch(`/test/${testId}?file=${file}&exportName=${exportName}`)
      .then((res) => res.json())
      .then(setTest);
  }, [testId, file, exportName]);

  if (typeof file != "string" || typeof exportName != "string") {
    history.replace("/");
    return null;
  }

  if (!test || step === null) {
    return <LoadingIndicator>Loading test...</LoadingIndicator>;
  }

  return (
    <Test
      history={history}
      file={file}
      exportName={exportName}
      test={test}
      step={step}
    />
  );
};

export default TestRoute;
