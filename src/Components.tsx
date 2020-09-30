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
  const [files, setFiles] = useState<ModuleProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/component')
      .then(res => res.json())
      .then(setFiles)
      .finally(() => setIsLoading(false))
  }, []);

  return (
    <div className="p-3">
      {files.map(
        f => (
          <Module file={f.file} components={f.components} key={f.file} />
        )
      )}
      {isLoading && <LoadingIndicator>Searching for components...</LoadingIndicator>}
      {
        (!isLoading && !files.length) && <div>No Components were found</div>
      }
    </div>
  )
}
