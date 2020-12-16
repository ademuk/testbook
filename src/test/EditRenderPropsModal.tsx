import React, { useEffect, useState } from "react";
import { renderStepLabel } from "./Step";
import Modal, { ModalBody, ModalFooter, ModalHeader } from "../Modal";
import type { EditStepProps } from "./EditMockModal";
import LoadingIndicator from "../LoadingIndicator";

const JSON_PROP_TYPES = ["object", "array"];

type InputProps = {
  className: string;
  id: string;
  placeholder: string;
  name: string;
  required: boolean;
  value: string;
  onChange: ({
    target: { name, value },
  }: {
    target: { name: string; value: string };
  }) => void;
};

const PROP_TYPE_INPUT_COMPONENTS: { [key: string]: React.FC<InputProps> } = {
  number: (props) => <input type="number" {...props} />,
  boolean: (props) => (
    <select {...props}>
      <option value="" disabled>
        boolean
      </option>
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  ),
  object: (props) => <textarea {...props} />,
  array: (props) => <textarea {...props} />,
  default: (props) => <input type="text" {...props} />,
  "[]$": (props) => <textarea {...props} />,
  "^{": (props) => <textarea {...props} />,
};

const findPropTypeInputComponent = (propType: string) => {
  if (propType in PROP_TYPE_INPUT_COMPONENTS) {
    return PROP_TYPE_INPUT_COMPONENTS[propType];
  }

  const match = Object.keys(PROP_TYPE_INPUT_COMPONENTS).find((k) =>
    new RegExp(k).test(propType)
  );

  return match
    ? PROP_TYPE_INPUT_COMPONENTS[match]
    : PROP_TYPE_INPUT_COMPONENTS.default;
};

const PropInput = ({
  propType,
  ...rest
}: { propType: string } & InputProps) => {
  const Component: React.FC<InputProps> = findPropTypeInputComponent(propType);
  return <Component {...rest} />;
};

const isValidJson = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

const isValidProp = (
  value: string,
  propType: string,
  required: boolean
): boolean => {
  if (propType !== "string" && value === "" && required) {
    return false;
  }

  if (JSON_PROP_TYPES.includes(propType)) {
    return (value === "" && !required) || isValidJson(value);
  }

  return true;
};

type PropTypes = { [key: string]: [string, boolean] };

type Props = { [key: string]: any };

const validateProps = (props: Props, propTypes: PropTypes) =>
  Object.entries(propTypes).reduce(
    (prev, [propName, propType]) => ({
      ...prev,
      [propName]: isValidProp(props[propName], ...propType),
    }),
    {}
  );

const serialiseProps = (props: Props, propTypes: PropTypes) =>
  Object.entries(props).reduce((prev, [propName, value]) => {
    const [propType] = propTypes[propName];
    return {
      ...prev,
      [propName]: serialiseProp(value, propType),
    };
  }, {});

const serialiseProp = (value: string, propType: string) => {
  if (JSON_PROP_TYPES.includes(propType)) {
    if (value === "") {
      return undefined;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  if (propType === "number") {
    if (value === "") {
      return undefined;
    }
    return parseInt(value, 10);
  }

  if (propType === "boolean") {
    if (value === undefined) {
      return value;
    }
    return value === "true";
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const deserialiseProps = (props: Props, propTypes: PropTypes) =>
  Object.entries(props)
    .filter(([propName]) => propTypes[propName])
    .reduce((prev, [propName, value]) => {
      const [propType] = propTypes[propName];
      return {
        ...prev,
        [propName]: deserialiseProp(value, propType),
      };
    }, {});

const deserialiseProp = (value: string, propType: string) => {
  if (JSON_PROP_TYPES.includes(propType)) {
    try {
      return JSON.stringify(value);
    } catch {
      return value;
    }
  }

  if (["number", "boolean"].includes(propType)) {
    return value !== undefined ? value.toString() : value;
  }

  return typeof value === "object" ? JSON.stringify(value) : value;
};

enum PropTypesStatus {
  loading,
  error,
  loaded,
}

const EditRenderPropsModal: React.FC<EditStepProps> = ({
  step,
  onClose,
  onUpdateStep,
  file,
  exportName,
}) => {
  const [propTypes, setPropTypes] = useState<PropTypes>();
  const [propTypesStatus, setPropTypesStatus] = useState<PropTypesStatus>();
  const [props, setProps] = useState<Props>();
  const [propsValidation, setPropsValidation] = useState<{
    [key: string]: boolean;
  }>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    setPropTypesStatus(PropTypesStatus.loading);

    fetch(`/component/prop-types?file=${file}&exportName=${exportName}`)
      .then((res) => res.json())
      .then(setPropTypes)
      .then(() => setPropTypesStatus(PropTypesStatus.loaded))
      .catch(() => setPropTypesStatus(PropTypesStatus.error));
  }, [file, exportName]);

  useEffect(() => {
    if (propTypes) {
      setProps(deserialiseProps(step.definition.props, propTypes));
    }
  }, [step.definition.props, propTypes]);

  useEffect(() => {
    if (props && propTypes) {
      setPropsValidation(validateProps(props, propTypes));
    }
  }, [props, propTypes]);

  return (
    <Modal onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (!Object.values(propsValidation).every((v) => v)) {
            return;
          }

          props &&
            propTypes &&
            onUpdateStep({
              ...step,
              definition: {
                ...step.definition,
                props: serialiseProps(props, propTypes),
              },
            });
        }}
      >
        <ModalBody>
          <ModalHeader>
            {renderStepLabel(step)} <span className="font-bold">props</span>
          </ModalHeader>

          <div className="mt-2">
            {propTypesStatus === PropTypesStatus.loading && (
              <LoadingIndicator>
                Looking for the component's props...
              </LoadingIndicator>
            )}
            {propTypesStatus === PropTypesStatus.error && (
              <div className="text-red-700">
                There was an issue fetching this component's props
              </div>
            )}
            {propTypes
              ? Object.entries(propTypes).map(
                  ([propName, [propType, required]]) => (
                    <div className="mb-4" key={propName}>
                      <label
                        className="block text-gray-700 text-sm font-bold mb-2"
                        htmlFor={propName}
                      >
                        {propName}
                        {required && <span>*</span>}
                      </label>
                      <PropInput
                        propType={propType}
                        className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                          !propsValidation[propName] && isFormDirty
                            ? "border-red-400"
                            : "border-gray-200"
                        }`}
                        id={propName}
                        placeholder={propType}
                        name={propName}
                        required={required}
                        value={(props && props[propName]) || ""}
                        onChange={({
                          target: { name, value },
                        }: {
                          target: { name: string; value: string };
                        }) => {
                          setProps((props) => ({
                            ...props,
                            [name]: value,
                          }));
                          setIsFormDirty(true);
                        }}
                      />
                    </div>
                  )
                )
              : null}
            {propTypes &&
              Object.entries(propTypes).some(
                ([, [, required]]) => required
              ) && (
                <p className="text-sm leading-5 text-gray-500 text-right">
                  * Required prop
                </p>
              )}
            {propTypes && Object.keys(propTypes).length === 0 ? (
              <p className="text-sm leading-5 text-gray-500">
                No props were found for this component.
              </p>
            ) : null}
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="shadow-md bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-full my-2 ml-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="shadow-md border border-blue-700 hover:border-transparent text-blue-700 hover:text-white hover:bg-blue-700 font-medium py-2 px-4 rounded-full my-2 ml-2"
          >
            Save
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default EditRenderPropsModal;
