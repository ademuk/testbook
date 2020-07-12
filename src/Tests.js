import React, {useEffect, useState} from 'react';
import queryString from "query-string";
import {Link} from "react-router-dom";
import StatusLink from "./StatusLink";


const handleSave = (file, exportName, cb) =>
  fetch(`/test?file=${file}&exportName=${exportName}`, {
      method: 'post',
    })
    .then(r => r.json())
    .then(cb);

export default function Tests({history, location: {search}}) {
  const [tests, setTests] = useState([]);
  const {file, exportName} = queryString.parse(search);

  useEffect(() => {
    fetch(`/test?file=${file}&exportName=${exportName}`)
      .then(res => res.json())
      .then(setTests)
  }, [file, exportName]);

  return (
    <div>
      <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
        {file}
      </div>
      <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
        {exportName}
      </div>

      <div className="py-3">
        {!!tests && tests.map(t =>
          <StatusLink
            link={`/tests/${t.id}?file=${file}&exportName=${exportName}`}
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

      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={
                () => handleSave(
                  file,
                  exportName,
                  ({id}) => history.push(`/tests/${id}?file=${file}&exportName=${exportName}`)
                )
              }
      >
        New Test
      </button>
    </div>
  )
 }
