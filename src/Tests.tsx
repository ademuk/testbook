import React, {useEffect, useState} from 'react';
import {RouteComponentProps} from 'react-router-dom';
import queryString from "query-string";
import StatusLink from "./StatusLink";
import LoadingIndicator from './LoadingIndicator';


const handleSave = (file: string, exportName: string, cb: (response: {id: number}) => void): Promise<Test[] | void> =>
  fetch(`/test?file=${file}&exportName=${exportName}`, {
      method: 'post',
    })
    .then(r => r.json())
    .then(cb);

type Test = {
    id: string
};

const Tests: React.FunctionComponent<RouteComponentProps> = ({history, location: {search}}) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testStatuses, setTestStatuses] = useState<{[key: string]: string}>({});
  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
      fetch(`/test?file=${file}&exportName=${exportName}`)
          .then(res => res.json())
          .then(setTests)
          .finally(() => setIsLoading(false))
  }, [file, exportName]);

  useEffect(() => {
      fetch(`/test/status${search}`)
          .then(res => res.json())
          .then(setTestStatuses)
  }, [tests, search]);

  if (typeof file != 'string' || typeof exportName != 'string') {
    history.replace('/');
    return null;
  }

  if (isLoading) {
    return <LoadingIndicator>Loading tests...</LoadingIndicator>
  }

  return (
    <div className="p-6 bg-white">
      <div className="block text-gray-700 text-lg font-semibold py-2">
        {file} / {exportName}
      </div>

      <div className="py-3">
        {tests.map(t =>
          <StatusLink
            link={`/tests/${t.id}?file=${file}&exportName=${exportName}`}
            status={testStatuses[t.id]}
            key={t.id}
          >
            {t.id}
          </StatusLink>
        )}
        {
          !tests.length && <div>
            No tests yet
          </div>
        }
      </div>

      <button className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full"
              onClick={
                () => handleSave(
                  file,
                  exportName,
                  ({id}) => history.push(`/tests/${id}?file=${file}&exportName=${exportName}`)
                )
              }
      >
        Add Test
      </button>
    </div>
  )
};

export default Tests;
