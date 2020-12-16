import React, { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router-dom";
import queryString from "query-string";
import StatusLink from "./StatusLink";
import LoadingIndicator from "./LoadingIndicator";
import { TestDefinition } from "./Test";

const handleSave = (
  file: string,
  exportName: string,
  cb: (response: { id: number }) => void
): Promise<TestDefinition[] | void> =>
  fetch(`/test?file=${file}&exportName=${exportName}`, {
    method: "post",
  })
    .then((r) => r.json())
    .then(cb);

const Tests: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location: { search },
}) => {
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testStatuses, setTestStatuses] = useState<{ [key: string]: string }>(
    {}
  );
  const { file, exportName } = queryString.parse(search);

  useEffect(() => {
    fetch(`/test?file=${file}&exportName=${exportName}`)
      .then((res) => res.json())
      .then(setTests)
      .finally(() => setIsLoading(false));
  }, [file, exportName]);

  useEffect(() => {
    if (tests.length) {
      fetch(`/test/status${search}`)
        .then((res) => res.json())
        .then(setTestStatuses);
    }
  }, [tests, search]);

  if (typeof file != "string" || typeof exportName != "string") {
    history.replace("/");
    return null;
  }

  if (isLoading) {
    return <LoadingIndicator>Loading tests...</LoadingIndicator>;
  }

  return (
    <div className="p-3">
      <h1 className="p-6 block text-gray-700 text-2xl font-semibold py-2">
        {file} / {exportName}
      </h1>

      {!tests.length && (
        <div className="w-full p-4 m-3 bg-white shadow-md rounded-2xl text-gray-700 text-lg">
          You don't have any tests yet
        </div>
      )}

      {!!tests.length && (
        <div className="w-full p-3 mx-3 my-4 bg-white shadow-md rounded-2xl">
          {tests.map((t) => (
            <StatusLink
              link={`/tests/${t.id}?file=${file}&exportName=${exportName}`}
              status={testStatuses[t.id]}
              key={t.id}
            >
              {t.name || t.id}
            </StatusLink>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <button
          className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full shadow-md m-4"
          onClick={() =>
            handleSave(file, exportName, ({ id }) =>
              history.push(`/tests/${id}?file=${file}&exportName=${exportName}`)
            )
          }
        >
          Add Test
        </button>
      </div>
    </div>
  );
};

export default Tests;
