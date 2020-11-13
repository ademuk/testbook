import React, {useState, useEffect} from 'react';
import LoadingIndicator from './LoadingIndicator';
import StatusLink from "./StatusLink";


type ModuleProps = {
  file: string;
  components: {
    exportName: string;
    name: string;
  }[]
}

const Module = ({file, components}: ModuleProps) => (
    <div className="flex justify-center p-3 px-3">
      <div className="w-full">
        <div className="bg-white shadow-md rounded-lg px-3 py-2">
          <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
            {file}
          </div>

          <div className="py-3">
          {components.map(c =>
            <StatusLink
              link={`/tests?file=${file}&exportName=${c.exportName}`}
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
  const [moduleTests, setModuleTests] = useState<ModuleProps[]>([]);
  const [modules, setModules] = useState<ModuleProps[]>([]);
  const [areTestsLoading, setAreTestsLoading] = useState(true);
  const [isSearchingForComponents, setIsSearchingForComponents] = useState(true);

  useEffect(() => {
    fetch('/module-component')
      .then(res => res.json())
      .then(setModules)
      .finally(() => setIsSearchingForComponents(false))
  }, []);

  useEffect(() => {
    fetch('/module-test')
      .then(res => res.json())
      .then(setModuleTests)
      .finally(() => setAreTestsLoading(false))
  }, []);

  if (areTestsLoading) {
    return <LoadingIndicator>Loading component tests...</LoadingIndicator>
  }

  return (
    <div className="p-3">
      <div className="p-6 block text-gray-700 text-lg font-semibold py-2">Your tests</div>
      {moduleTests.map(
        f => (
          <Module file={f.file} components={f.components} key={f.file} />
        )
      )}
      {
        (!areTestsLoading && !moduleTests.length) && <div className="p-6">You don't have any tests yet</div>
      }
      {isSearchingForComponents && <div className="p-6"><LoadingIndicator>Looking for components...</LoadingIndicator></div>}
      {!!modules.length && <div className="p-6 block text-gray-700 text-lg font-semibold py-2">Other components in your project</div>}
      {modules.map(
        m => (
          <Module file={m.file} components={m.components} key={m.file} />
        )
      )}
    </div>
  )
}
