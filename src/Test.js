import React, {useEffect, useState} from 'react';
import {
  useParams,
  Route, Link,
} from "react-router-dom";
import queryString from "query-string";
import Assertion from "./test/Assertion";
import Event from "./test/Event";
import StatusLink from "./StatusLink";


const Step = ({step, result: {result}}) => {
  const {type, ...rest} = step;
  return (
    <StatusLink
      status={result}
      subText={result}
    >
      {type} {JSON.stringify(rest, null, 2)}
    </StatusLink>
  )
};

export default function Test({match: {url}, location: {search}, history}) {
  const {testId} = useParams();
  const [test, setTest] = useState({});
  const [steps, setSteps] = useState();
  const [stepResults, setStepResults] = useState([]);

  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test/${testId}${search}`)
      .then(res => res.json())
      .then(test => {
        setTest(test);
        setSteps(test.steps);
      })
  }, [testId, file, exportName, search]);

  useEffect(() => {
    fetch(`/test/${testId}/run${search}`)
      .then(res => res.json())
      .then(setStepResults)
  }, [testId, file, exportName, steps, search]);

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

  const [expanded, setExpanded] = React.useState(false);

  const handleExpandChange = panel => (event, isExpanded) =>
    setExpanded(isExpanded ? panel : false);

  return (
    <>
      <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
        {file}
      </div>
      <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
        <Link to={`/tests/?file=${file}&exportName=${exportName}`}>{exportName}</Link>
      </div>
      <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
        Test {test.id}
      </div>

      <div className="my-3">
        {!!steps && steps.map((step, i) =>
          <Step
            step={step}
            result={stepResults[i] || {}}
            key={i}
          />
        )}
      </div>

      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
              onClick={() => history.push(`${url}/event${search}`)}
      >
        Add Event
      </button>

      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
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
    </>
  )
}
