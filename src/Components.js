import React, {useState, useEffect} from 'react';
import StatusLink from "./StatusLink";


const Module = ({module}) => (
    <div className="flex justify-center p-3 px-3">
      <div className="w-full">
        <div className="bg-white shadow-md rounded-lg px-3 py-2">
          <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
            {module.file}
          </div>

          <div className="py-3">
          {module.components.map(c =>
            <StatusLink
              link={`/tests?file=${module.file}&exportName=${c.exportName}`}
              key={c.exportName}
            >
              {c.name}
            </StatusLink>
          )}
          </div>

        </div>
      </div>
    </div>
);


export default function Components() {
  const [files, setFiles] = useState();

  useEffect(() => {
    fetch('/component')
      .then(res => res.json())
      .then(setFiles)
  }, []);

  return (
    <div className="p-3">
      {!!files && files.map(
        f => (
          <Module module={f} key={f.file} />
        )
      )}
      {!files &&
        <div className="flex h-screen">
          <div className="m-auto text-center">
            <div className="inline-block loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16" />
            <div className="mt-2 text-gray-700 font-medium">Searching for components...</div>
          </div>
        </div>
      }
      {
        (files && !files.length) && <div>No Components were found</div>
      }
    </div>
  )
}
