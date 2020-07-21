import React, {Fragment, useEffect, useState} from 'react';
import {
  useParams,
  Link as RouterLink,
} from "react-router-dom";
import queryString from "query-string";
import StatusLink from "./StatusLink";
import CreateStepModal from "./test/CreateStepModal";


const Step = ({step, result: {result}, selected, active, getLink}) => {
  const {type, ...rest} = step;
  return (
    <StatusLink
      link={getLink()}
      status={result}
      subTitle={result}
      selected={selected}
      active={active}
    >
      {type} {JSON.stringify(rest, null, 2)}
    </StatusLink>
  )
};

const groupBy = (items, key) =>
  items.reduce((prev, curr) => ({
    ...prev,
    [curr[key]]: [...(prev[curr[key]] || []), curr]
  }), {});

export default function Test({match: {url}, location: {search}, history}) {
  const {testId} = useParams();
  const [test, setTest] = useState({});
  const [steps, setSteps] = useState();
  const [stepResults, setStepResults] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const {file, exportName, ...rest} = queryString.parse(search);
  const step = rest.step && parseInt(rest.step, 10);

  useEffect(() => {
    if (steps && !step) {
      history.replace(`${url}/assertion${search}&step=${steps.length - 1}`);
    }
  }, [step, steps]);

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
  }, [testId, search, steps]);

  useEffect(() => {
    fetch(`/test/${testId}/render/regions${search}`)
      .then(res => res.json())
      .then(setRegions)
  }, [testId, search, steps]);

  const save = steps => {
    setSteps(
      steps
    );

    return fetch(`/test/${test.id}/steps${search}`, {
      method: 'put',
      body: JSON.stringify(steps),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  const handleAddStep = stepToAdd => {
    const modifiedSteps = [...steps];
    modifiedSteps.splice(step + 1, 0, stepToAdd);
    save(modifiedSteps)
      .then(() => {
        setSelectedRegion(null);
        history.replace(`${url}?file=${file}&exportName=${exportName}&step=${step + 1}`);
      });
  };

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
              <h3>{type}</h3>
              {regions.map(r =>
                <button
                  className={
                    `block font-medium text-gray-700 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 my-2 focus:rounded-lg w-full text-left`
                  }
                  key={r.xpath}
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
      </div>
      <div className="md:w-1/2 p-6">
        <div className="my-2">
          {!!steps && steps.map((s, i) =>
            <Step
              step={s}
              result={stepResults[i] || {}}
              selected={i <= (step || stepResults.length - 1)}
              active={i === step}
              getLink={() => `/tests/${testId}?file=${file}&exportName=${exportName}&step=${i}`}
              key={i}
            />
          )}
        </div>
      </div>
    </div>
  )
}
