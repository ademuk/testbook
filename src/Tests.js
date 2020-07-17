import React, {useEffect, useState} from 'react';
import queryString from "query-string";
import StatusLink from "./StatusLink";


const handleSave = (file, exportName, cb) =>
  fetch(`/test?file=${file}&exportName=${exportName}`, {
      method: 'post',
    })
    .then(r => r.json())
    .then(cb);

export default function Tests({history, location: {search}}) {
  const [tests, setTests] = useState([]);
  const [successfulTestIds, setSuccessfulTestIds] = useState([]);
  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setTests)
  }, [file, exportName]);

  useEffect(() => {
    Promise.all(
      tests.map(
        t => fetch(`/test/${t.id}/run${search}`)
          .then(r => [r, t.id])
      )
    )
    .then(res => Promise.all(
      res.map(([r, tid]) =>
        r.json()
          .then(r => [r, tid])
      )
    ))
    .then(
      results =>
        results.filter(([rs, tid]) =>
          rs.every(r => r.result === 'success')
        ).map(([rs, tid]) => tid)
    )
    .then(setSuccessfulTestIds)
  }, [tests, search]);

  return (
    <div className="p-6 bg-white">
      <div className="block text-gray-700 text-lg font-semibold py-2">
        {file} / {exportName}
      </div>

      <div className="py-3">
        {successfulTestIds}
        {!!tests && tests.map(t =>
          <StatusLink
            link={`/tests/${t.id}?file=${file}&exportName=${exportName}`}
            status={successfulTestIds.includes(t.id) ? 'success' : 'error'}
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
 }
