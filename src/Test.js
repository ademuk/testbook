import React, {Fragment, useEffect, useState} from 'react';
import {
  useParams,
  Link as RouterLink,
} from "react-router-dom";
import queryString from "query-string";
import CreateStepModal from "./test/CreateStepModal";

import EditStepModal from "./test/EditStepModal";
import Step from "./test/Step";

const groupBy = (items, key) =>
  items.reduce((prev, curr) => ({
    ...prev,
    [curr[key]]: [...(prev[curr[key]] || []), curr]
  }), {});

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export default function Test({match: {url}, location: {search}, history}) {
  const {testId} = useParams();
  const [test, setTest] = useState({});
  const [steps, setSteps] = useState();
  const [stepResults, setStepResults] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedStepIdxToEdit, setSelectedStepIdxToEdit] = useState(null);

  const {file, exportName, ...rest} = queryString.parse(search);
  const step = rest.step && parseInt(rest.step, 10);

  useEffect(() => {
    if (steps && step === undefined) {
      history.replace(`${url}${search}&step=${steps.length - 1}`);
    }

    if (steps && step > steps.length - 1) {
      history.replace(`${url}?file=${file}&exportName=${exportName}&step=${steps.length - 1}`);
    }
  }, [history, url, search, file, exportName, step, steps]);

  useEffect(() => {
    fetch(`/test/${testId}?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(test => {
        setTest(test);
        setSteps(test.steps);
      })
  }, [testId, file, exportName]);

  useEffect(() => {
    fetch(`/test/${testId}/run?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setStepResults)
  }, [testId, file, exportName, steps]);

  useEffect(() => {
    fetch(`/test/${testId}/render/regions${search}`)
      .then(res => res.json())
      .then(setRegions)
  }, [testId, search, steps]);

  const save = steps =>
    fetch(`/test/${test.id}/steps${search}`, {
      method: 'put',
      body: JSON.stringify(steps),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(() => setSteps(steps));

  const handleAddStep = stepToAdd => {
    const modifiedSteps = [...steps];
    modifiedSteps.splice(step + 1, 0, stepToAdd);
    save(modifiedSteps)
      .then(() => {
        setSelectedRegion(null);
        history.replace(`${url}?file=${file}&exportName=${exportName}&step=${step + 1}`);
      });
  };

  const handleDeleteStep = (idx) =>
    save(steps.filter((s, i) => i !== idx))
      .then(() => {
        setSelectedRegion(null);
        history.replace(`${url}?file=${file}&exportName=${exportName}&step=${step}`);
      });

  const handleEditStep = (stepToUpdate, idx) =>
    save(steps.map((s, i) => i === idx ? stepToUpdate : s))
      .then(() => setSelectedStepIdxToEdit(null));

  const regionsByType = groupBy(regions, 'type');

  return (
    <div className="bg-white flex">
      <div className="md:w-1/2 p-6">
        <div className="block text-gray-700 text-lg font-semibold py-2">
          {file} /{' '}
          <RouterLink to={`/tests/?file=${file}&exportName=${exportName}`} className="underline">{exportName}</RouterLink> /{' '}
          Test {test.id}
        </div>
        {!!regions.length && Object.entries(regionsByType)
          .map(([type, regions]) =>
            <Fragment key={`${type}`}>
              <h3>{capitalise(type)}</h3>
              {regions.map(r =>
                <button
                  className={
                    `block font-medium text-gray-700 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 my-2 focus:rounded-lg w-full text-left`
                  }
                  key={`${r.xpath}${r.text}`}
                  onClick={() => setSelectedRegion(r)}
                >
                  {r.text + (r.unique ? '' : ' (not unique)')}
                </button>
              )}
            </Fragment>
          )
        }

        {
          selectedRegion &&
          <CreateStepModal region={selectedRegion} onSelect={handleAddStep} onClose={() => setSelectedRegion(null)} />
        }

        {
          (selectedStepIdxToEdit !== null) &&
          <EditStepModal
            step={steps[selectedStepIdxToEdit]}
            onSubmit={(updatedStep) => handleEditStep(updatedStep, selectedStepIdxToEdit)}
            onClose={() => setSelectedStepIdxToEdit(null)}
            file={file}
            exportName={exportName} />
        }
      </div>
      <div className="md:w-1/2 p-6">
        <div className="my-2">
          {!!steps && steps.map((s, i) =>
            <Step
              step={s}
              result={stepResults[i] || {}}
              selected={i <= (step === undefined ? stepResults.length - 1 : step)}
              active={i === step}
              link={`/tests/${testId}?file=${file}&exportName=${exportName}&step=${i}`}
              onDelete={() => handleDeleteStep(i)}
              onEdit={() => setSelectedStepIdxToEdit(i)}
              key={i}
            />
          )}
        </div>
      </div>
    </div>
  )
}
