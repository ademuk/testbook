import React, {useState, useEffect} from 'react';
import LoadingIndicator from './LoadingIndicator';
import StatusLink from "./StatusLink";
import {TestDefinition} from "./Test";

type ComponentDefinition = {
  exportName: string;
  name: string;
  tests?: TestDefinition[],
  error?: {[key: string]: any}
};

type ModuleDefinition = {
  file: string;
  components: ComponentDefinition[]
}

const Module = ({file, components}: ModuleDefinition) => (
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
              {!!c.tests?.length && <div
                className="ml-4 text-xs inline-flex items-center font-bold leading-sm uppercase px-3 py-1 rounded-full bg-white text-gray-700 border"
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                     width="16"
                     height="16"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className="mr-2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>

                {c.tests.length} test{c.tests.length > 1 && 's'}
              </div>}
              {!!c.error && <div
                className="ml-4 text-xs inline-flex items-center font-bold leading-sm uppercase px-3 py-1 bg-red-200 text-red-700 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg"
                     width="16"
                     height="16"
                     viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="2"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     className="mr-2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Error
              </div>}
            </StatusLink>
          )}
          </div>
        </div>
      </div>
    </div>
);

enum LoadingStatus {
  pending,
  loading,
  error,
  loaded
}

const mergeComponents = (baseComponents: ComponentDefinition[], components: ComponentDefinition[]) =>
  baseComponents.map(bc => components.find(c => c.exportName === bc.exportName) || bc);

const mergeModules = (modules: ModuleDefinition[], tests: ModuleDefinition[]) => {
  if (!modules.length && tests.length) {
    return tests;
  }

  return modules.map(m => {
    const a = tests.find(t => t.file === m.file);
    return {
      ...m,
      components: mergeComponents(m.components, a ? a.components : [])
    }
  });
};

const splitIntoErrorNoError = (modules: ModuleDefinition[]) => {
  const modulesWithOnlyErrors = modules.filter((m) => m.components.every((c) => c.error));

  return [
    modulesWithOnlyErrors,
    modules.filter(({file}) => !modulesWithOnlyErrors.find((f) => f.file === file))
  ];
};

export default function Components() {
  const [moduleTests, setModuleTests] = useState<ModuleDefinition[]>([]);
  const [testsStatus, setTestsStatus] = useState<LoadingStatus>(LoadingStatus.pending);
  const [modules, setModules] = useState<ModuleDefinition[]>([]);
  const [modulesStatus, setModulesStatus] = useState<LoadingStatus>(LoadingStatus.pending);
  const [showOtherComponents, setShowOtherComponents] = useState(false);

  useEffect(() => {
    if (showOtherComponents ) {
      setModulesStatus(LoadingStatus.loading);
      fetch('/module-component')
        .then(res => res.json())
        .then(setModules)
        .then(() => setModulesStatus(LoadingStatus.loaded))
        .catch(() => setModulesStatus(LoadingStatus.error))
    }






























  }, [showOtherComponents]);

  useEffect(() => {
    if (testsStatus === LoadingStatus.loaded && !moduleTests.length) {
      setShowOtherComponents(true);
    }
  }, [testsStatus, moduleTests]);

  useEffect(() => {
    setTestsStatus(LoadingStatus.loading);
    fetch('/module-test')
      .then(res => res.json())
      .then(setModuleTests)
      .then(() => setTestsStatus(LoadingStatus.loaded))
      .catch(() => setTestsStatus(LoadingStatus.error))
  }, []);

  if (testsStatus === LoadingStatus.loading) {
    return <LoadingIndicator>Loading component tests...</LoadingIndicator>
  }

  const [modulesWithOnlyErrors, tests] = splitIntoErrorNoError(
    mergeModules(modules, moduleTests)
  );

  return (
    <div className="p-3">
      <div className="p-6 block text-gray-700 text-2xl font-semibold py-2">Your tests</div>
      {tests.map(
        module => (
          <Module file={module.file} components={module.components} key={module.file} />
        )
      )}
      {
        (testsStatus === LoadingStatus.loaded && !moduleTests.length) && <div className="flex justify-center p-3 px-3">
          <div className="w-full">
            <div className="bg-white shadow-md rounded-lg px-3 py-2">
              <div className="block text-gray-700 text-lg font-semibold py-2 px-2">
                You don't have any tests yet
              </div>
            </div>
          </div>
        </div>
      }
      {modulesStatus === LoadingStatus.loading && <div className="p-6"><LoadingIndicator>Looking for components...</LoadingIndicator></div>}
      {
        !!modulesWithOnlyErrors.length && <div className="p-6 block text-gray-700 text-2xl font-semibold py-2">Other modules which had errors</div>
      }
      {modulesWithOnlyErrors.map(
        m => (
          <Module file={m.file} components={m.components} key={m.file} />
        )
      )}
      {
        !showOtherComponents && <div className="flex justify-center">
          <button
            onClick={() => setShowOtherComponents(true)}
            className="shadow-md border-blue-700 text-blue-700 bg-white hover:border-transparent hover:text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-full m-4">
            Look for other components
          </button>
        </div>
      }
    </div>
  )
}
