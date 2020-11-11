import {ArrowFunction, Project, Node} from "ts-morph";

const valueMap = {
  "an array": "array",
  "a ReactNode": "React.ReactNode",
  "a single ReactElement": "React.ReactElement",
  "a single ReactElement type": "React.ComponentType",
};

const parsePropTypeMessage = (message, defaultType) => {
  let result;
  if (!message) {
    return defaultType;
  }

  const primitivePattern = /expected `?([a-zA-Z ]+)/g;
  if (message.message.match(primitivePattern)) {
    const r = primitivePattern.exec(message.message);
    result = r ? r[1] : null;
  }

  const oneOfPattern = /expected one of (\[.*])/g;
  if (message.message.match(oneOfPattern)) {
    const r = oneOfPattern.exec(message.message);
    result = r ? `oneOf:${r[1]}` : null;
  }

  const instanceOfPattern = /expected instance of `(.*)`/g;
  if (message.message.match(instanceOfPattern)) {
    const r = instanceOfPattern.exec(message.message);
    result = r ? `instanceOf:${r[1]}` : null;
  }

  return valueMap[result] || result;
};

export const inferPropTypes = (propTypes) =>
  Object.keys(propTypes).reduce(
    (prev, curr) => ({
      ...prev,
      [curr]: [
        parsePropTypeMessage(
          propTypes[curr](
            { [curr]: {} },
            curr,
            null,
            null,
            null,
            "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED"
          ),
          "object"
        ),
        propTypes[curr](
          { [curr]: undefined },
          curr,
          null,
          null,
          null,
          "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED"
        ) !== null,
      ],
    }),
    {}
  );

const typesToProps = (prev, curr) => ({
  ...prev,
  [curr.getName()]: [
    curr.getValueDeclaration().getType().getText(),
    !curr.getValueDeclaration().getType().isNullable(),
  ],
});

export const getTsPropTypes = (
  modulePath: string,
  exportName: string,
  tsConfigFilePath: string
) => {
  const [node] = new Project({
    tsConfigFilePath,
  })
    .getSourceFileOrThrow(modulePath)
    .getExportedDeclarations()
    .get(exportName);

  if (
    Node.isVariableDeclaration(node) &&
    Node.isArrowFunction(node.getInitializer())
  ) {
    return Promise.resolve(
      (node.getInitializer() as ArrowFunction)
        .getParameters()[0]
        .getType()
        .getProperties()
        .reduce(
          typesToProps,
          {}
        )
    );
  }

  if (Node.isFunctionDeclaration(node)) {
    return Promise.resolve(
      node
        .getParameters()[0]
        .getType()
        .getProperties()
        .reduce(
          typesToProps,
          {}
        )
    );
  }

  if (Node.isClassDeclaration(node)) {
    return Promise.resolve(
      node.getHeritageClauses()[0].getTypeNodes()[0].getTypeArguments()[0].getType().getProperties().reduce(
        typesToProps,
        {}
      )
    )
  }
};
