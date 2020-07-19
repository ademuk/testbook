import React, {useEffect, useState} from 'react';
import {
  useParams,
  Route, Link as RouterLink,
} from "react-router-dom";
import queryString from "query-string";
import Assertion from "./test/Assertion";
import Event from "./test/Event";
import StatusLink, {Link} from "./StatusLink";


const Step = ({step, result: {result}, selected, getLink}) => {
  const {type, ...rest} = step;
  return (
    <StatusLink
      link={getLink()}
      status={result}
      subTitle={result}
      className={selected ? "bg-gray-400 hover:bg-gray-500" : ''}
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

  const {file, exportName, step} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test/${testId}?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(test => {
        setTest(test);
        setSteps(test.steps);
      })
  }, [testId, file, exportName]);

  useEffect(() => {
    fetch(`/test/${testId}/run${search}`)
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

    fetch(`/test/${test.id}/steps${search}`, {
      method: 'put',
      body: JSON.stringify(steps),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  };

  const handleAdd = step =>
    save([...steps, step]);

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
            <>
              <h3>{type}</h3>
              {regions.map(r =>
                <Link
                  key={r.text}
                >
                  {r.text + (r.unique ? '' : ' (not unique)')}
                </Link>
              )}
            </>
          )
        }

        <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full my-2 mr-2"
                onClick={() => history.push(`${url}/event${search}`)}
        >
          Add Event
        </button>

        <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full my-2"
                onClick={() => history.push(`${url}/assertion${search}`)}
        >
          Add Assertion
        </button>

        <Route path={`${url}/assertion`} render={({location}) => (
          <Assertion
            onAdd={handleAdd}
            onClose={() => history.push(`${url}${search}`)}
            location={location}
          />
        )} />

        <Route path={`${url}/event`} render={({location}) => (
          <Event
            onAdd={handleAdd}
            onClose={() => history.push(`${url}${search}`)}
            location={location}
          />
        )} />
      </div>
      <div className="md:w-1/2 p-6">
        <div className="my-2">
          {!!steps && steps.map((s, i) =>
            <Step
              step={s}
              result={stepResults[i] || {}}
              selected={i <= (step || stepResults.length - 1)}
              getLink={() => `/tests/${testId}?file=${file}&exportName=${exportName}&step=${i}`}
              key={i}
            />
          )}
        </div>
      </div>
    </div>
  )
}
