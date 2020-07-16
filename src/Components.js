import React, {useState, useEffect} from 'react';
import StatusLink from "./StatusLink";


const Module = ({module}) => (
    <div className="flex justify-center p-3 px-3">
      <div className="w-full">
        <div className="bg-white shadow-md rounded-lg px-3 py-2">
          <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
            {module.file}
          </div>

          {/*<div className="flex items-center bg-gray-200 rounded-md">*/}
          {/*  <div className="pl-2">*/}
          {/*    <svg className="fill-current text-gray-500 w-6 h-6" xmlns="http://www.w3.org/2000/svg"*/}
          {/*         viewBox="0 0 24 24">*/}
          {/*      <path className="heroicon-ui"*/}
          {/*            d="M16.32 14.9l5.39 5.4a1 1 0 0 1-1.42 1.4l-5.38-5.38a8 8 0 1 1 1.41-1.41zM10 16a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/>*/}
          {/*    </svg>*/}
          {/*  </div>*/}
          {/*  <input*/}
          {/*    className="w-full rounded-md bg-gray-200 text-gray-700 leading-tight focus:outline-none py-2 px-2"*/}
          {/*    id="search" type="text" placeholder="Search teams or members" />*/}
          {/*</div>*/}

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

          {/*<div className="block bg-gray-200 text-sm text-right py-2 px-3 -mx-3 -mb-2 rounded-b-lg">*/}
          {/*  <button className="hover:text-gray-600 text-gray-500 font-bold py-2 px-4">*/}
          {/*    Cancel*/}
          {/*  </button>*/}
          {/*  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">*/}
          {/*    Invite*/}
          {/*  </button>*/}
          {/*</div>*/}
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
